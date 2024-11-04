import { HumanMessage, SystemMessage } from "npm:@langchain/core@0.2/messages";
import { ChatGoogleGenerativeAI } from "npm:@langchain/google-genai@0.1";
import type { Service } from "../types.ts";

const service: Service = {
  stream: async (_denops, prompt, config, { signal }) => {
    const model = new ChatGoogleGenerativeAI({
      apiKey: config.apiKey,
      model: config.modelName ?? "gemini-1.5-flash",
      streaming: true,
      verbose: config.verbose,
    });
    const input = [
      new SystemMessage(
        `${prompt.system}\n${prompt.precontext}\n${prompt.postcontext}`,
      ),
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
