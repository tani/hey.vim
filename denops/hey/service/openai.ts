import { HumanMessage, SystemMessage } from "npm:@langchain/core@0.2/messages";
import { ChatOpenAI } from "npm:@langchain/openai@0.2";
import type { Service } from "../types.ts";

const service: Service = {
  stream: async (_denops, prompt, config, { signal }) => {
    const model = new ChatOpenAI({
      apiKey: config.apiKey,
      model: config.modelName ?? "gpt-4o-mini",
      streaming: true,
      verbose: config.verbose,
    });
    const input = [
      new SystemMessage(prompt.system),
      new SystemMessage(prompt.precontext),
      new SystemMessage(prompt.postcontext),
      new HumanMessage(prompt.user),
    ];
    const results = await model.stream(input, { signal });
    return results.pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          controller.enqueue(chunk.content as string);
        },
      }),
    );
  },
};

export default service;
