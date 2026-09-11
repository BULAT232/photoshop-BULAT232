import { describe, expect, it } from "vitest";
import { convolveImageData, KERNEL_PRESETS, validateKernel } from "./convolution.js";

function imageData(values, width, height) {
  return { data: new Uint8ClampedArray(values), width, height };
}

const rgb = { red: true, green: true, blue: true };

describe("ядра свёртки", () => {
  it("содержит все шесть предустановок", () => {
    expect(Object.keys(KERNEL_PRESETS)).toEqual(["identity", "sharpen", "gaussian", "boxBlur", "prewittX", "prewittY"]);
    Object.values(KERNEL_PRESETS).forEach((preset) => expect(() => validateKernel(preset.values)).not.toThrow());
  });

  it("тождественное ядро возвращает независимую копию", () => {
    const source = imageData([10, 20, 30, 255], 1, 1);
    const result = convolveImageData(source, { kernel: KERNEL_PRESETS.identity.values, selectedChannels: rgb, channelCount: 3 });
    expect([...result.data]).toEqual([...source.data]);
    result.data[0] = 90;
    expect(source.data[0]).toBe(10);
  });

  it("фильтрует только выбранный канал", () => {
    const source = imageData([20, 40, 60, 255], 1, 1);
    const result = convolveImageData(source, {
      kernel: [0, 0, 0, -1, 2, 0, 0, 0, 0],
      selectedChannels: { red: true, green: false, blue: false },
      channelCount: 3,
      edgeStrategy: "black",
    });
    expect([...result.data]).toEqual([40, 40, 60, 255]);
    expect([...source.data]).toEqual([20, 40, 60, 255]);
  });

  it("поддерживает разные стратегии заполнения края", () => {
    const source = imageData([90, 90, 90, 255], 1, 1);
    const kernel = KERNEL_PRESETS.boxBlur.values;
    const copy = convolveImageData(source, { kernel, selectedChannels: rgb, channelCount: 3, edgeStrategy: "copy" });
    const black = convolveImageData(source, { kernel, selectedChannels: rgb, channelCount: 3, edgeStrategy: "black" });
    const white = convolveImageData(source, { kernel, selectedChannels: rgb, channelCount: 3, edgeStrategy: "white" });
    expect(copy.data[0]).toBe(90);
    expect(black.data[0]).toBe(10);
    expect(white.data[0]).toBe(237);
  });
});
