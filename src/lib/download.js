export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Р‘СЂР°СѓР·РµСЂ РЅРµ СЃРјРѕРі СЃС„РѕСЂРјРёСЂРѕРІР°С‚СЊ С„Р°Р№Р»")), type, quality);
  });
}


