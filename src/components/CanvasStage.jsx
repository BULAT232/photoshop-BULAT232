import { forwardRef } from "react";
import { clientPointToCanvasPixel } from "../lib/colorChannels.js";
import { INTERPOLATION_METHODS } from "../lib/interpolation.js";

export const CanvasStage = forwardRef(function CanvasStage(
  { documentInfo, scale, activeTool, interpolation, onScaleChange, onFit, onInspectPixel, onOpenLevels, onOpenResize, onInterpolationChange },
  canvasRef,
) {
  const disabled = !documentInfo;
  const handleCanvasClick = (event) => {
    if (activeTool !== "eyedropper") return;
    const canvas = event.currentTarget;
    const bounds = canvas.getBoundingClientRect();
    const point = clientPointToCanvasPixel(canvas.width, canvas.height, bounds, event.clientX, event.clientY);
    if (point) onInspectPixel(point.x, point.y);
  };

  return (
    <section className="stage" aria-label="Область просмотра">
      <div className="stage-toolbar">
        <div className="file-identity">
          <span className={`file-dot${documentInfo ? " active" : ""}`} aria-hidden="true" />
          <div>
            <strong>{documentInfo?.name ?? "Нет открытого файла"}</strong>
            <span>{documentInfo ? `${documentInfo.format} · ${documentInfo.fileSize}` : "Выберите изображение слева"}</span>
          </div>
        </div>
        <div className="stage-controls">
          <button className="levels-button" type="button" disabled={disabled} onClick={onOpenLevels}><span aria-hidden="true">◒</span> Уровни</button>
          <button className="levels-button" type="button" disabled={disabled} onClick={onOpenResize}><span aria-hidden="true">↗</span> Размер</button>
          <div className="zoom-controls" aria-label="Масштаб">
            <button type="button" aria-label="Уменьшить масштаб" disabled={disabled} onClick={() => onScaleChange(scale / 1.25)}>−</button>
            <output>{Math.round(scale * 100)}%</output>
            <button type="button" aria-label="Увеличить масштаб" disabled={disabled} onClick={() => onScaleChange(scale * 1.25)}>+</button>
            <button className="fit-button" type="button" disabled={disabled} onClick={onFit}>Вписать</button>
          </div>
        </div>
      </div>

      <div className="canvas-viewport">
        {!documentInfo && (
          <div className="empty-state">
            <div className="pixel-art" aria-hidden="true">
              {Array.from({ length: 9 }, (_, index) => <span key={index} />)}
            </div>
            <strong>Холст ждёт изображение</strong>
            <p>PNG, JPEG или GrayBit-7<br />в пределах памяти браузера.</p>
          </div>
        )}
        <div className="canvas-frame" hidden={!documentInfo}>
          <canvas
            ref={canvasRef}
            className={activeTool === "eyedropper" ? "is-eyedropper" : ""}
            onClick={handleCanvasClick}
            aria-label={activeTool === "eyedropper" ? "Изображение: нажмите, чтобы определить цвет пикселя" : "Открытое изображение"}
            style={{ width: documentInfo ? Math.round(documentInfo.width * scale) : 0, height: documentInfo ? Math.round(documentInfo.height * scale) : 0 }}
          >Ваш браузер не поддерживает Canvas.</canvas>
        </div>
      </div>

      <footer className="statusbar" aria-live="polite">
        <div className="status-item"><span>Размер</span><strong>{documentInfo ? `${documentInfo.width} × ${documentInfo.height} px` : "—"}</strong></div>
        <div className="status-divider" />
        <div className="status-item"><span>Глубина цвета</span><strong>{documentInfo ? `${documentInfo.colorDepth} бит` : "—"}</strong></div>
        <div className="status-divider" />
        <div className="status-item"><span>Формат</span><strong>{documentInfo?.format ?? "—"}</strong></div>
        <div className="view-scale-control">
          <label htmlFor="view-scale">Масштаб</label>
          <input id="view-scale" type="range" min="12" max="300" step="1" value={Math.round(scale * 100)} disabled={disabled} onChange={(event) => onScaleChange(Number(event.target.value) / 100)} />
          <output>{Math.round(scale * 100)}%</output>
          <select aria-label="Интерполяция отображения" value={interpolation} disabled={disabled} onChange={(event) => onInterpolationChange(event.target.value)}>
            {Object.values(INTERPOLATION_METHODS).map((method) => <option value={method.id} key={method.id}>{method.label}</option>)}
          </select>
        </div>
      </footer>
    </section>
  );
});
