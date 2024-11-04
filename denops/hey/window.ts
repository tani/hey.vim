import type { Denops } from "jsr:@denops/std@7";
import { batch } from "jsr:@denops/std@7/batch";
import * as fn from "jsr:@denops/std@7/function";
import * as option from "jsr:@denops/std@7/option";
import * as popup from "https://lib.deno.dev/x/denops_popup@2/mod.ts";

type DenopsForPopup = Parameters<typeof popup.open>[0];

/**
 * Opens the "heyvim" buffer in a new popup window.
 *
 * @param denops - Denops instance for Vim/Neovim API interaction.
 * @returns A Promise resolving to ["heyvim" buffer number, window id]
 */
export async function showPopup(
  denops: Denops,
): Promise<[bufnr: number, winid: number]> {
  const bufnr = await initBuffer(denops);
  const winh = await fn.winheight(denops, "%") as number;
  const winw = await fn.winwidth(denops, "%") as number;
  const poph = Math.floor(winh * 0.8);
  const popw = Math.floor(winw * 0.8);
  const row = Math.floor((winh - poph) / 2);
  const col = Math.floor((winw - popw) / 2);
  const winid = await popup.open(denops as DenopsForPopup, bufnr, {
    row, col, height: poph, width: popw, origin: "topleft", border: true,
  });
  await initWindow(denops, winid);
  await fn.win_gotoid(denops, winid);
  return [bufnr, winid];
}

/**
 * Closes the "heyvim" popup window.
 *
 * @param denops - Denops instance for Vim/Neovim API interaction.
 */
export async function closePopup(denops: Denops): Promise<void> {
  const bufnr = await fn.bufnr(denops, "heyvim");
  if (bufnr < 0) return;
  for (const winid of await popup.list(denops as DenopsForPopup)) {
    if (bufnr === await fn.winbufnr(denops, winid)) {
      await popup.close(denops as DenopsForPopup, winid);
    }
  }
}

/**
 * Opens the "heyvim" buffer in a new window.
 * When the window is already open, it will be reused. 
 *
 * @param denops - Denops instance for Vim/Neovim API interaction.
 * @returns A Promise resolving to ["heyvim" buffer number, window id].
 */
export async function showWindow(
  denops: Denops,
): Promise<[bufnr: number, winid: number]> {
  const bufnr = await initBuffer(denops);
  let winid = await fn.bufwinid(denops, bufnr);
  if (winid < 0) {
    await denops.cmd(`rightbelow vertical sbuffer ${bufnr}`);
    winid = await fn.win_getid(denops);
  }
  await initWindow(denops, winid);
  await fn.win_gotoid(denops, winid);
  return [bufnr, winid];
}

/**
 * Closes the "heyvim" window.
 *
 * @param denops - Denops instance for Vim/Neovim API interaction.
 */
export async function closeWindow(denops: Denops): Promise<void> {
  const bufnr = await fn.bufnr(denops, "heyvim");
  if (bufnr < 0) return;
  for (const id of await fn.win_findbuf(denops, bufnr) as number[]) {
    await fn.win_execute(denops, id, "close");
  }
}

async function initBuffer(denops: Denops): Promise<number> {
  const bufnr = await fn.bufnr(denops, "heyvim", true);
  await batch(denops, async (denops) => {
    await option.buftype.setBuffer(denops, bufnr, "nofile");
    await option.buflisted.setBuffer(denops, bufnr, false);
    await option.swapfile.setBuffer(denops, bufnr, false);
    await option.filetype.setBuffer(denops, bufnr, "markdown");
    await fn.deletebufline(denops, bufnr, 1, "$");
  });
  return bufnr;
}

async function initWindow(denops: Denops, winnr: number): Promise<void> {
  await batch(denops, async (denops) => {
    await option.number.setWindow(denops, winnr, false);
    await option.relativenumber.setWindow(denops, winnr, false);
    await option.signcolumn.setWindow(denops, winnr, "no");
    await option.wrap.setWindow(denops, winnr, true);
  });
}
