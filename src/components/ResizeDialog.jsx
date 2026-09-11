import { useEffect, useMemo, useRef, useState } from "react";
import {
  INTERPOLATION_METHODS,
  MAX_IMAGE_DIMENSION,
  MAX_IMAGE_PIXELS,
  resizeImageData,
} from "../lib/interpolation.js";

function formatMegapixels(pixels) {
  return `${(pixels / 1_000_000).toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Мп`;
}

export function ResizeDialog({ open, imageData, onApply, onCancel }) {
  const dialogRef = useRef(null);
  const [unit, setUnit] = useState("percent");
  const [widthValue, setWidthValue] = useState(100);
  const [heightValue, setHeightValue] = useState(100);
  const [linked, setLinked] = useState(true);
  const [method, setMethod] = useState("bilinear");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && !dialog.open) {
      setUnit("percent");
      setWidthValue(100);
      setHeightValue(100);
      setLinked(true);
      setMethod("bilinear");
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const dimensions = useMemo(() => {
    if (unit === "percent") {
      return {
        width: Math.round(imageData.width * widthValue / 100),
        height: Math.round(imageData.height * heightValue / 100),
      };
    }
    return { width: Math.round(widthValue), height: Math.round(heightValue) };
  }, [heightValue, imageData.height, imageData.width, unit, widthValue]);

  const validationError = useMemo(() => {
    const minimum = 1;
    const maximum = unit === "percent" ? 1000 : MAX_IMAGE_DIMENSION;
    if (!Number.isFinite(widthValue) || !Number.isFinite(heightValue)) return "Введите числовые значения ширины и высоты";
    if (widthValue < minimum || heightValue < minimum) return `Минимальное значение — ${minimum} ${unit === "percent" ? "%" : "px"}`;
    if (widthValue > maximum || heightValue > maximum) return `Максимальное значение — ${maximum} ${unit === "percent" ? "%" : "px"}`;
    if (dimensions.width > MAX_IMAGE_DIMENSION || dimensions.height > MAX_IMAGE_DIMENSION) return `Сторона изображения не должна превышать ${MAX_IMAGE_DIMENSION} px`;
    if (dimensions.width * dimensions.height > MAX_IMAGE_PIXELS) return "Итоговый размер не должен превышать 100 мегапикселей";
    return "";
  }, [dimensions, heightValue, unit, widthValue]);

  const changeUnit = (nextUnit) => {
    if (nextUnit === unit) return;
    if (nextUnit === "pixels") {
      setWidthValue(dimensions.width);
      setHeightValue(dimensions.height);
    } else {
      setWidthValue(Number((dimensions.width / imageData.width * 100).toFixed(2)));
      setHeightValue(Number((dimensions.height / imageData.height * 100).toFixed(2)));
    }
    setUnit(nextUnit);
  };

  const changeDimension = (axis, input) => {
    const value = Number(input);
    if (axis === "width") {
      setWidthValue(value);
      if (linked) setHeightValue(unit === "percent" ? value : Math.max(1, Math.round(value * imageData.height / imageData.width)));
    } else {
      setHeightValue(value);
      if (linked) setWidthValue(unit === "percent" ? value : Math.max(1, Math.round(value * imageData.width / imageData.height)));
    }
  };

  const closeDialog = () => onCancel();
  const applyResize = () => {
    if (validationError) return;
    onApply(resizeImageData(imageData, dimensions.width, dimensions.height, method));
  };

  return (
    <dialog ref={dialogRef} className="resize-dialog" aria-labelledby="resize-title" onCancel={(event) => { event.preventDefault(); closeDialog(); }}>
      <div className="dialog-header">
        <div><span className="eyebrow">Геометрия изображения</span><h2 id="resize-title">Изменить размер</h2></div>
        <button type="button" className="dialog-close" aria-label="Закрыть" onClick={closeDialog}>×</button>
      </div>

      <div className="pixel-summary">
        <div><span>До изменения</span><strong>{formatMegapixels(imageData.width * imageData.height)}</strong><small>{imageData.width} × {imageData.height} px</small></div>
        <span aria-hidden="true">→</span>
        <div><span>После изменения</span><strong>{formatMegapixels(Math.max(0, dimensions.width * dimensions.height))}</strong><small>{Math.max(0, dimensions.width)} × {Math.max(0, dimensions.height)} px</small></div>
      </div>

      <div className="resize-fields">
        <label className="wide-field"><span>Единицы измерения</span>
          <select value={unit} onChange={(event) => changeUnit(event.target.value)}>
            <option value="percent">Проценты</option>
            <option value="pixels">Пиксели</option>
          </select>
        </label>
        <label><span>Ширина, {unit === "percent" ? "%" : "px"}</span><input type="number" min="1" max={unit === "percent" ? 1000 : MAX_IMAGE_DIMENSION} step={unit === "percent" ? 0.01 : 1} value={widthValue} onChange={(event) => changeDimension("width", event.target.value)} /></label>
        <button className={`link-button${linked ? " active" : ""}`} type="button" aria-pressed={linked} aria-label="Связать ширину и высоту" onClick={() => setLinked((value) => !value)}>↕</button>
        <label><span>Высота, {unit === "percent" ? "%" : "px"}</span><input type="number" min="1" max={unit === "percent" ? 1000 : MAX_IMAGE_DIMENSION} step={unit === "percent" ? 0.01 : 1} value={heightValue} onChange={(event) => changeDimension("height", event.target.value)} /></label>
        <label className="wide-field"><span>Интерполяция</span>
          <span className="select-with-tooltip">
            <select value={method} onChange={(event) => setMethod(event.target.value)}>
              {Object.values(INTERPOLATION_METHODS).map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}
            </select>
            <button type="button" className="tooltip-trigger" aria-label="Описание алгоритма" aria-describedby="interpolation-tooltip">?</button>
            <span id="interpolation-tooltip" className="algorithm-tooltip" role="tooltip">{INTERPOLATION_METHODS[method].description}</span>
          </span>
        </label>
      </div>

      <label className="switch-label resize-link"><input type="checkbox" checked={linked} onChange={(event) => setLinked(event.target.checked)} />Сохранять пропорции исходного изображения</label>
      <p className={`validation-message${validationError ? " error" : ""}`} role="status">{validationError || `Будет создано изображение ${dimensions.width} × ${dimensions.height} px`}</p>

      <div className="dialog-footer">
        <span className="resize-method-note">Исходное изображение остаётся неизменным до применения.</span>
        <div className="dialog-actions">
          <button type="button" onClick={closeDialog}>Отмена</button>
          <button type="button" className="primary" disabled={Boolean(validationError)} onClick={applyResize}>Изменить</button>
        </div>
      </div>
    </dialog>
  );
}
