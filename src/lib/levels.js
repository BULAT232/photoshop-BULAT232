import { getChannelDefinitions } from "./colorChannels.js";

export const DEFAULT_LEVEL = Object.freeze({ black: 0, gamma: 1, white: 255 });

export function createDefaultLevels() {
  return {
    master: { ...DEFAULT_LEVEL },
    gray: { ...DEFAULT_LEVEL },
    red: { ...DEFAULT_LEVEL },
    green: { ...DEFAULT_LEVEL },
    blue: { ...DEFAULT_LEVEL },
    alpha: { ...DEFAULT_LEVEL },
  };
}

export function getLevelChannelDefinitions(channelCount) {
  return [
    { id: "master", label: "Master (RGB)" },
    ...getChannelDefinitions(channelCount).map(({ id, label }) => ({ id, label })),
  ];
}

function linearize(value) {
  const normalized = value / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(red, green, blue) {
  return 0.2126 * linearize(red) + 0.7152 * linearize(green) + 0.0722 * linearize(blue);
}

export function calculateHistogram(imageData, channelId = "master") {
  const histogram = new Uint32Array(256);
  for (let index = 0; index < imageData.data.length; index += 4) {
    let value;
    if (channelId === "red") value = imageData.data[index];
    else if (channelId === "green") value = imageData.data[index + 1];
    else if (channelId === "blue") value = imageData.data[index + 2];
    else if (channelId === "alpha") value = imageData.data[index + 3];
    else value = Math.round(relativeLuminance(imageData.data[index], imageData.data[index + 1], imageData.data[index + 2]) * 255);
    histogram[value] += 1;
  }
  return histogram;
}

export function createLevelsLut({ black, gamma, white }) {
  const lut = new Uint8ClampedArray(256);
  const safeWhite = Math.max(black + 1, white);
  for (let value = 0; value < 256; value += 1) {
    const normalized = Math.min(1, Math.max(0, (value - black) / (safeWhite - black)));
    lut[value] = Math.round(255 * normalized ** gamma);
  }
  return lut;
}

function makeImageData(data, width, height) {
  return typeof ImageData === "undefined" ? { data, width, height } : new ImageData(data, width, height);
}

export function applyLevels(imageData, settings, channelCount = 3) {
  const output = new Uint8ClampedArray(imageData.data.length);
  const master = createLevelsLut(settings.master);
  const red = createLevelsLut(settings.red);
  const green = createLevelsLut(settings.green);
  const blue = createLevelsLut(settings.blue);
  const gray = createLevelsLut(settings.gray);
  const alpha = createLevelsLut(settings.alpha);
  const grayscale = channelCount <= 2;

  for (let index = 0; index < imageData.data.length; index += 4) {
    if (grayscale) {
      const adjusted = gray[master[imageData.data[index]]];
      output[index] = adjusted;
      output[index + 1] = adjusted;
      output[index + 2] = adjusted;
    } else {
      output[index] = red[master[imageData.data[index]]];
      output[index + 1] = green[master[imageData.data[index + 1]]];
      output[index + 2] = blue[master[imageData.data[index + 2]]];
    }
    output[index + 3] = channelCount % 2 === 0 ? alpha[imageData.data[index + 3]] : imageData.data[index + 3];
  }
  return makeImageData(output, imageData.width, imageData.height);
}
