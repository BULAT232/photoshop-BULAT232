import { describe, expect, it } from "vitest";
import { readRasterMetadata } from "./imageMetadata.js";

describe("raster metadata", () => {
  it("reads PNG dimensions and color depth from IHDR", () => {
    const png = new Uint8Array(29);
    png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const view = new DataView(png.buffer);
    view.setUint32(16, 320, false);
    view.setUint32(20, 240, false);
    png[24] = 8;
    png[25] = 6;
    expect(readRasterMetadata(png)).toEqual({ format: "PNG", width: 320, height: 240, colorDepth: 32 });
  });

  it("rejects unrelated data", () => {
    expect(readRasterMetadata(Uint8Array.of(1, 2, 3))).toBeNull();
  });
});


