import { ChatOpenAI } from "https://esm.sh/langchain/chat_models/openai";
import { HumanChatMessage, SystemChatMessage } from "https://esm.sh/langchain/schema";

import { Denops } from "https://lib.deno.dev/x/denops_std@v4/mod.ts";
import * as fn from "https://lib.deno.dev/x/denops_std@v4/function/mod.ts";
import outdent from 'https://lib.deno.dev/x/outdent@v0.8.x/mod.ts';

async function hey(denops: Denops, firstline: number, lastline: number, request: string) {
  const target = (await fn.getline(denops, firstline, lastline)).join("\n");
  const indent = " ".repeat(await fn.indent(denops, firstline));
  await fn.deletebufline(denops, "%", firstline+1, lastline);
  await fn.setline(denops, firstline, [indent]);
  await fn.setcursorcharpos(denops, firstline, 0);

  const model = new ChatOpenAI({
    modelName: "gpt-3.5-turbo",
    streaming: true,
    callbacks: [
      {
        async handleLLMNewToken(token: string) {
          const [bufn, lnum, col, off] = await fn.getcursorcharpos(denops);
          const lines = (await fn.getline(denops, lnum) + token.replace("\n", "\n"+indent)).split("\n");
          await fn.append(denops, lnum, Array(lines.length - 1).fill(""));
          await fn.setline(denops, lnum, lines);
          await fn.setcursorcharpos(denops, lnum + lines.length - 1, col);
        }
      }
    ]
  });

  const systemPrompt = outdent`
    Act a professional code/ prose writer for:
    - helping human to write code (e.g., auto-completion)
    - helping human to write prose (e.g., grammar/ spelling correction)

    The condition of the answer is:
    - Ask no question regarding the request.
    - Must be only text according to the request.
    - Must contain line breaks for each 80 letters.
    - Must generate the concise text for any request.

    <ExampleInput>
    <Request>${ request }</Request>
    <Target>${ outdent.string("\n"+target) }</Target>
    </ExampleInput>
    <ExampleOutput>${ outdent.string("\n"+target) }</ExampleOutput>
  `;

  const userPrompt = outdent`
    <Request>${ request }</Request>
    <Target>${ outdent.string("\n"+target) }</Target>
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
}
