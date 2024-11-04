import type { Denops } from "jsr:@denops/std@7";
import * as vars from "jsr:@denops/std@7/variable";
import { as, assert, is, type Predicate } from "jsr:@core/unknownutil@4";
import type { HeyConfig, MessageStyle } from "./types.ts";

export const DEFAULT_SERVICE_TYPE = "openai";
export const DEFAULT_MESSAGE_STYLE = "window";

/**
 * Returns configuration object.
 */
export async function getConfig(denops: Denops): Promise<HeyConfig> {
  const serviceType = await vars.g.get(denops, "hey_service_type", undefined) ??
    DEFAULT_SERVICE_TYPE;
  assert(serviceType, is.String, { name: "hey_service_type" });
  const modelName = await vars.g.get(denops, "hey_model_name", undefined) ??
    undefined;
  assert(modelName, as.Optional(is.String), { name: "model" });
  const apiKey =
    await vars.g.get(denops, `hey_${serviceType}_api_key`, undefined) ??
      await vars.g.get(denops, "hey_api_key", undefined) ??
      undefined;
  assert(apiKey, as.Optional(is.String), { name: "hey_api_key" });
  const messageStyle =
    await vars.g.get(denops, "hey_message_style", undefined) ??
      DEFAULT_MESSAGE_STYLE;
  assert(messageStyle, isMessageStyle, { name: "hey_message_style" });
  const verbose = await vars.g.get(denops, "hey_verbose", false);
  assert(verbose, is.UnionOf([is.Boolean, is.Number]), { name: "hey_verbose" });
  return {
    serviceType,
    modelName,
    apiKey,
    messageStyle,
    verbose: Boolean(verbose),
  };
}

const isMessageStyle = is.LiteralOneOf(
  ["window", "popup"] as const,
) satisfies Predicate<MessageStyle>;
