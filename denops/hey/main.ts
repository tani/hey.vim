import { ChatOpenAI } from "https://esm.sh/langchain@0.0.68/chat_models/openai";
import { HumanChatMessage, SystemChatMessage } from "https://esm.sh/langchain@0.0.68/schema";
import { Mutex } from "https://esm.sh/async-mutex@0.4.0";

import { Denops } from "https://deno.land/x/denops_std@v4.0.0/mod.ts";
import * as helper from "https://deno.land/x/denops_std@v4.0.0/helper/mod.ts";
import * as vars from "https://deno.land/x/denops_std@v4.0.0/variable/mod.ts";
import * as fn from "https://deno.land/x/denops_std@v4.0.0/function/mod.ts";
import outdent from 'https://deno.land/x/outdent@v0.8.0/mod.ts';

/**
 * The `hey` function sends a message to the ChatOpenAI model registered with Denops.
 *
 * @param {Denops} denops - The Denops object for current buffer
 * @param {number} firstline - The first line number of the range to send
 * @param {number} lastline - The last line number of the range to send
 * @param {string} request - The input text to send to the model
 * @returns {Promise<void>}
 */
async function hey(denops: Denops, firstline: number, lastline: number, request: string) {
  const precontext = (await fn.getline(denops, Math.max(firstline - 20, 0), firstline - 1)).join("\n");
  const postcontext = (await fn.getline(denops, lastline + 1, lastline + 20)).join("\n");
  const context = (await fn.getline(denops, firstline, lastline)).join("\n");
  const indent = " ".repeat(await fn.indent(denops, firstline));
  const mutex = new Mutex();
  await fn.deletebufline(denops, "%", firstline+1, lastline);
  await fn.setline(denops, firstline, [indent]);
  await fn.setcursorcharpos(denops, firstline, 0);

  const model = new ChatOpenAI({
    modelName: await vars.g.get(denops, "hey_model_name", "gpt-3.5-turbo"),
    verbose: await vars.g.get(denops, "hey_verbose", false),
    streaming: true,
    callbacks: [
      {
        async handleLLMNewToken(token: string) {
          await mutex.runExclusive(async () => {
            const crow = await fn.line(denops, ".");
            const cline = await fn.getline(denops, crow);
            const lines = (cline + token).replace("\n", "\n"+indent).split("\n");
            const nrow = crow + lines.length - 1;
            const ncol = Array.from(new Intl.Segmenter().segment(lines.at(-1))).length;
            await fn.append(denops, crow, Array(lines.length - 1).fill(""));
            await fn.setline(denops, crow, lines);
            await fn.setcursorcharpos(denops, nrow, ncol);
          });
        }
      }
    ]
  });

  const systemPrompt = outdent`
    Act a professional ${ await vars.o.get(denops, "filetype") } writer for:
    - helping human to write code (e.g., auto-completion)
    - helping human to write prose (e.g., grammar/ spelling correction)

    The condition of the output is:
    - Ask no question regarding the input.
    - Must be only text according to the input.
    - Must insert line breaks for each 80 letters.
    - Must generate the concise text for any input.

    The following is the example of the input and the output.
    <Input>
      <Request>${ request }</Request>
      <PreContext>${ outdent.string("\n"+precontext) }</PreContext>
      <Context>${ outdent.string("\n"+context) }</Context>
      <PostContext>${ outdent.string("\n"+postcontext) }</PostContext>
    </Input>
    <Output>${ outdent.string("\n"+context) }</Output>
  `;

  const userPrompt = outdent`
    Please fill out the output.
    <Input>
      <Request>${ request }</Request>
      <PreContext>${ outdent.string("\n"+precontext) }</PreContext>
      <Context>${ outdent.string("\n"+context) }</Context>
      <PostContext>${ outdent.string("\n"+postcontext) }</PostContext>
    <Input>
    <Output>

    </Output>
  `;

  model.call([
    new SystemChatMessage(systemPrompt),
    new HumanChatMessage(userPrompt)
  ]);
}

export async function main(denops: Denops) {
  denops.dispatcher = {
    hey(...args: any[]) {
      hey(denops, ...args);
    }
  };
  await helper.execute(denops, outdent`
    function! Hey(prompt) range abort
      let s:seq_curs = get(s:, "seq_curs", [])
      call add(s:seq_curs, undotree()["seq_cur"])
      let s:firstline = a:firstline
      let s:lastline = a:lastline
      let s:prompt = a:prompt
      call denops#notify("${denops.name}", "hey", [s:firstline, s:lastline, s:prompt])
    endfunction
    command! -nargs=1 -range Hey <line1>,<line2>call Hey(<q-args>)

    function! HeyUndo() abort
      execute 'undo' s:seq_curs[-1]
      call remove(s:seq_curs, -1)
    endfunction
    command! HeyUndo call HeyUndo()
    map <Plug>HeyUndo <Cmd>HeyUndo<CR>

    function! HeyAgain() abort
      call add(s:seq_curs, undotree()["seq_cur"])
      execute 'undo' s:seq_curs[-2]
      call denops#notify("${denops.name}", "hey", [s:firstline, s:lastline, s:prompt])
    endfunction
    command! HeyAgain call HeyAgain()
    map <Plug>HeyAgain <Cmd>HeyAgain<CR>
  `)
}
