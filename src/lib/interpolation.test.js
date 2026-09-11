import { describe, expect, it } from "vitest";
import { calculateFitScale, resizeImageData } from "./interpolation.js";

function imageData(values, width, height) {
  return { data: new Uint8ClampedArray(values), width, height };
}

const source = imageData([
  0, 0, 0, 255, 100, 100, 100, 255,
  150, 150, 150, 255, 200, 200, 200, 255,
], 2, 2);

describe("двумерная интерполяция", () => {
  it("масштабирует методом ближайшего соседа", () => {
    const result = resizeImageData(source, 4, 4, "nearest");
    expect([...result.data.slice(0, 16)]).toEqual([
      0, 0, 0, 255, 0, 0, 0, 255, 100, 100, 100, 255, 100, 100, 100, 255,
    ]);
    expect(result.data[(3 * 4 + 3) * 4]).toBe(200);
  });

  it("билинейно смешивает четыре соседних пикселя", () => {
    const result = resizeImageData(source, 3, 3, "bilinear");
    expect(result.data[(1 * 3 + 1) * 4]).toBe(113);
    expect(result.data[(1 * 3 + 1) * 4 + 3]).toBe(255);
  });

  it("возвращает независимую копию при масштабе 1:1", () => {
    const result = resizeImageData(source, 2, 2);
    result.data[0] = 255;
    expect(source.data[0]).toBe(0);
  });
});

describe("автоматическое вписывание", () => {
  it("оставляет отступ 50 px с каждой стороны", () => {
    expect(calculateFitScale(1000, 500, 600, 400)).toBe(0.5);
  });

  it("ограничивает масштаб диапазоном 12–300%", () => {
    expect(calculateFitScale(100, 50, 1000, 1000)).toBe(3);
    expect(calculateFitScale(10000, 10000, 200, 200)).toBe(0.12);
  });
});
