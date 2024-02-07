import { ChatOpenAI } from "https://esm.sh/langchain@0.1.14/chat_models/openai";
import { HumanChatMessage, SystemChatMessage } from "https://esm.sh/langchain@0.1.14/schema";
import { Mutex } from "https://lib.deno.dev/x/async@v2/mod.ts";
import { Denops } from "https://lib.deno.dev/x/denops_std@v6/mod.ts";
import * as helper from "https://lib.deno.dev/x/denops_std@v6/helper/mod.ts";
import * as vars from "https://lib.deno.dev/x/denops_std@v6/variable/mod.ts";
import * as option from "https://lib.deno.dev/x/denops_std@v6/option/mod.ts";
import * as fn from "https://lib.deno.dev/x/denops_std@v6/function/mod.ts";
import * as buffer from "https://lib.deno.dev/x/denops_std@v6/buffer/mod.ts";
import outdent from "https://lib.deno.dev/x/outdent@v0.8.0/mod.ts";
import * as popup from "https://lib.deno.dev/x/denops_popup@v2/mod.ts";

async function showPopup(denops: Denops): Promise<[number, number]> {
  const bufnr = await fn.bufnr(denops, "HeyVim", true);
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
  const winnr = await popup.open(denops, bufnr, {
    row, col, height: poph, width: popw, origin: "topleft", border: true,
  })
  await fn.win_gotoid(denops, winnr);
  return [bufnr, winnr]
}

async function showWindow(denops: Denops): Promise<[number, number]> {
  const bufnr = await fn.bufnr(denops, "HeyVim", true);
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
    await denops.cmd(`vnew HeyVim`)
    await fn.deletebufline(denops, bufnr, 1, "$");
  })
  return [bufnr, winnr]
}

/**
 * The `hey$` function sends a message to the ChatOpenAI model registered with Denops.
 * This function overwrites the original text with the response from the model.
 *
 * @param {Denops} denops - The Denops object for current buffer
 * @param {number} firstline - The first line number of the range to send
 * @param {number} lastline - The last line number of the range to send
 * @param {string} request - The input text to send to the model
 * @param {AbortController} controller - The AbortController to abort the request
 * @returns {Promise<void>}
 */
async function hey$(denops: Denops, firstline: number, lastline: number, request: string, controller: AbortController) {
  const precontext = (await fn.getline(denops, Math.max(firstline - 20, 0), firstline - 1)).join("\n");
  const postcontext = (await fn.getline(denops, lastline + 1, lastline + 20)).join("\n");
  const context = (await fn.getline(denops, firstline, lastline)).join("\n");
  let bufnr: number = await fn.bufnr(denops, '.');
  await fn.deletebufline(denops, bufnr, firstline, lastline);
  await fn.appendbufline(denops, bufnr, firstline - 1, [""]);
  let lastline2 = firstline;
  const mutex = new Mutex();
  const model = new ChatOpenAI({
    openAIApiKey: await vars.g.get<string | undefined>(denops, "hey_openai_api_key", undefined),
    modelName: await vars.g.get(denops, "hey_model_name", "gpt-3.5-turbo"),
    verbose: await vars.g.get(denops, "hey_verbose", false),
    streaming: true,
    callbacks: [
      {
        async handleLLMNewToken(token: string) {
          await mutex.acquire();
          let lines = await fn.getbufline(denops, bufnr, lastline2);
          lines = (lines.join("\n") + token).split("\n");
          await fn.deletebufline(denops, bufnr, lastline2);
          await fn.appendbufline(denops, bufnr, lastline2 - 1, lines);
          await denops.cmd('redraw');
          lastline2 += lines.length - 1;
          mutex.release();
        }
      }
    ]
  });

  const systemPrompt = outdent`
    Act a professional ${ await vars.o.get(denops, "filetype") } writer for:
    - helping human to write code (e.g., auto-completion)
    - helping human to write prose (e.g., grammar/ spelling correction)

    Write ${ await vars.o.get(denops, 'filetype') } code or prose.
    Do not wrap the output with \`\`\`.
  `;

  const userPrompt = outdent`
    <Prompt>${ request }</Prompt>
    <PreContext>${ outdent.string("\n"+precontext) }</PreContext>
    <Target>${ outdent.string("\n"+context) }</Target>
    <PostContext>${ outdent.string("\n"+postcontext) }</PostContext>
  `;

  await model.call([
    new SystemChatMessage(systemPrompt),
    new HumanChatMessage(userPrompt)
  ], { options: { signal: controller.signal }});
}

