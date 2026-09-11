export function PixelInspector({ sample, active, disabled, onToggle }) {
  return (
    <section className="pixel-panel" aria-labelledby="pixel-title">
      <div className="panel-heading">
        <div><span className="eyebrow">Инструмент</span><h2 id="pixel-title">Пипетка</h2></div>
        <button
          className={`tool-toggle${active ? " active" : ""}`}
          type="button"
          disabled={disabled}
          aria-pressed={active}
          onClick={onToggle}
        >
          <span aria-hidden="true">⌖</span>{active ? "Включена" : "Включить"}
        </button>
      </div>
      {sample ? (
        <div className="pixel-readout">
          <div className="color-swatch" style={{ background: `rgb(${sample.red} ${sample.green} ${sample.blue})` }} aria-label="Выбранный цвет" />
          <dl>
            <div><dt>Координаты</dt><dd>X {sample.x} · Y {sample.y}</dd></div>
            <div><dt>RGB</dt><dd>{sample.red} · {sample.green} · {sample.blue}</dd></div>
            <div><dt>CIELAB</dt><dd>L* {sample.lab.l.toFixed(2)} · a* {sample.lab.a.toFixed(2)} · b* {sample.lab.b.toFixed(2)}</dd></div>
          </dl>
        </div>
      ) : (
        <p className="panel-hint">Включите инструмент и нажмите на пиксель изображения.</p>
      )}
    </section>
  );
}
