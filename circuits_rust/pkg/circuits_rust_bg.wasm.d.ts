/* tslint:disable */
/* eslint-disable */
export const memory: WebAssembly.Memory;
export const __wbg_account_free: (a: number, b: number) => void;
export const account_new: (a: number, b: number, c: number, d: number) => number;
export const account_getBalance: (a: number, b: bigint) => bigint;
export const account_getBalances: (a: number) => [number, number];
export const account_setBalance: (a: number, b: bigint, c: bigint) => void;
export const account_getIndex: (a: number) => number;
export const account_setIndex: (a: number, b: number) => void;
export const account_export: (a: number) => [number, number];
export const account_import: (a: number, b: number) => number;
export const __wbg_state_free: (a: number, b: number) => void;
export const state_new: (a: number) => number;
export const state_setLeafs: (a: number, b: number, c: number) => void;
export const state_addLeafs: (a: number, b: number, c: number) => void;
export const state_getLeafs: (a: number) => [number, number];
export const state_getLeafsLength: (a: number) => number;
export const prove: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => any;
export const init: () => void;
export const __wbindgen_exn_store: (a: number) => void;
export const __externref_table_alloc: () => number;
export const __wbindgen_export_2: WebAssembly.Table;
export const __wbindgen_free: (a: number, b: number, c: number) => void;
export const __wbindgen_malloc: (a: number, b: number) => number;
export const __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
export const __externref_drop_slice: (a: number, b: number) => void;
export const __wbindgen_start: () => void;
