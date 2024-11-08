import type { Denops } from "jsr:@denops/std@7";
import * as vars from "jsr:@denops/std@7/variable";
import { as, ensure, is, type Predicate } from "jsr:@core/unknownutil@4";
import type { HeyConfig, MessageStyle } from "./types.ts";

export const DEFAULT_SERVICE_TYPE = "openai";
export const DEFAULT_MESSAGE_STYLE = "window";

/**
 * Returns configuration object.
 */
export async function getConfig(denops: Denops) {
  const serviceType = ensure(
    await vars.g.get(denops, "hey_service_type", undefined) ??
      DEFAULT_SERVICE_TYPE,
    is.String,
    { name: "hey_service_type" },
  );
  const modelName = ensure(
    await vars.g.get(denops, "hey_model_name", undefined) ?? undefined,
    is.UnionOf([is.String, is.Undefined]),
    { name: "model" },
  );
  const apiKey = ensure(
    await vars.g.get(denops, `hey_${serviceType}_api_key`, undefined) ??
      await vars.g.get(denops, "hey_api_key", undefined) ??
      undefined,
    as.Optional(is.String),
    { name: "hey_api_key" },
  );
  const messageStyle = ensure(
    await vars.g.get(denops, "hey_message_style", undefined) ??
      DEFAULT_MESSAGE_STYLE,
    isMessageStyle,
    { name: "hey_message_style" },
  );
  const verbose = ensure(
    await vars.g.get(denops, "hey_verbose", false),
    is.UnionOf([is.Boolean, is.Number]),
    { name: "hey_verbose" },
  );
  return {
    serviceType,
    modelName,
    apiKey,
    messageStyle,
    verbose: Boolean(verbose),
  } satisfies HeyConfig;
}

const isMessageStyle = is.LiteralOneOf(
  ["window", "popup"] as const,
) satisfies Predicate<MessageStyle>;
