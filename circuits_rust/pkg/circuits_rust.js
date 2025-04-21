import * as wasm from "./circuits_rust_bg.wasm";
export * from "./circuits_rust_bg.js";
import { __wbg_set_wasm } from "./circuits_rust_bg.js";
__wbg_set_wasm(wasm);
wasm.__wbindgen_start();
