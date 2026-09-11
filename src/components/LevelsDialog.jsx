import { useEffect, useMemo, useRef, useState } from "react";
import {
  applyLevels,
  calculateHistogram,
  createDefaultLevels,
  getLevelChannelDefinitions,
} from "../lib/levels.js";

const histogramColors = {
  master: "#c8ff48",
  gray: "#d7dbd2",
  red: "#ff6b62",
  green: "#83df76",
  blue: "#69a8ff",
  alpha: "#d7dbd2",
};

function Histogram({ imageData, channelId, logarithmic }) {
  const canvasRef = useRef(null);
  const values = useMemo(() => calculateHistogram(imageData, channelId), [channelId, imageData]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const heights = Array.from(values, (count) => logarithmic ? Math.log1p(count) : count);
    const maximum = Math.max(1, ...heights);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#0b0d0b";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "#252925";
    context.lineWidth = 1;
    for (let index = 1; index < 4; index += 1) {
      const y = Math.round(index * canvas.height / 4) + 0.5;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(canvas.width, y);
      context.stroke();
    }
    context.fillStyle = histogramColors[channelId];
    for (let index = 0; index < 256; index += 1) {
      const height = Math.max(1, Math.round(heights[index] / maximum * (canvas.height - 4)));
      context.fillRect(index * 2, canvas.height - height, 2, height);
    }
  }, [channelId, logarithmic, values]);

  return <canvas ref={canvasRef} className="histogram" width="512" height="176" aria-label={`${logarithmic ? "Логарифмическая" : "Линейная"} гистограмма`} />;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function gammaToPosition(gamma) {
  return Math.log(gamma / 0.1) / Math.log(99) * 100;
}

function positionToGamma(position) {
  return 0.1 * 99 ** (position / 100);
}

export function LevelsDialog({ open, imageData, channelCount, onPreview, onApply, onCancel }) {
  const dialogRef = useRef(null);
  const [channelId, setChannelId] = useState("master");
  const [settings, setSettings] = useState(createDefaultLevels);
  const [logarithmic, setLogarithmic] = useState(false);
  const [previewEnabled, setPreviewEnabled] = useState(true);
  const level = settings[channelId];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && !dialog.open) {
      setChannelId("master");
      setSettings(createDefaultLevels());
      setLogarithmic(false);
      setPreviewEnabled(true);
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    if (!previewEnabled) {
      onPreview(null);
      return undefined;
    }
    const frame = requestAnimationFrame(() => {
      onPreview(applyLevels(imageData, settings, channelCount));
    });
    return () => cancelAnimationFrame(frame);
  }, [channelCount, imageData, onPreview, open, previewEnabled, settings]);

  const updateLevel = (key, input) => {
    setSettings((current) => {
      const active = current[channelId];
      let value = Number(input);
      if (key === "black") value = clamp(Math.round(value), 0, active.white - 1);
      if (key === "white") value = clamp(Math.round(value), active.black + 1, 255);
      if (key === "gamma") value = Math.round(clamp(value, 0.1, 9.9) * 100) / 100;
      return { ...current, [channelId]: { ...active, [key]: value } };
    });
  };

  const closeWithoutChanges = () => {
    onPreview(null);
    onCancel();
  };

  const gammaLeft = level.black / 255 * 100;
  const gammaWidth = (level.white - level.black) / 255 * 100;

  return (
    <dialog
      ref={dialogRef}
      className="levels-dialog"
      aria-labelledby="levels-title"
      onCancel={(event) => { event.preventDefault(); closeWithoutChanges(); }}
    >
      <div className="dialog-header">
        <div><span className="eyebrow">Тональная коррекция</span><h2 id="levels-title">Уровни</h2></div>
        <button type="button" className="dialog-close" aria-label="Закрыть" onClick={closeWithoutChanges}>×</button>
      </div>

      <div className="levels-options">
        <label>Канал
          <select value={channelId} onChange={(event) => setChannelId(event.target.value)}>
            {getLevelChannelDefinitions(channelCount).map((channel) => <option value={channel.id} key={channel.id}>{channel.label}</option>)}
          </select>
        </label>
        <label className="switch-label">
          <input type="checkbox" checked={logarithmic} onChange={(event) => setLogarithmic(event.target.checked)} />
          Логарифмическая шкала
        </label>
      </div>

      <div className="histogram-wrap">
        <Histogram imageData={imageData} channelId={channelId} logarithmic={logarithmic} />
        <div className="histogram-axis" aria-hidden="true"><span>0</span><span>64</span><span>128</span><span>192</span><span>255</span></div>
      </div>

      <section className="input-levels" aria-labelledby="input-levels-title">
        <div className="input-levels-heading"><h3 id="input-levels-title">Входные уровни</h3><span>0 — 255</span></div>
        <div className="levels-track">
          <div className="levels-track-line" />
          <input className="black-slider" type="range" min="0" max="255" step="1" value={level.black} aria-label="Точка чёрного" onChange={(event) => updateLevel("black", event.target.value)} />
          <input className="gamma-slider" style={{ left: `${gammaLeft}%`, width: `${gammaWidth}%` }} type="range" min="0" max="100" step="0.1" value={gammaToPosition(level.gamma)} aria-label="Гамма" onChange={(event) => updateLevel("gamma", positionToGamma(Number(event.target.value)))} />
          <input className="white-slider" type="range" min="0" max="255" step="1" value={level.white} aria-label="Точка белого" onChange={(event) => updateLevel("white", event.target.value)} />
        </div>
        <div className="level-fields">
          <label><span>Чёрный</span><input type="number" min="0" max={level.white - 1} value={level.black} onChange={(event) => updateLevel("black", event.target.value)} /></label>
          <label><span>Гамма</span><input type="number" min="0.1" max="9.9" step="0.01" value={level.gamma} onChange={(event) => updateLevel("gamma", event.target.value)} /></label>
          <label><span>Белый</span><input type="number" min={level.black + 1} max="255" value={level.white} onChange={(event) => updateLevel("white", event.target.value)} /></label>
        </div>
      </section>

      <div className="dialog-footer">
        <label className="switch-label preview-switch"><input type="checkbox" checked={previewEnabled} onChange={(event) => setPreviewEnabled(event.target.checked)} />Предпросмотр</label>
        <div className="dialog-actions">
          <button type="button" onClick={() => setSettings(createDefaultLevels())}>Сбросить</button>
          <button type="button" onClick={closeWithoutChanges}>Отмена</button>
          <button type="button" className="primary" onClick={() => onApply(applyLevels(imageData, settings, channelCount))}>Применить</button>
        </div>
      </div>
    </dialog>
  );
}
