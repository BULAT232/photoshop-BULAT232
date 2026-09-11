import { useCallback, useRef, useState } from "react";
import { Brand } from "./components/Brand.jsx";
import { CanvasStage } from "./components/CanvasStage.jsx";
import { FilePanel } from "./components/FilePanel.jsx";
import { canvasToBlob, downloadBlob } from "./lib/download.js";
import { decodeGb7, encodeGb7, isGb7 } from "./lib/gb7.js";
import { readRasterMetadata } from "./lib/imageMetadata.js";

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} Р‘`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} РљР‘`;
  return `${(bytes / 1024 ** 2).toFixed(1)} РњР‘`;
}

function fileBaseName(name) {
  return name.replace(/\.(png|jpe?g|gb7)$/i, "");
}

async function decodeRaster(file, buffer) {
  const metadata = readRasterMetadata(buffer);
  if (!metadata) throw new Error("Р¤Р°Р№Р» РЅРµ СЏРІР»СЏРµС‚СЃСЏ РєРѕСЂСЂРµРєС‚РЅС‹Рј PNG РёР»Рё JPEG");
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

  const notify = useCallback((message, kind = "info") => {
    setToast({ message, kind });
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const renderImage = useCallback((imageData, info) => {
    const canvas = canvasRef.current;
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    canvas.getContext("2d", { willReadFrequently: true }).putImageData(imageData, 0, 0);
    setDocumentInfo({ ...info, width: imageData.width, height: imageData.height });
    setScale(1);
  }, []);

  const openFile = useCallback(async (file) => {
    setBusy(true);
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      if (isGb7(bytes) || file.name.toLowerCase().endsWith(".gb7")) {
        const decoded = decodeGb7(bytes);
        renderImage(new ImageData(decoded.data, decoded.width, decoded.height), {
          name: file.name, format: "GB7", colorDepth: 7, hasMask: decoded.hasMask, fileSize: formatBytes(file.size),
        });
      } else {
        const { imageData, metadata } = await decodeRaster(file, buffer);
        renderImage(imageData, {
          name: file.name, format: metadata.format, colorDepth: metadata.colorDepth, hasMask: false, fileSize: formatBytes(file.size),
        });
      }
      notify("РР·РѕР±СЂР°Р¶РµРЅРёРµ СѓСЃРїРµС€РЅРѕ РѕС‚РєСЂС‹С‚Рѕ");
    } catch (error) {
      notify(error instanceof Error ? error.message : "РќРµ СѓРґР°Р»РѕСЃСЊ РїСЂРѕС‡РёС‚Р°С‚СЊ РёР·РѕР±СЂР°Р¶РµРЅРёРµ", "error");
    } finally {
      setBusy(false);
    }
  }, [notify, renderImage]);

  const exportImage = useCallback(async (format) => {
    if (!documentInfo || !canvasRef.current) return;
    try {
      const sourceCanvas = canvasRef.current;
      const name = fileBaseName(documentInfo.name);
      if (format === "gb7") {
        const context = sourceCanvas.getContext("2d", { willReadFrequently: true });
        const bytes = encodeGb7(context.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height));
        downloadBlob(new Blob([bytes], { type: "application/octet-stream" }), `${name}.gb7`);
      } else {
        let exportCanvas = sourceCanvas;
        if (format === "jpg") {
          exportCanvas = document.createElement("canvas");
          exportCanvas.width = sourceCanvas.width;
          exportCanvas.height = sourceCanvas.height;
          const context = exportCanvas.getContext("2d");
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
          context.drawImage(sourceCanvas, 0, 0);
        }
        const mime = format === "png" ? "image/png" : "image/jpeg";
        const blob = await canvasToBlob(exportCanvas, mime, 0.92);
        downloadBlob(blob, `${name}.${format}`);
      }
      notify(`Р¤Р°Р№Р» ${format.toUpperCase()} РїРѕРґРіРѕС‚РѕРІР»РµРЅ`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "РћС€РёР±РєР° СЌРєСЃРїРѕСЂС‚Р°", "error");
    }
  }, [documentInfo, notify]);

  const fitImage = useCallback(() => {
    const viewport = document.querySelector(".canvas-viewport");
    if (!documentInfo || !viewport) return;
    const availableWidth = Math.max(80, viewport.clientWidth - 96);
    const availableHeight = Math.max(80, viewport.clientHeight - 96);
    setScale(Math.min(1, availableWidth / documentInfo.width, availableHeight / documentInfo.height));
  }, [documentInfo]);

  const updateScale = useCallback((value) => setScale(Math.min(4, Math.max(0.1, value))), []);

  return (
    <div className="app-shell">
      <header className="topbar">
        <Brand />
        <div className="topbar-meta"><span className="indicator" aria-hidden="true" /><span>Р›Р°Р±РѕСЂР°С‚РѕСЂРЅР°СЏ СЂР°Р±РѕС‚Р° в„–1</span></div>
      </header>
      <main className="workspace">
        <FilePanel hasImage={Boolean(documentInfo)} busy={busy} onOpen={openFile} onExport={exportImage} />
        <CanvasStage ref={canvasRef} documentInfo={documentInfo} scale={scale} onScaleChange={updateScale} onFit={fitImage} />
      </main>
      {toast && <div className={`toast visible${toast.kind === "error" ? " error" : ""}`} role="status">{toast.message}</div>}
    </div>
  );
}


