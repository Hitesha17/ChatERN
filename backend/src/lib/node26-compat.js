import buffer from "node:buffer";

if (!buffer.SlowBuffer) {
  buffer.SlowBuffer = class SlowBuffer extends Uint8Array {};
}
