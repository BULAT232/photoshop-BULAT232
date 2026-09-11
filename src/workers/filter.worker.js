import { convolveImageData } from "../lib/convolution.js";

self.onmessage = ({ data }) => {
  try {
    const result = convolveImageData(
      { width: data.width, height: data.height, data: new Uint8ClampedArray(data.buffer) },
      data.options,
    );
    self.postMessage({ width: result.width, height: result.height, buffer: result.data.buffer }, [result.data.buffer]);
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : "Ошибка фильтрации" });
  }
};
