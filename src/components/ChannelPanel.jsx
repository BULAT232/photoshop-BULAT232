import { useEffect, useRef } from "react";
import { channelPreviewValue, getChannelDefinitions } from "../lib/colorChannels.js";

const modeLabels = {
  1: "1 канал · grayscale",
  2: "2 канала · grayscale + alpha",
  3: "3 канала · RGB",
  4: "4 канала · RGB + alpha",
};

export function ChannelPanel({ imageData, channelCount, enabledChannels, onToggle }) {
  const canvasRefs = useRef({});
  const definitions = getChannelDefinitions(channelCount);

  useEffect(() => {
    if (!imageData) return;
    const source = document.createElement("canvas");
    source.width = imageData.width;
    source.height = imageData.height;
    source.getContext("2d").putImageData(imageData, 0, 0);

    definitions.forEach(({ id }) => {
      const canvas = canvasRefs.current[id];
      if (!canvas) return;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.clearRect(0, 0, canvas.width, canvas.height);
      const ratio = Math.min(canvas.width / imageData.width, canvas.height / imageData.height);
      const width = Math.max(1, Math.round(imageData.width * ratio));
      const height = Math.max(1, Math.round(imageData.height * ratio));
      const left = Math.floor((canvas.width - width) / 2);
      const top = Math.floor((canvas.height - height) / 2);
      context.drawImage(source, left, top, width, height);
      const preview = context.getImageData(left, top, width, height);
      for (let index = 0; index < preview.data.length; index += 4) {
        const value = channelPreviewValue(
          id,
          preview.data[index],
          preview.data[index + 1],
          preview.data[index + 2],
          preview.data[index + 3],
        );
        preview.data[index] = value;
        preview.data[index + 1] = value;
        preview.data[index + 2] = value;
        preview.data[index + 3] = 255;
      }
      context.putImageData(preview, left, top);
    });
  }, [definitions, imageData]);

  return (
    <section className="channels-panel" aria-labelledby="channels-title">
      <div className="panel-heading">
        <div><span className="eyebrow">Цветовые данные</span><h2 id="channels-title">Каналы</h2></div>
        <span>{modeLabels[channelCount]}</span>
      </div>
      <div className="channel-grid">
        {definitions.map(({ id, label, shortLabel }) => {
          const enabled = Boolean(enabledChannels[id]);
          return (
            <button
              className={`channel-card${enabled ? " active" : ""}`}
              type="button"
              aria-pressed={enabled}
              onClick={() => onToggle(id)}
              key={id}
            >
              <canvas
                ref={(node) => { canvasRefs.current[id] = node; }}
                width="112"
                height="70"
                aria-label={`Миниатюра канала ${label}`}
              />
              <span className="channel-card-label"><b>{shortLabel}</b><span>{label}</span></span>
              <span className="channel-eye" aria-hidden="true">{enabled ? "●" : "○"}</span>
            </button>
          );
        })}
      </div>
      <p className="panel-hint">Миниатюры показаны в градациях серого: белый означает максимальную интенсивность.</p>
    </section>
  );
}
