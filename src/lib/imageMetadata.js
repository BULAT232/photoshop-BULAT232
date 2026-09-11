function parsePng(bytes) {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 29 || !signature.every((byte, index) => bytes[index] === byte)) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const bitDepth = bytes[24];
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[bytes[25]];
  if (!channels) return null;
  return { format: "PNG", width: view.getUint32(16, false), height: view.getUint32(20, false), colorDepth: bitDepth * channels };
}

function parseJpeg(bytes) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const startOfFrame = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  let offset = 2;

  while (offset + 3 < bytes.length) {
    while (offset < bytes.length && bytes[offset] !== 0xff) offset += 1;
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) break;
    const marker = bytes[offset++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 1 >= bytes.length) break;
    const length = view.getUint16(offset, false);
    if (length < 2 || offset + length > bytes.length) break;
    if (startOfFrame.has(marker) && length >= 8) {
      return {
        format: "JPEG",
        width: view.getUint16(offset + 5, false),
        height: view.getUint16(offset + 3, false),
        colorDepth: bytes[offset + 2] * bytes[offset + 7],
      };
    }
    offset += length;
  }
  return null;
}

export function readRasterMetadata(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  return parsePng(bytes) ?? parseJpeg(bytes);
}


