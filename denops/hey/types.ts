import type { Denops } from "jsr:@denops/std@7";

export type MessageStyle = "window" | "popup";

export type HeyConfig = {
  /**
   * Set the service type to use:
   *   - "openai" for OpenAI API.
   *   - "google" for Google Gemini API.
   * @default "openai"
   */
  serviceType?: string;
  /**
   * Set the model name to use.
   * @default depends on `serviceType`.
   */
  modelName?: string;
  /**
   * Sets the API key to use. If not set, the following environment variables
   * will be used:
   *   - `$OPENAI_API_KEY` for OpenAI API.
   *   - `$GOOGLE_API_KEY` for Google Gemini API.
   */
  apiKey?: string;
  /**
   * It determines the style of the message, either "window" or else implicitly
   * "popup" is accepted.
   * @default "window"
   */
  messageStyle?: MessageStyle;
  /**
   * Set the verbose mode.
   * @default false
   */
  verbose?: boolean;
};

export type Prompt = {
  system: string;
  precontext: string;
  postcontext: string;
  user: string;
};

export interface Service {
  stream(
    denops: Denops,
    prompt: Prompt,
    config: HeyConfig,
    options: {
      signal?: AbortSignal;
    },
  ): Promise<ReadableStream<string>>;
}
