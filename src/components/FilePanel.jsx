import { useRef, useState } from "react";

const exportOptions = [
  { format: "png", title: "PNG", note: "Без потерь" },
  { format: "jpg", title: "JPG", note: "Качество 92%" },
  { format: "gb7", title: "GB7", note: "7 бит · серый" },
];

export function FilePanel({ hasImage, busy, onOpen, onExport }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const chooseFile = () => inputRef.current?.click();
  const receiveFile = (file) => file && onOpen(file);

  return (
    <div className="file-panel">
      <section className="intro">
        <span className="eyebrow">Формат изображения</span>
        <h1>Откройте детали,<br />скрытые в пикселях.</h1>
        <p>Загрузите изображение, исследуйте его каналы и цвета, затем сохраните в PNG, JPEG или учебном формате GB7.</p>
      </section>

      <section
        className={`drop-zone${dragging ? " dragging" : ""}${busy ? " busy" : ""}`}
        tabIndex="0"
        role="button"
        aria-label="Выбрать изображение"
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
        <strong>{busy ? "Обрабатываю файл…" : "Перетащите изображение"}</strong>
        <span>или нажмите, чтобы выбрать файл</span>
        <small>PNG · JPG · GB7</small>
      </section>

      <section className="export-panel" aria-labelledby="export-title">
        <div><span className="eyebrow">Экспорт</span><h2 id="export-title">Скачать как</h2></div>
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
    </div>
  );
}
