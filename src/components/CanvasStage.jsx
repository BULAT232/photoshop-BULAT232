import { forwardRef } from "react";

export const CanvasStage = forwardRef(function CanvasStage(
  { documentInfo, scale, onScaleChange, onFit },
  canvasRef,
) {
  const disabled = !documentInfo;
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
        <div className="zoom-controls" aria-label="Масштаб">
          <button type="button" aria-label="Уменьшить масштаб" disabled={disabled} onClick={() => onScaleChange(scale / 1.25)}>−</button>
          <output>{Math.round(scale * 100)}%</output>
          <button type="button" aria-label="Увеличить масштаб" disabled={disabled} onClick={() => onScaleChange(scale * 1.25)}>+</button>
          <button className="fit-button" type="button" disabled={disabled} onClick={onFit}>Вписать</button>
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
        <p>{documentInfo?.hasMask ? "Присутствует бинарная маска" : documentInfo ? "Изображение загружено" : "Готово к работе"}</p>
      </footer>
    </section>
  );
});

