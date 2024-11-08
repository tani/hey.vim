import type { Denops, Entrypoint } from "jsr:@denops/std@7";
import { batch } from "jsr:@denops/std@7/batch";
import * as fn from "jsr:@denops/std@7/function";
import * as helper from "jsr:@denops/std@7/helper";
import * as option from "jsr:@denops/std@7/option";
import { buffer } from "jsr:@milly/streams@1/transform/buffer";
import { filter } from "jsr:@milly/streams@1/transform/filter";
import { map } from "jsr:@milly/streams@1/transform/map";
import { interval } from "jsr:@milly/streams@1/readable/interval";
import { outdent } from "npm:outdent@0.8.0";
import { assert, is } from "jsr:@core/unknownutil@4";
import { DEFAULT_SERVICE_TYPE, getConfig } from "./config.ts";
import { loadService } from "./service.ts";
import type { HeyConfig } from "./types.ts";
import { closePopup, closeWindow, showPopup, showWindow } from "./window.ts";

/**
 * Sends a request to the LLM service and shows the result.
 * When `bang` is "!", the text within the range is replaced with the result.
 *
 * @param {Denops} denops - The Denops object for current buffer
 * @param {number} firstline - The first line number of the range to send
 * @param {number} lastline - The last line number of the range to send
 * @param {string} request - The input text to send to the model
 * @param {AbortSignal} signal - The AbortSignal to abort the request
 * @param {string} bang - The bang to determine the behavior of the function
 * @param {HeyConfig} config - The configuration
 */
async function hey(
  denops: Denops,
  firstline: number,
  lastline: number,
  request: string,
  signal: AbortSignal,
  bang: string,
  config: HeyConfig,
): Promise<void> {
  const alllines = await fn.getline(denops, 1, "$");
  const precontext = alllines.slice(0, firstline - 1).join("\n").slice(-4000);
  const postcontext = alllines.slice(lastline).join("\n").slice(0, 4000);
  const context = alllines.slice(firstline - 1, lastline).join("\n");
  const filetype = await option.filetype.get(denops) || "text";
  let bufnr: number;
  let lnum = 1;
  let restriction = '';
  if (bang === '!') {
    bufnr = await fn.bufnr(denops);
    await fn.deletebufline(denops, bufnr, firstline, lastline);
    await fn.appendbufline(denops, bufnr, firstline - 1, [""]);
    lnum = firstline;
    restriction += 'Do not wrap the output with the code block (e.g., ```python ... ```).\n';
    restriction += 'Do not write the natural language text out of the code block.\n';
  } else if (config.messageStyle === "window") {
    await closePopup(denops);
    [bufnr] = await showWindow(denops);
  } else {
    await closeWindow(denops);
    await closePopup(denops);
    [bufnr] = await showPopup(denops);
  }

  const systemPrompt = outdent`
    Act a professional ${filetype} writer for:
    - helping human to write code (e.g., auto-completion)
    - helping human to write prose (e.g., grammar/ spelling correction)

    ${ restriction }
  `;
  const precontextPrompt = outdent`
    [PreContext]${ outdent.string("\n"+precontext) }[/PreContext]
  `
  const postcontextPrompt = outdent`
    [PostContext]${ outdent.string("\n"+postcontext) }[/PostContext]
  `
  const userPrompt = outdent`
    [Prompt]${ request }[/Prompt]
    [Target]${ outdent.string("\n"+context) }[/Target]
  `;

  const llm = await loadService(
    denops,
    config.serviceType ?? DEFAULT_SERVICE_TYPE,
  );
  const results = await llm.stream(
    denops,
    {
      system: systemPrompt,
      precontext: precontextPrompt,
      postcontext: postcontextPrompt,
      user: userPrompt,
    },
    config,
    { signal },
  );
  const bufferedResults = results
    .pipeThrough(buffer(interval(200)))
    .pipeThrough(map((chunks) => chunks.join("")))
    .pipeThrough(filter((chunk) => chunk.length > 0));

  let rest = "";
  for await (const chunk of bufferedResults) {
    const lines = (rest + chunk).split("\n");
    rest = lines.at(-1)!;
    await batch(denops, async (denops) => {
      await fn.setbufline(denops, bufnr, lnum, lines[0]);
      if (lines.length > 1) {
        await fn.appendbufline(denops, bufnr, lnum, lines.slice(1));
        lnum += lines.length - 1;
      }
      await denops.cmd("redraw");
    });
  }
}

export const main: Entrypoint = async (denops) => {
  let controller: AbortController | undefined;

  const abort = () => {
    controller?.abort();
    return Promise.resolve()
  };

  denops.dispatcher = {
    async hey(firstline: unknown, lastline: unknown, prompt: unknown, bang: unknown) {
      assert(firstline, is.Number, { name: "firstline" });
      assert(lastline, is.Number, { name: "lastline" });
      assert(prompt, is.String, { name: "prompt" });
      assert(bang, is.String, { name: "bang" });
      await abort();
      controller = new AbortController();
      const signal = AbortSignal.any([
        controller.signal,
        ...(denops.interrupted ? [denops.interrupted] : []),
      ]);
      try {
        const config = await getConfig(denops);
        await hey(denops, firstline, lastline, prompt, signal, bang, config);
      } catch (e) {
        if (!(e instanceof Error && e.name === 'Aborted')) {
          helper.echoerr(denops, `[hey] ${e}`);
        }
      } finally {
        controller = undefined;
      }
    },
    async close() {
      await closePopup(denops);
      await closeWindow(denops);
    },
    abort,
  };

  await helper.execute(denops, outdent`
    function! Hey(prompt, bang) range abort
      call denops#notify("${denops.name}", "hey", [a:firstline, a:lastline, a:prompt, a:bang])
    endfunction
    command! -bang -nargs=1 -range Hey <line1>,<line2>call Hey(<q-args>, '<bang>')

    function! HeyAbort() abort
      call denops#notify("${denops.name}", "abort", [])
    endfunction
    command! HeyAbort call HeyAbort()

    function! HeyClose() abort
      call denops#notify("${denops.name}", "close", [])
    endfunction
    command! HeyClose call HeyClose()
  `);

  return {
    [Symbol.asyncDispose]() {
      return abort();
    },
  };
};
