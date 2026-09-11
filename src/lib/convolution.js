export const KERNEL_PRESETS = Object.freeze({
  identity: { id: "identity", label: "Тождественное отображение", values: [0, 0, 0, 0, 1, 0, 0, 0, 0] },
  sharpen: { id: "sharpen", label: "Повышение резкости", values: [0, -1, 0, -1, 5, -1, 0, -1, 0] },
  gaussian: { id: "gaussian", label: "Фильтр Гаусса 3×3", values: [1, 2, 1, 2, 4, 2, 1, 2, 1] },
  boxBlur: { id: "boxBlur", label: "Прямоугольное размытие", values: [1, 1, 1, 1, 1, 1, 1, 1, 1] },
  prewittX: { id: "prewittX", label: "Оператор Прюитта X", values: [-1, 0, 1, -1, 0, 1, -1, 0, 1] },
  prewittY: { id: "prewittY", label: "Оператор Прюитта Y", values: [-1, -1, -1, 0, 0, 0, 1, 1, 1] },
});

export const EDGE_STRATEGIES = Object.freeze({
  copy: { id: "copy", label: "Копирование края" },
  black: { id: "black", label: "Заполнение чёрным" },
  white: { id: "white", label: "Заполнение белым" },
});

function selectedComponentIndexes(selectedChannels, channelCount) {
  const indexes = new Set();
  if (channelCount <= 2 && selectedChannels.gray) {
    indexes.add(0); indexes.add(1); indexes.add(2);
  }
  if (channelCount >= 3) {
    if (selectedChannels.red) indexes.add(0);
    if (selectedChannels.green) indexes.add(1);
    if (selectedChannels.blue) indexes.add(2);
  }
  if (channelCount % 2 === 0 && selectedChannels.alpha) indexes.add(3);
  return [...indexes];
}

function edgeSample(data, width, height, x, y, component, strategy) {
  if (x >= 0 && x < width && y >= 0 && y < height) return data[(y * width + x) * 4 + component];
  if (strategy === "black") return 0;
  if (strategy === "white") return 255;
  const safeX = Math.min(width - 1, Math.max(0, x));
  const safeY = Math.min(height - 1, Math.max(0, y));
  return data[(safeY * width + safeX) * 4 + component];
}

export function validateKernel(kernel) {
  if (!Array.isArray(kernel) || kernel.length !== 9 || kernel.some((value) => !Number.isFinite(value))) {
    throw new TypeError("Ядро должно содержать девять чисел");
  }
  if (kernel.some((value) => Math.abs(value) > 1000)) {
    throw new RangeError("Коэффициенты ядра должны быть в диапазоне от −1000 до 1000");
  }
}

export function convolveImageData(imageData, { kernel, selectedChannels, channelCount, edgeStrategy = "copy" }) {
  validateKernel(kernel);
  if (!EDGE_STRATEGIES[edgeStrategy]) throw new RangeError("Неизвестная стратегия обработки края");
  const components = selectedComponentIndexes(selectedChannels, channelCount);
  if (components.length === 0) throw new RangeError("Выберите хотя бы один канал");
  const { width, height, data } = imageData;
  const output = new Uint8ClampedArray(data);
  const sum = kernel.reduce((total, value) => total + value, 0);
  const divisor = Math.abs(sum) > 1e-9 ? sum : 1;
  const edgeDetector = Math.abs(sum) <= 1e-9;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const target = (y * width + x) * 4;
      for (const component of components) {
        let value = 0;
        for (let kernelY = 0; kernelY < 3; kernelY += 1) {
          for (let kernelX = 0; kernelX < 3; kernelX += 1) {
            const coefficient = kernel[kernelY * 3 + kernelX];
            value += coefficient * edgeSample(data, width, height, x + kernelX - 1, y + kernelY - 1, component, edgeStrategy);
          }
        }
        output[target + component] = Math.round(edgeDetector ? Math.abs(value) : value / divisor);
      }
    }
  }
  return { data: output, width, height };
}
