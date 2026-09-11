import { forwardRef } from "react";

export const CanvasStage = forwardRef(function CanvasStage(
  { documentInfo, scale, onScaleChange, onFit },
  canvasRef,
) {
  const disabled = !documentInfo;
  return (
    <section className="stage" aria-label="РћР±Р»Р°СЃС‚СЊ РїСЂРѕСЃРјРѕС‚СЂР°">
      <div className="stage-toolbar">
        <div className="file-identity">
          <span className={`file-dot${documentInfo ? " active" : ""}`} aria-hidden="true" />
          <div>
            <strong>{documentInfo?.name ?? "РќРµС‚ РѕС‚РєСЂС‹С‚РѕРіРѕ С„Р°Р№Р»Р°"}</strong>
            <span>{documentInfo ? `${documentInfo.format} В· ${documentInfo.fileSize}` : "Р’С‹Р±РµСЂРёС‚Рµ РёР·РѕР±СЂР°Р¶РµРЅРёРµ СЃР»РµРІР°"}</span>
          </div>
        </div>
        <div className="zoom-controls" aria-label="РњР°СЃС€С‚Р°Р±">
          <button type="button" aria-label="РЈРјРµРЅСЊС€РёС‚СЊ РјР°СЃС€С‚Р°Р±" disabled={disabled} onClick={() => onScaleChange(scale / 1.25)}>в€’</button>
          <output>{Math.round(scale * 100)}%</output>
          <button type="button" aria-label="РЈРІРµР»РёС‡РёС‚СЊ РјР°СЃС€С‚Р°Р±" disabled={disabled} onClick={() => onScaleChange(scale * 1.25)}>+</button>
          <button className="fit-button" type="button" disabled={disabled} onClick={onFit}>Р’РїРёСЃР°С‚СЊ</button>
        </div>
      </div>

      <div className="canvas-viewport">
        {!documentInfo && (
          <div className="empty-state">
            <div className="pixel-art" aria-hidden="true">
              {Array.from({ length: 9 }, (_, index) => <span key={index} />)}
            </div>
            <strong>РҐРѕР»СЃС‚ Р¶РґС‘С‚ РёР·РѕР±СЂР°Р¶РµРЅРёРµ</strong>
            <p>PNG, JPEG РёР»Рё GrayBit-7<br />РІ РїСЂРµРґРµР»Р°С… РїР°РјСЏС‚Рё Р±СЂР°СѓР·РµСЂР°.</p>
          </div>
        )}
        <div className="canvas-frame" hidden={!documentInfo}>
          <canvas
            ref={canvasRef}
            style={{ width: documentInfo ? Math.round(documentInfo.width * scale) : 0, height: documentInfo ? Math.round(documentInfo.height * scale) : 0 }}
          >Р’Р°С€ Р±СЂР°СѓР·РµСЂ РЅРµ РїРѕРґРґРµСЂР¶РёРІР°РµС‚ Canvas.</canvas>
        </div>
      </div>

      <footer className="statusbar" aria-live="polite">
        <div className="status-item"><span>Р Р°Р·РјРµСЂ</span><strong>{documentInfo ? `${documentInfo.width} Г— ${documentInfo.height} px` : "вЂ”"}</strong></div>
        <div className="status-divider" />
        <div className="status-item"><span>Р“Р»СѓР±РёРЅР° С†РІРµС‚Р°</span><strong>{documentInfo ? `${documentInfo.colorDepth} Р±РёС‚` : "вЂ”"}</strong></div>
        <div className="status-divider" />
        <div className="status-item"><span>Р¤РѕСЂРјР°С‚</span><strong>{documentInfo?.format ?? "вЂ”"}</strong></div>
        <p>{documentInfo?.hasMask ? "РџСЂРёСЃСѓС‚СЃС‚РІСѓРµС‚ Р±РёРЅР°СЂРЅР°СЏ РјР°СЃРєР°" : documentInfo ? "РР·РѕР±СЂР°Р¶РµРЅРёРµ Р·Р°РіСЂСѓР¶РµРЅРѕ" : "Р“РѕС‚РѕРІРѕ Рє СЂР°Р±РѕС‚Рµ"}</p>
      </footer>
    </section>
  );
});


