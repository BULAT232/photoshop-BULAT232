import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Brand } from "./components/Brand.jsx";
import { CanvasStage } from "./components/CanvasStage.jsx";
import { ChannelPanel } from "./components/ChannelPanel.jsx";
import { FilePanel } from "./components/FilePanel.jsx";
import { LevelsDialog } from "./components/LevelsDialog.jsx";
import { PixelInspector } from "./components/PixelInspector.jsx";
import { ResizeDialog } from "./components/ResizeDialog.jsx";
import { composeVisibleImageData, createChannelState, samplePixel } from "./lib/colorChannels.js";
import { canvasToBlob, downloadBlob } from "./lib/download.js";
import { decodeGb7, encodeGb7, isGb7 } from "./lib/gb7.js";
import { readRasterMetadata } from "./lib/imageMetadata.js";
import { calculateFitScale, MAX_VIEW_SCALE, MIN_VIEW_SCALE, resizeImageData } from "./lib/interpolation.js";

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1024 ** 2).toFixed(1)} МБ`;
}

function fileBaseName(name) {
  return name.replace(/\.(png|jpe?g|gb7)$/i, "");
}

async function decodeRaster(file, buffer) {
  const metadata = readRasterMetadata(buffer);
  if (!metadata) throw new Error("Файл не является корректным PNG или JPEG");
  const bitmap = await createImageBitmap(file);
  const temporary = document.createElement("canvas");
  temporary.width = bitmap.width;
  temporary.height = bitmap.height;
  const temporaryContext = temporary.getContext("2d", { willReadFrequently: true });
  temporaryContext.drawImage(bitmap, 0, 0);
  bitmap.close();
  return { imageData: temporaryContext.getImageData(0, 0, temporary.width, temporary.height), metadata };
}

export default function App() {
  const canvasRef = useRef(null);
  const [documentInfo, setDocumentInfo] = useState(null);
  const [scale, setScale] = useState(1);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [sourceImageData, setSourceImageData] = useState(null);
  const [enabledChannels, setEnabledChannels] = useState({});
  const [activeTool, setActiveTool] = useState("pan");
  const [pixelSample, setPixelSample] = useState(null);
  const [levelsOpen, setLevelsOpen] = useState(false);
  const [levelsPreview, setLevelsPreview] = useState(null);
  const [resizeOpen, setResizeOpen] = useState(false);
  const [viewInterpolation, setViewInterpolation] = useState("bilinear");

  const notify = useCallback((message, kind = "info") => {
    setToast({ message, kind });
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const renderImage = useCallback((imageData, info) => {
    const original = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
    setSourceImageData(original);
    setDocumentInfo({ ...info, width: original.width, height: original.height });
    setEnabledChannels(createChannelState(info.channelCount));
    setPixelSample(null);
    setLevelsPreview(null);
    setLevelsOpen(false);
    setResizeOpen(false);
    window.requestAnimationFrame(() => {
      const viewport = document.querySelector(".canvas-viewport");
      if (viewport) setScale(calculateFitScale(original.width, original.height, viewport.clientWidth, viewport.clientHeight));
    });
  }, []);

  const workingImageData = levelsPreview ?? sourceImageData;
  const displayImageData = useMemo(() => {
    if (!workingImageData || !documentInfo) return null;
    return composeVisibleImageData(workingImageData, enabledChannels, documentInfo.channelCount);
  }, [documentInfo, enabledChannels, workingImageData]);

  const scaledImageData = useMemo(() => {
    if (!displayImageData) return null;
    const width = Math.max(1, Math.round(displayImageData.width * scale));
    const height = Math.max(1, Math.round(displayImageData.height * scale));
    return resizeImageData(displayImageData, width, height, viewInterpolation);
  }, [displayImageData, scale, viewInterpolation]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !scaledImageData) return;
    canvas.width = scaledImageData.width;
    canvas.height = scaledImageData.height;
    canvas.getContext("2d", { willReadFrequently: true }).putImageData(scaledImageData, 0, 0);
  }, [scaledImageData]);

  const openFile = useCallback(async (file) => {
    setBusy(true);
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      if (isGb7(bytes) || file.name.toLowerCase().endsWith(".gb7")) {
        const decoded = decodeGb7(bytes);
        renderImage(new ImageData(decoded.data, decoded.width, decoded.height), {
          name: file.name, format: "GB7", colorDepth: 7, channelCount: decoded.hasMask ? 2 : 1, hasMask: decoded.hasMask, fileSize: formatBytes(file.size),
        });
      } else {
        const { imageData, metadata } = await decodeRaster(file, buffer);
        renderImage(imageData, {
          name: file.name, format: metadata.format, colorDepth: metadata.colorDepth, channelCount: metadata.channelCount, hasMask: false, fileSize: formatBytes(file.size),
        });
      }
      notify("Изображение успешно открыто");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Не удалось прочитать изображение", "error");
    } finally {
      setBusy(false);
    }
  }, [notify, renderImage]);

  const exportImage = useCallback(async (format) => {
    if (!documentInfo || !displayImageData) return;
    try {
      const name = fileBaseName(documentInfo.name);
      if (format === "gb7") {
        const bytes = encodeGb7(displayImageData);
        downloadBlob(new Blob([bytes], { type: "application/octet-stream" }), `${name}.gb7`);
      } else {
        const sourceCanvas = document.createElement("canvas");
        sourceCanvas.width = displayImageData.width;
        sourceCanvas.height = displayImageData.height;
        sourceCanvas.getContext("2d").putImageData(displayImageData, 0, 0);
        let exportCanvas = sourceCanvas;
        if (format === "jpg") {
          exportCanvas = document.createElement("canvas");
          exportCanvas.width = displayImageData.width;
          exportCanvas.height = displayImageData.height;
          const context = exportCanvas.getContext("2d");
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
          context.drawImage(sourceCanvas, 0, 0);
        }
        const mime = format === "png" ? "image/png" : "image/jpeg";
        const blob = await canvasToBlob(exportCanvas, mime, 0.92);
        downloadBlob(blob, `${name}.${format}`);
      }
      notify(`Файл ${format.toUpperCase()} подготовлен`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Ошибка экспорта", "error");
    }
  }, [displayImageData, documentInfo, notify]);

  const fitImage = useCallback(() => {
    const viewport = document.querySelector(".canvas-viewport");
    if (!documentInfo || !viewport) return;
    setScale(calculateFitScale(documentInfo.width, documentInfo.height, viewport.clientWidth, viewport.clientHeight));
  }, [documentInfo]);

  const updateScale = useCallback((value) => setScale(Math.min(MAX_VIEW_SCALE, Math.max(MIN_VIEW_SCALE, value))), []);

  const toggleChannel = useCallback((channelId) => {
    setEnabledChannels((current) => ({ ...current, [channelId]: !current[channelId] }));
  }, []);

  const inspectPixel = useCallback((x, y) => {
    if (!sourceImageData || !scaledImageData) return;
    const sourceX = Math.min(sourceImageData.width - 1, Math.floor(x * sourceImageData.width / scaledImageData.width));
    const sourceY = Math.min(sourceImageData.height - 1, Math.floor(y * sourceImageData.height / scaledImageData.height));
    setPixelSample(samplePixel(sourceImageData, sourceX, sourceY));
  }, [scaledImageData, sourceImageData]);

  const applyLevelChanges = useCallback((imageData) => {
    setSourceImageData(imageData);
    setLevelsPreview(null);
    setLevelsOpen(false);
    setPixelSample(null);
    notify("Тональная коррекция применена");
  }, [notify]);

  const applyResize = useCallback((imageData) => {
    setSourceImageData(imageData);
    setDocumentInfo((current) => ({ ...current, width: imageData.width, height: imageData.height }));
    setResizeOpen(false);
    setPixelSample(null);
    notify(`Размер изменён: ${imageData.width} × ${imageData.height} px`);
  }, [notify]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <Brand />
        <div className="topbar-meta"><span className="indicator" aria-hidden="true" /><span>Лабораторные работы №1–4</span></div>
      </header>
      <main className="workspace">
        <aside className="sidebar" aria-label="Панель изображения">
          <FilePanel hasImage={Boolean(documentInfo)} busy={busy} onOpen={openFile} onExport={exportImage} />
          {workingImageData && documentInfo && (
            <ChannelPanel
              imageData={workingImageData}
              channelCount={documentInfo.channelCount}
              enabledChannels={enabledChannels}
              onToggle={toggleChannel}
            />
          )}
          <PixelInspector
            sample={pixelSample}
            active={activeTool === "eyedropper"}
            disabled={!sourceImageData}
            onToggle={() => setActiveTool((tool) => tool === "eyedropper" ? "pan" : "eyedropper")}
          />
        </aside>
        <CanvasStage
          ref={canvasRef}
          documentInfo={documentInfo}
          scale={scale}
          activeTool={activeTool}
          onScaleChange={updateScale}
          onFit={fitImage}
          onInspectPixel={inspectPixel}
          onOpenLevels={() => setLevelsOpen(true)}
          onOpenResize={() => setResizeOpen(true)}
          interpolation={viewInterpolation}
          onInterpolationChange={setViewInterpolation}
        />
      </main>
      {sourceImageData && documentInfo && (
        <LevelsDialog
          open={levelsOpen}
          imageData={sourceImageData}
          channelCount={documentInfo.channelCount}
          onPreview={setLevelsPreview}
          onApply={applyLevelChanges}
          onCancel={() => setLevelsOpen(false)}
        />
      )}
      {sourceImageData && (
        <ResizeDialog
          open={resizeOpen}
          imageData={sourceImageData}
          onApply={applyResize}
          onCancel={() => setResizeOpen(false)}
        />
      )}
      {toast && <div className={`toast visible${toast.kind === "error" ? " error" : ""}`} role="status">{toast.message}</div>}
    </div>
  );
}
