function abortError() {
  return new DOMException("Операция отменена", "AbortError");
}

export function applyKernelInWorker(imageData, options, { signal } = {}) {
  if (signal?.aborted) return Promise.reject(abortError());
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("../workers/filter.worker.js", import.meta.url), { type: "module" });
    const copy = new Uint8ClampedArray(imageData.data);
    const stop = () => worker.terminate();
    const handleAbort = () => { stop(); reject(abortError()); };
    signal?.addEventListener("abort", handleAbort, { once: true });
    worker.onmessage = ({ data }) => {
      stop();
      signal?.removeEventListener("abort", handleAbort);
      if (data.error) reject(new Error(data.error));
      else resolve(new ImageData(new Uint8ClampedArray(data.buffer), data.width, data.height));
    };
    worker.onerror = (event) => {
      stop();
      signal?.removeEventListener("abort", handleAbort);
      reject(new Error(event.message || "Ошибка Web Worker"));
    };
    worker.postMessage({ width: imageData.width, height: imageData.height, buffer: copy.buffer, options }, [copy.buffer]);
  });
}
