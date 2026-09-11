import { describe, expect, it } from "vitest";
import {
  composeVisibleImageData,
  clientPointToCanvasPixel,
  createChannelState,
  getChannelDefinitions,
  rgbToLab,
  samplePixel,
} from "./colorChannels.js";

function imageData(pixels, width = 1, height = 1) {
  return { data: new Uint8ClampedArray(pixels), width, height };
}

describe("цветовые каналы", () => {
  it("создаёт наборы для изображений с 1–4 каналами", () => {
    expect([1, 2, 3, 4].map((count) => getChannelDefinitions(count).length)).toEqual([1, 2, 3, 4]);
    expect(createChannelState(4)).toEqual({ red: true, green: true, blue: true, alpha: true });
  });

  it("отключает выбранную RGB-составляющую без изменения оригинала", () => {
    const original = imageData([120, 80, 40, 200]);
    const result = composeVisibleImageData(original, { red: true, green: false, blue: true }, 3);
    expect([...result.data]).toEqual([120, 0, 40, 255]);
    expect([...original.data]).toEqual([120, 80, 40, 200]);
  });

  it("показывает единственный альфа-канал как непрозрачную маску", () => {
    const original = imageData([120, 80, 40, 64]);
    const result = composeVisibleImageData(original, { red: false, green: false, blue: false, alpha: true }, 4);
    expect([...result.data]).toEqual([64, 64, 64, 255]);
  });
});

describe("пипетка и CIELAB", () => {
  it("считывает пиксель по координатам", () => {
    const source = imageData([1, 2, 3, 255, 10, 20, 30, 128], 2, 1);
    expect(samplePixel(source, 1, 0)).toMatchObject({ x: 1, y: 0, red: 10, green: 20, blue: 30, alpha: 128 });
    expect(samplePixel(source, 2, 0)).toBeNull();
  });

  it("учитывает CSS-масштаб и положение canvas", () => {
    const point = clientPointToCanvasPixel(400, 200, { left: 50, top: 20, width: 200, height: 100 }, 150, 70);
    expect(point).toEqual({ x: 200, y: 100 });
  });

  it("переводит опорные цвета sRGB в CIELAB D65", () => {
    const white = rgbToLab(255, 255, 255);
    const red = rgbToLab(255, 0, 0);
    expect(white.l).toBeCloseTo(100, 3);
    expect(white.a).toBeCloseTo(0, 2);
    expect(white.b).toBeCloseTo(0, 2);
    expect(red.l).toBeCloseTo(53.24, 1);
    expect(red.a).toBeCloseTo(80.09, 1);
    expect(red.b).toBeCloseTo(67.2, 1);
  });
});
