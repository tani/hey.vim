import type { Denops, Entrypoint } from "jsr:@denops/std@7";
import * as buffer from "jsr:@denops/std@7/buffer";
import * as fn from "jsr:@denops/std@7/function";
import * as helper from "jsr:@denops/std@7/helper";
import * as option from "jsr:@denops/std@7/option";
import * as popup from "https://lib.deno.dev/x/denops_popup@2/mod.ts";
import { outdent } from "npm:outdent@0.8.0";
import { assert, is } from "jsr:@core/unknownutil@4";
import { DEFAULT_SERVICE_TYPE, getConfig } from "./config.ts";
import { loadService } from "./service.ts";
import type { HeyConfig } from "./types.ts";

/**
 * shows a popup window with specific settings and dimensions based on the 
 * current window size.
 *
 * this function creates a new buffer with markdown filetype and some predefined 
 * settings like nofile, unlisted, and others to behave as a popup. it then 
 * calculates the size and position of the popup window relative to the current 
 * vim window dimensions to center the popup. finally, it opens the popup with 
 * these calculated dimensions.
 *
 * @param {denops} denops - the denops instance, providing an interface to 
 * interact with the neovim/vim editor.
 * @returns {promise<[number, number]>} a promise that resolves to a tuple 
 * containing the row and column where the popup is placed.
 */
async function showPopup(denops: Denops): Promise<[number, number]> {
  const bufnr = await fn.bufnr(denops, "heyvim", true);
  await buffer.ensure(denops, bufnr, async () => {
    await option.buftype.set(denops, "nofile");
    await option.buflisted.set(denops, false);
    await option.number.set(denops, false);
    await option.relativenumber.set(denops, false);
    await option.signcolumn.set(denops, "no");
    await option.swapfile.set(denops, false);
    await option.wrap.set(denops, true);
    await option.filetype.set(denops, "markdown");
    await fn.deletebufline(denops, bufnr, 1, "$");
  })
  const winh = await fn.winheight(denops, "%") as number;
  const winw = await fn.winwidth(denops, "%") as number;
  const poph = Math.floor(winh * 0.8);
  const popw = Math.floor(winw * 0.8);
  const row = Math.floor((winh - poph) / 2);
  const col = Math.floor((winw - popw) / 2);
  const winnr = await popup.open(denops as any, bufnr, {
    row, col, height: poph, width: popw, origin: "topleft", border: true,
  })
  await fn.win_gotoid(denops, winnr);
  return [bufnr, winnr]
}

/**
 * Opens a "heyvim" buffer in a new window within the Deno Vim/Neovim plugin.
 * Closes the window if "heyvim" is already open, sets up the buffer without
 * line numbers, swap files, and other standard Vim features for markdown
 * presentation. Returns the buffer and window numbers.
 * @param {denops} denops - Denops instance for Vim/Neovim API interaction.
 * @returns {Promise<[number, number]>} Promise resolving to ["heyvim" buffer number, window number].
 */
async function showWindow(denops: Denops): Promise<[number, number]> {
  const bufnr = await fn.bufnr(denops, "heyvim", true);
  const [winnr] = await fn.win_findbuf(denops, bufnr) as number[];
  if (winnr >= 0) {
    await fn.win_execute(denops, winnr, "close");
  }
  await buffer.ensure(denops, bufnr, async () => {
    await option.buftype.set(denops, "nofile");
    await option.buflisted.set(denops, false);
    await option.number.set(denops, false);
    await option.relativenumber.set(denops, false);
    await option.signcolumn.set(denops, "no");
    await option.swapfile.set(denops, false);
    await option.wrap.set(denops, true);
    await option.filetype.set(denops, "markdown");
    await denops.cmd(`vnew heyvim`)
    await fn.deletebufline(denops, bufnr, 1, "$");
  })
  return [bufnr, winnr]
}

/**
 * The `hey` function sends a message to the ChatOpenAI model registered with Denops.
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
  const precontext = (await fn.getline(denops, 0, firstline - 1)).join("\n").slice(-4000);
  const postcontext = (await fn.getline(denops, lastline + 1, "$")).join("\n").slice(0, 4000);
  const context = (await fn.getline(denops, firstline, lastline)).join("\n")
  const filetype = await option.filetype.get(denops) || "text";
  let bufnr: number;
  let lastline2: number;
  let restriction = '';
  if (bang === '!') {
    if ((bufnr = await fn.bufnr(denops, '.')) < 0) {
      throw new Error('No file name');
    }
    await fn.deletebufline(denops, bufnr, firstline, lastline);
    await fn.appendbufline(denops, bufnr, firstline - 1, [""]);
    lastline2 = firstline;
    restriction += 'Do not wrap the output with the code block (e.g., ```python ... ```).\n';
    restriction += 'Do not write the natural language text out of the code block.\n';
  } else if (config.messageStyle === "window") {
    bufnr = (await showWindow(denops))[0]
    lastline2 = 1;
  } else {
    bufnr = (await showPopup(denops))[0]
    lastline2 = 1;
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

  for await (const chunk of results) {
    let lines = await fn.getbufline(denops, bufnr, lastline2);
    lines = (lines.join("\n") + chunk).split("\n");
    await fn.deletebufline(denops, bufnr, lastline2);
    await fn.appendbufline(denops, bufnr, lastline2 - 1, lines);
    await denops.cmd('redraw');
    lastline2 += lines.length - 1;
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
  `);

  return {
    [Symbol.asyncDispose]() {
      return abort();
    },
  };
};
