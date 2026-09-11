export const MIN_VIEW_SCALE = 0.12;
export const MAX_VIEW_SCALE = 3;
export const MAX_IMAGE_DIMENSION = 16384;
export const MAX_IMAGE_PIXELS = 100_000_000;

export const INTERPOLATION_METHODS = Object.freeze({
  nearest: {
    id: "nearest",
    label: "Ближайший сосед",
    description: "Сохраняет жёсткие края и исходные цвета. Подходит для пиксельной графики и работает быстрее.",
  },
  bilinear: {
    id: "bilinear",
    label: "Билинейная",
    description: "Смешивает четыре соседних пикселя. Даёт более плавный результат для фотографий и градиентов.",
  },
});

function validateResize(imageData, width, height) {
  if (!imageData?.data || !Number.isInteger(imageData.width) || !Number.isInteger(imageData.height)) {
    throw new TypeError("Некорректный источник изображения");
  }
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new RangeError("Ширина и высота должны быть положительными целыми числами");
  }
  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    throw new RangeError(`Максимальный размер стороны — ${MAX_IMAGE_DIMENSION} px`);
  }
  if (width * height > MAX_IMAGE_PIXELS) {
    throw new RangeError("Результат не должен превышать 100 мегапикселей");
  }
}

function nearestNeighbor(source, width, height) {
  const output = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(source.height - 1, Math.floor(y * source.height / height));
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(source.width - 1, Math.floor(x * source.width / width));
      const sourceIndex = (sourceY * source.width + sourceX) * 4;
      const targetIndex = (y * width + x) * 4;
      output[targetIndex] = source.data[sourceIndex];
      output[targetIndex + 1] = source.data[sourceIndex + 1];
      output[targetIndex + 2] = source.data[sourceIndex + 2];
      output[targetIndex + 3] = source.data[sourceIndex + 3];
    }
  }
  return output;
}

function bilinear(source, width, height) {
  const output = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const sourceY = (y + 0.5) * source.height / height - 0.5;
    const floorY = Math.floor(sourceY);
    const y0 = Math.max(0, Math.min(source.height - 1, floorY));
    const y1 = Math.max(0, Math.min(source.height - 1, floorY + 1));
    const weightY = sourceY - floorY;
    for (let x = 0; x < width; x += 1) {
      const sourceX = (x + 0.5) * source.width / width - 0.5;
      const floorX = Math.floor(sourceX);
      const x0 = Math.max(0, Math.min(source.width - 1, floorX));
      const x1 = Math.max(0, Math.min(source.width - 1, floorX + 1));
      const weightX = sourceX - floorX;
      const topLeft = (y0 * source.width + x0) * 4;
      const topRight = (y0 * source.width + x1) * 4;
      const bottomLeft = (y1 * source.width + x0) * 4;
      const bottomRight = (y1 * source.width + x1) * 4;
      const target = (y * width + x) * 4;
      for (let channel = 0; channel < 4; channel += 1) {
        const top = source.data[topLeft + channel] * (1 - weightX) + source.data[topRight + channel] * weightX;
        const bottom = source.data[bottomLeft + channel] * (1 - weightX) + source.data[bottomRight + channel] * weightX;
        output[target + channel] = Math.round(top * (1 - weightY) + bottom * weightY);
      }
    }
  }
  return output;
}

const interpolators = Object.freeze({ nearest: nearestNeighbor, bilinear });

function makeImageData(data, width, height) {
  return typeof ImageData === "undefined" ? { data, width, height } : new ImageData(data, width, height);
}

export function resizeImageData(imageData, width, height, method = "bilinear") {
  validateResize(imageData, width, height);
  const interpolate = interpolators[method];
  if (!interpolate) throw new RangeError(`Неизвестный метод интерполяции: ${method}`);
  if (width === imageData.width && height === imageData.height) {
    return makeImageData(new Uint8ClampedArray(imageData.data), width, height);
  }
  return makeImageData(interpolate(imageData, width, height), width, height);
}

export function calculateFitScale(imageWidth, imageHeight, viewportWidth, viewportHeight, margin = 50) {
  const availableWidth = Math.max(1, viewportWidth - margin * 2);
  const availableHeight = Math.max(1, viewportHeight - margin * 2);
  return Math.min(
    MAX_VIEW_SCALE,
    Math.max(MIN_VIEW_SCALE, Math.min(availableWidth / imageWidth, availableHeight / imageHeight)),
  );
}