/**
 * The `hey` function sends a message to the ChatOpenAI model registered with Denops.
 *
 * @param {Denops} denops - The Denops object for current buffer
 * @param {number} firstline - The first line number of the range to send
 * @param {number} lastline - The last line number of the range to send
 * @param {string} request - The input text to send to the model
 * @param {AbortController} controller - The AbortController to abort the request
 * @returns {Promise<void>}
 */
async function hey(denops: Denops, firstline: number, lastline: number, request: string, controller: AbortController) {
  const precontext = (await fn.getline(denops, Math.max(firstline - 20, 0), firstline - 1)).join("\n");
  const postcontext = (await fn.getline(denops, lastline + 1, lastline + 20)).join("\n");
  const context = (await fn.getline(denops, firstline, lastline)).join("\n");
  let bufnr: number;
  if (await vars.g.get(denops, "hey_message_style", "window") === "window") {
    bufnr = (await showWindow(denops))[0]
  } else {
    bufnr = (await showPopup(denops))[0]
  }
  let lastline2 = 1;
  const mutex = new Mutex();
  const model = new ChatOpenAI({
    openAIApiKey: await vars.g.get<string | undefined>(denops, "hey_openai_api_key", undefined),
    modelName: await vars.g.get(denops, "hey_model_name", "gpt-3.5-turbo"),
    verbose: await vars.g.get(denops, "hey_verbose", false),
    streaming: true,
    callbacks: [
      {
        async handleLLMNewToken(token: string) {
          await mutex.acquire();
          let lines = await fn.getbufline(denops, bufnr, lastline2);
          lines = (lines.join("\n") + token).split("\n")
          await fn.deletebufline(denops, bufnr, lastline2);
          await fn.appendbufline(denops, bufnr, lastline2 - 1, lines);
          await denops.cmd('redraw');
          lastline2 += lines.length - 1;
          mutex.release();
        }
      }
    ]
  });

  const systemPrompt = outdent`
    Act a professional ${ await vars.o.get(denops, "filetype") } writer for:
    - helping human to write code (e.g., auto-completion)
    - helping human to write prose (e.g., grammar/ spelling correction)

    The condition of the output is:
    - markdown format.
    - the concise text.
    - no repetition of user prompt.
  `;

  const userPrompt = outdent`
    <Prompt>${ request }</Prompt>
    <PreContext>${ outdent.string("\n"+precontext) }</PreContext>
    <Target>${ outdent.string("\n"+context) }</Target>
    <PostContext>${ outdent.string("\n"+postcontext) }</PostContext>
  `;

  await model.call([
    new SystemChatMessage(systemPrompt),
    new HumanChatMessage(userPrompt)
  ], { options: { signal: controller.signal }});
}

export async function main(denops: Denops) {
  let controller: AbortController | undefined;

  denops.dispatcher = {
    async hey(firstline: unknown, lastline: unknown, prompt: unknown, bang: unknown) {
      if (typeof(firstline) !== 'number' || typeof(lastline) !== 'number' || typeof(prompt) !== 'string' || typeof(bang) !== 'string') {
        return
      }
      try {
        controller = new AbortController();
        if (bang === '!') {
          await hey$(denops, firstline, lastline, prompt, controller);
        } else {
          await hey(denops, firstline, lastline, prompt, controller);
        }
      } catch (e) {
        console.log(e);
      } finally {
        controller = undefined;
      }
    },
    abort() {
      controller?.abort();
      return Promise.resolve()
    }
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
  `)
}
