import type { Denops } from "jsr:@denops/std@7";
import * as fn from "jsr:@denops/std@7/function";
import * as options from "jsr:@denops/std@7/option";
import { ensure, is, type Predicate } from "jsr:@core/unknownutil@4";
import { toFileUrl } from "jsr:@std/path@1";
import type { Service } from "./types.ts";

const isLLM = is.ObjectOf({
  stream: is.Function,
}) as Predicate<Service>;

const modules = new Map<string, Service>();

/**
 * Load Service module from `&runtimepath/denops/hey/service/{name}.ts`.
 */
export async function loadService(
  denops: Denops,
  name: string,
): Promise<Service> {
  let service = modules.get(name);
  if (!service) {
    const files = await fn.globpath(
      denops,
      await options.runtimepath.get(denops),
      `denops/hey/service/${name}.ts`,
      true,
      true,
    ) as unknown as string[];
    if (files.length === 0) {
      throw new Error(
        `Service module not found: denops/hey/service/${name}.ts`,
      );
    }
    try {
      const module = await import(`${toFileUrl(files[0])}`);
      service = ensure(module.default, isLLM);
    } catch (cause) {
      throw new Error(`Invalid Service module: ${files[0]}`, { cause });
    }
    modules.set(name, service);
  }
  return service;
}
