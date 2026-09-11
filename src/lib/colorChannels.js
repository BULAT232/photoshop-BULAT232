const CHANNELS = {
  gray: { id: "gray", label: "Яркость", shortLabel: "Y" },
  red: { id: "red", label: "Красный", shortLabel: "R" },
  green: { id: "green", label: "Зелёный", shortLabel: "G" },
  blue: { id: "blue", label: "Синий", shortLabel: "B" },
  alpha: { id: "alpha", label: "Альфа", shortLabel: "A" },
};

export function getChannelDefinitions(channelCount) {
  if (channelCount === 1) return [CHANNELS.gray];
  if (channelCount === 2) return [CHANNELS.gray, CHANNELS.alpha];
  if (channelCount === 4) return [CHANNELS.red, CHANNELS.green, CHANNELS.blue, CHANNELS.alpha];
  return [CHANNELS.red, CHANNELS.green, CHANNELS.blue];
}

export function createChannelState(channelCount) {
  return Object.fromEntries(getChannelDefinitions(channelCount).map(({ id }) => [id, true]));
}

function makeImageData(data, width, height) {
  return typeof ImageData === "undefined" ? { data, width, height } : new ImageData(data, width, height);
}

export function composeVisibleImageData(imageData, enabledChannels, channelCount) {
  const output = new Uint8ClampedArray(imageData.data.length);
  const definitions = getChannelDefinitions(channelCount);
  const enabled = definitions.filter(({ id }) => enabledChannels[id]);
  const alphaOnly = enabled.length === 1 && enabled[0].id === "alpha";
  const grayscale = channelCount <= 2;

  for (let index = 0; index < imageData.data.length; index += 4) {
    const red = imageData.data[index];
    const green = imageData.data[index + 1];
    const blue = imageData.data[index + 2];
    const alpha = imageData.data[index + 3];

    if (alphaOnly) {
      output[index] = alpha;
      output[index + 1] = alpha;
      output[index + 2] = alpha;
      output[index + 3] = 255;
      continue;
    }

    if (grayscale) {
      const gray = enabledChannels.gray ? red : 0;
      output[index] = gray;
      output[index + 1] = gray;
      output[index + 2] = gray;
    } else {
      output[index] = enabledChannels.red ? red : 0;
      output[index + 1] = enabledChannels.green ? green : 0;
      output[index + 2] = enabledChannels.blue ? blue : 0;
    }
    output[index + 3] = channelCount % 2 === 0 && enabledChannels.alpha ? alpha : 255;
  }

  return makeImageData(output, imageData.width, imageData.height);
}

function linearizeSrgb(value) {
  const normalized = value / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function labCurve(value) {
  const threshold = 216 / 24389;
  return value > threshold ? Math.cbrt(value) : (24389 / 27 * value + 16) / 116;
}

export function rgbToLab(red, green, blue) {
  const r = linearizeSrgb(red);
  const g = linearizeSrgb(green);
  const b = linearizeSrgb(blue);

  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
  const fx = labCurve(x);
  const fy = labCurve(y);
  const fz = labCurve(z);

  return {
    l: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

export function samplePixel(imageData, x, y) {
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= imageData.width || y >= imageData.height) {
    return null;
  }
  const index = (y * imageData.width + x) * 4;
  const red = imageData.data[index];
  const green = imageData.data[index + 1];
  const blue = imageData.data[index + 2];
  return {
    x,
    y,
    red,
    green,
    blue,
    alpha: imageData.data[index + 3],
    lab: rgbToLab(red, green, blue),
  };
}

export function clientPointToCanvasPixel(canvasWidth, canvasHeight, bounds, clientX, clientY) {
  if (!bounds.width || !bounds.height || canvasWidth < 1 || canvasHeight < 1) return null;
  return {
    x: Math.min(canvasWidth - 1, Math.max(0, Math.floor((clientX - bounds.left) * canvasWidth / bounds.width))),
    y: Math.min(canvasHeight - 1, Math.max(0, Math.floor((clientY - bounds.top) * canvasHeight / bounds.height))),
  };
}

export function channelPreviewValue(channelId, red, green, blue, alpha) {
  if (channelId === "red") return red;
  if (channelId === "green") return green;
  if (channelId === "blue") return blue;
  if (channelId === "alpha") return alpha;
  return Math.round(0.2126 * red + 0.7152 * green + 0.0722 * blue);
}
