import { useEffect, useMemo, useRef, useState } from "react";
import { getChannelDefinitions } from "../lib/colorChannels.js";
import { EDGE_STRATEGIES, KERNEL_PRESETS } from "../lib/convolution.js";
import { applyKernelInWorker } from "../lib/filterWorker.js";

function initialChannels(definitions) {
  return Object.fromEntries(definitions.map(({ id }) => [id, true]));
}

export function FilterDialog({ open, imageData, channelCount, onPreview, onApply, onCancel }) {
  const dialogRef = useRef(null);
  const applyControllerRef = useRef(null);
  const definitions = useMemo(() => getChannelDefinitions(channelCount), [channelCount]);
  const [presetId, setPresetId] = useState("identity");
  const [kernelValues, setKernelValues] = useState(() => KERNEL_PRESETS.identity.values.map(String));
  const [selectedChannels, setSelectedChannels] = useState(() => initialChannels(definitions));
  const [edgeStrategy, setEdgeStrategy] = useState("copy");
  const [previewEnabled, setPreviewEnabled] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [workerError, setWorkerError] = useState("");

  const numericKernel = useMemo(() => kernelValues.map(Number), [kernelValues]);
  const validationError = useMemo(() => {
    if (kernelValues.some((value) => value.trim() === "") || numericKernel.some((value) => !Number.isFinite(value))) return "Все девять коэффициентов должны быть числами";
    if (numericKernel.some((value) => Math.abs(value) > 1000)) return "Допустимый диапазон коэффициентов: от −1000 до 1000";
    if (!definitions.some(({ id }) => selectedChannels[id])) return "Выберите хотя бы один канал";
    return "";
  }, [definitions, kernelValues, numericKernel, selectedChannels]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && !dialog.open) {
      setPresetId("identity");
      setKernelValues(KERNEL_PRESETS.identity.values.map(String));
      setSelectedChannels(initialChannels(definitions));
      setEdgeStrategy("copy");
      setPreviewEnabled(true);
      setProcessing(false);
      setWorkerError("");
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [definitions, open]);

  useEffect(() => {
    if (!open || !previewEnabled || validationError) {
      onPreview(null);
      return undefined;
    }
    const controller = new AbortController();
    const frame = requestAnimationFrame(() => {
      setProcessing(true);
      setWorkerError("");
      applyKernelInWorker(imageData, { kernel: numericKernel, selectedChannels, channelCount, edgeStrategy }, { signal: controller.signal })
        .then(onPreview)
        .catch((error) => {
          if (error.name !== "AbortError") setWorkerError(error.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setProcessing(false);
        });
    });
    return () => { cancelAnimationFrame(frame); controller.abort(); };
  }, [channelCount, edgeStrategy, imageData, numericKernel, onPreview, open, previewEnabled, selectedChannels, validationError]);

  const selectPreset = (id) => {
    setPresetId(id);
    if (KERNEL_PRESETS[id]) setKernelValues(KERNEL_PRESETS[id].values.map(String));
  };

  const updateKernel = (index, value) => {
    setKernelValues((current) => current.map((entry, entryIndex) => entryIndex === index ? value : entry));
    setPresetId("custom");
  };

  const allSelected = definitions.every(({ id }) => selectedChannels[id]);
  const toggleAll = () => setSelectedChannels(initialChannels(allSelected ? [] : definitions));
  const reset = () => {
    setPresetId("identity");
    setKernelValues(KERNEL_PRESETS.identity.values.map(String));
    setSelectedChannels(initialChannels(definitions));
    setEdgeStrategy("copy");
    setPreviewEnabled(true);
    setWorkerError("");
  };

  const closeDialog = () => {
    applyControllerRef.current?.abort();
    onPreview(null);
    onCancel();
  };

  const applyFilter = async () => {
    if (validationError || processing) return;
    const controller = new AbortController();
    applyControllerRef.current = controller;
    setProcessing(true);
    setWorkerError("");
    try {
      const result = await applyKernelInWorker(imageData, { kernel: numericKernel, selectedChannels, channelCount, edgeStrategy }, { signal: controller.signal });
      onApply(result);
    } catch (error) {
      if (error.name !== "AbortError") setWorkerError(error.message);
    } finally {
      applyControllerRef.current = null;
      setProcessing(false);
    }
  };

  return (
    <dialog ref={dialogRef} className="filter-dialog" aria-labelledby="filter-title" onCancel={(event) => { event.preventDefault(); closeDialog(); }}>
      <div className="dialog-header">
        <div><span className="eyebrow">Свёртка 3×3</span><h2 id="filter-title">Фильтрация</h2></div>
        <button type="button" className="dialog-close" aria-label="Закрыть" onClick={closeDialog}>×</button>
      </div>

      <div className="filter-body">
        <label className="filter-field"><span>Предустановка</span>
          <select value={presetId} onChange={(event) => selectPreset(event.target.value)}>
            {Object.values(KERNEL_PRESETS).map((preset) => <option value={preset.id} key={preset.id}>{preset.label}</option>)}
            <option value="custom" disabled>Пользовательское ядро</option>
          </select>
        </label>

        <section className="kernel-section" aria-labelledby="kernel-title">
          <div className="input-levels-heading"><h3 id="kernel-title">Ядро</h3><span>3 × 3</span></div>
          <div className="kernel-grid">
            {kernelValues.map((value, index) => (
              <input key={index} type="number" min="-1000" max="1000" step="0.01" value={value} aria-label={`Коэффициент ядра ${index + 1}`} onChange={(event) => updateKernel(index, event.target.value)} />
            ))}
          </div>
        </section>

        <section className="filter-channels" aria-labelledby="filter-channels-title">
          <div className="input-levels-heading"><h3 id="filter-channels-title">Каналы</h3><button type="button" onClick={toggleAll}>{allSelected ? "Снять все" : "Выбрать все"}</button></div>
          <div className="filter-channel-list">
            {definitions.map(({ id, label, shortLabel }) => (
              <label key={id}><input type="checkbox" checked={Boolean(selectedChannels[id])} onChange={() => setSelectedChannels((current) => ({ ...current, [id]: !current[id] }))} /><b>{shortLabel}</b>{label}</label>
            ))}
          </div>
        </section>

        <label className="filter-field"><span>Обработка края</span>
          <select value={edgeStrategy} onChange={(event) => setEdgeStrategy(event.target.value)}>
            {Object.values(EDGE_STRATEGIES).map((strategy) => <option value={strategy.id} key={strategy.id}>{strategy.label}</option>)}
          </select>
        </label>
        <p className={`validation-message filter-message${validationError || workerError ? " error" : ""}`} role="status">
          {validationError || workerError || (processing ? "Обработка выполняется в Web Worker…" : "Размер изображения после фильтрации не изменится")}
        </p>
      </div>

      <div className="dialog-footer">
        <label className="switch-label"><input type="checkbox" checked={previewEnabled} onChange={(event) => setPreviewEnabled(event.target.checked)} />Предпросмотр</label>
        <div className="dialog-actions">
          <button type="button" disabled={processing} onClick={reset}>Сбросить</button>
          <button type="button" disabled={processing} onClick={closeDialog}>Отмена</button>
          <button type="button" className="primary" disabled={Boolean(validationError) || processing} onClick={applyFilter}>{processing ? "Обработка…" : "Применить"}</button>
        </div>
      </div>
    </dialog>
  );
}
