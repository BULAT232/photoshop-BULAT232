import { describe, expect, it } from "vitest";
import { decodeGb7, encodeGb7, isGb7 } from "./gb7.js";

const image = (width, height, pixels) => ({ width, height, data: new Uint8ClampedArray(pixels) });

describe("GrayBit-7 codec", () => {
  it("writes the signature, version and big-endian dimensions", () => {
    const bytes = encodeGb7(image(2, 1, [0, 0, 0, 255, 255, 255, 255, 255]));
    expect(isGb7(bytes)).toBe(true);
    expect([...bytes.slice(0, 12)]).toEqual([0x47, 0x42, 0x37, 0x1d, 1, 0, 0, 2, 0, 1, 0, 0]);
    expect([...bytes.slice(12)]).toEqual([0, 127]);
  });

  it("stores binary transparency in the most significant bit", () => {
    const bytes = encodeGb7(image(2, 1, [255, 0, 0, 0, 0, 255, 0, 255]));
    expect(bytes[5]).toBe(1);
    expect(bytes[12] & 0x80).toBe(0);
    expect(bytes[13] & 0x80).toBe(0x80);
    const decoded = decodeGb7(bytes);
    expect([decoded.data[3], decoded.data[7]]).toEqual([0, 255]);
  });

  it("preserves dimensions and seven-bit grayscale values", () => {
    const decoded = decodeGb7(encodeGb7(image(1, 2, [64, 64, 64, 255, 192, 192, 192, 255])));
    expect([decoded.width, decoded.height]).toEqual([1, 2]);
    expect(Math.abs(decoded.data[0] - 64)).toBeLessThanOrEqual(1);
    expect(Math.abs(decoded.data[4] - 192)).toBeLessThanOrEqual(1);
  });

  it("rejects an invalid signature and truncated pixel data", () => {
    expect(() => decodeGb7(new Uint8Array(12))).toThrow(/РЎРёРіРЅР°С‚СѓСЂР°/);
    const valid = encodeGb7(image(1, 1, [0, 0, 0, 255]));
    expect(() => decodeGb7(valid.slice(0, -1))).toThrow(/РґР»РёРЅР°/);
  });
});


