// Copies MediaPipe's WebAssembly runtime into /public so the camera try-on
// loads it from your own domain (no third-party CDN at runtime).
import { cpSync, existsSync, mkdirSync } from "node:fs";

const src = "node_modules/@mediapipe/tasks-vision/wasm";
const dest = "public/mediapipe";
if (existsSync(src)) {
  mkdirSync(dest, { recursive: true });
  for (const f of ["vision_wasm_internal.js", "vision_wasm_internal.wasm", "vision_wasm_nosimd_internal.js", "vision_wasm_nosimd_internal.wasm"]) {
    cpSync(`${src}/${f}`, `${dest}/${f}`);
  }
  console.log("✓ MediaPipe wasm copied to public/mediapipe");
}
