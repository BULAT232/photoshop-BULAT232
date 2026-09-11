import { describe, expect, it } from "vitest";
import {
  applyLevels,
  calculateHistogram,
  createDefaultLevels,
  createLevelsLut,
  relativeLuminance,
} from "./levels.js";

function imageData(pixels, width = 1, height = 1) {
  return { data: new Uint8ClampedArray(pixels), width, height };
}

describe("гистограмма", () => {
  it("использует относительную яркость sRGB для Master", () => {
    expect(relativeLuminance(255, 255, 255)).toBeCloseTo(1, 6);
    expect(relativeLuminance(0, 0, 0)).toBe(0);
    const histogram = calculateHistogram(imageData([255, 0, 0, 255, 0, 255, 0, 255], 2, 1));
    expect(histogram.reduce((sum, count) => sum + count, 0)).toBe(2);
    expect(histogram[Math.round(0.2126 * 255)]).toBe(1);
    expect(histogram[Math.round(0.7152 * 255)]).toBe(1);
  });

  it("строит гистограмму отдельного канала", () => {
    const histogram = calculateHistogram(imageData([14, 27, 88, 190]), "green");
    expect(histogram[27]).toBe(1);
  });
});

describe("LUT уровней", () => {
  it("ограничивает диапазон точками чёрного и белого", () => {
    const lut = createLevelsLut({ black: 50, gamma: 1, white: 200 });
    expect(lut[49]).toBe(0);
    expect(lut[50]).toBe(0);
    expect(lut[125]).toBeCloseTo(128, 0);
    expect(lut[200]).toBe(255);
  });

  it("применяет Master и канал последовательно, не меняя источник", () => {
    const source = imageData([100, 120, 140, 200]);
    const settings = createDefaultLevels();
    settings.master.black = 50;
    settings.red.gamma = 0.5;
    settings.alpha.white = 200;
    const result = applyLevels(source, settings, 4);
    expect(result.data[0]).toBeGreaterThan(result.data[1]);
    expect(result.data[3]).toBe(255);
    expect([...source.data]).toEqual([100, 120, 140, 200]);
  });
});
