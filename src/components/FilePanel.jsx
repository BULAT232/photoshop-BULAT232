import { useRef, useState } from "react";

const exportOptions = [
  { format: "png", title: "PNG", note: "Р‘РµР· РїРѕС‚РµСЂСЊ" },
  { format: "jpg", title: "JPG", note: "РљР°С‡РµСЃС‚РІРѕ 92%" },
  { format: "gb7", title: "GB7", note: "7 Р±РёС‚ В· СЃРµСЂС‹Р№" },
];

export function FilePanel({ hasImage, busy, onOpen, onExport }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const chooseFile = () => inputRef.current?.click();
  const receiveFile = (file) => file && onOpen(file);

  return (
    <aside className="sidebar" aria-label="РџР°РЅРµР»СЊ С„Р°Р№Р»РѕРІ">
      <section className="intro">
        <span className="eyebrow">Р¤РѕСЂРјР°С‚ РёР·РѕР±СЂР°Р¶РµРЅРёСЏ</span>
        <h1>РћС‚РєСЂРѕР№С‚Рµ РґРµС‚Р°Р»Рё,<br />СЃРєСЂС‹С‚С‹Рµ РІ РїРёРєСЃРµР»СЏС….</h1>
        <p>Р—Р°РіСЂСѓР·РёС‚Рµ РёР·РѕР±СЂР°Р¶РµРЅРёРµ, РёР·СѓС‡РёС‚Рµ РµРіРѕ РїР°СЂР°РјРµС‚СЂС‹ Рё СЃРѕС…СЂР°РЅРёС‚Рµ РІ PNG, JPEG РёР»Рё СѓС‡РµР±РЅРѕРј С„РѕСЂРјР°С‚Рµ GB7.</p>
      </section>

      <section
        className={`drop-zone${dragging ? " dragging" : ""}${busy ? " busy" : ""}`}
        tabIndex="0"
        role="button"
        aria-label="Р’С‹Р±СЂР°С‚СЊ РёР·РѕР±СЂР°Р¶РµРЅРёРµ"
        onClick={chooseFile}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            chooseFile();
          }
        }}
        onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => { event.preventDefault(); setDragging(false); }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          receiveFile(event.dataTransfer.files[0]);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.gb7,image/png,image/jpeg"
          hidden
          disabled={busy}
          onChange={(event) => {
            receiveFile(event.target.files[0]);
            event.target.value = "";
          }}
        />
        <span className="upload-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" /></svg>
        </span>
        <strong>{busy ? "РћР±СЂР°Р±Р°С‚С‹РІР°СЋ С„Р°Р№Р»вЂ¦" : "РџРµСЂРµС‚Р°С‰РёС‚Рµ РёР·РѕР±СЂР°Р¶РµРЅРёРµ"}</strong>
        <span>РёР»Рё РЅР°Р¶РјРёС‚Рµ, С‡С‚РѕР±С‹ РІС‹Р±СЂР°С‚СЊ С„Р°Р№Р»</span>
        <small>PNG В· JPG В· GB7</small>
      </section>

      <section className="export-panel" aria-labelledby="export-title">
        <div><span className="eyebrow">Р­РєСЃРїРѕСЂС‚</span><h2 id="export-title">РЎРєР°С‡Р°С‚СЊ РєР°Рє</h2></div>
        <div className="export-grid">
          {exportOptions.map((option) => (
            <button
              className={`export-button${option.format === "gb7" ? " accent" : ""}`}
              type="button"
              disabled={!hasImage}
              key={option.format}
              onClick={() => onExport(option.format)}
            >
              <b>{option.title}</b><span>{option.note}</span>
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}


