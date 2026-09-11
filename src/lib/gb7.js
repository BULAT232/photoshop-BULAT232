const SIGNATURE = Uint8Array.of(0x47, 0x42, 0x37, 0x1d);
const HEADER_SIZE = 12;
const VERSION = 1;

export class Gb7Error extends Error {
  constructor(message) {
    super(message);
    this.name = "Gb7Error";
  }
}

function validateDimensions(width, height) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new Gb7Error("Ширина и высота должны быть положительными целыми числами");
  }
  if (width > 0xffff || height > 0xffff) {
    throw new Gb7Error("GB7 поддерживает размеры не более 65 535 пикселей");
  }
}

export function isGb7(bytes) {
  return bytes.length >= 4 && SIGNATURE.every((byte, index) => bytes[index] === byte);
}

export function encodeGb7(imageData) {
  const { width, height, data } = imageData;
  validateDimensions(width, height);
  if (!(data instanceof Uint8ClampedArray) || data.length !== width * height * 4) {
    throw new Gb7Error("Получен некорректный RGBA-буфер");
  }

  let hasMask = false;
  for (let index = 3; index < data.length; index += 4) {
    if (data[index] < 128) {
      hasMask = true;
      break;
    }
  }

  const result = new Uint8Array(HEADER_SIZE + width * height);
  const view = new DataView(result.buffer);
  result.set(SIGNATURE);
  result[4] = VERSION;
  result[5] = hasMask ? 1 : 0;
  view.setUint16(6, width, false);
  view.setUint16(8, height, false);

  for (let source = 0, target = HEADER_SIZE; source < data.length; source += 4, target += 1) {
    const luminance = 0.2126 * data[source] + 0.7152 * data[source + 1] + 0.0722 * data[source + 2];
    const gray = Math.round((luminance / 255) * 127) & 0x7f;
    const visible = !hasMask || data[source + 3] >= 128;
    result[target] = gray | (hasMask && visible ? 0x80 : 0);
  }
  return result;
}

export function decodeGb7(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.length < HEADER_SIZE) throw new Gb7Error("Файл короче обязательного заголовка GB7");
  if (!isGb7(bytes)) throw new Gb7Error("Сигнатура файла не соответствует GB7");
  if (bytes[4] !== VERSION) throw new Gb7Error(`Версия GB7 ${bytes[4]} не поддерживается`);
  if ((bytes[5] & 0xfe) !== 0) throw new Gb7Error("В заголовке установлены неизвестные флаги");
  if (bytes[10] !== 0 || bytes[11] !== 0) throw new Gb7Error("Резервные байты GB7 должны быть нулевыми");

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint16(6, false);
  const height = view.getUint16(8, false);
  validateDimensions(width, height);
  const expectedLength = HEADER_SIZE + width * height;
  if (bytes.length !== expectedLength) {
    throw new Gb7Error(`Некорректная длина GB7: ожидалось ${expectedLength}, получено ${bytes.length}`);
  }

  const hasMask = (bytes[5] & 1) === 1;
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let source = HEADER_SIZE, target = 0; source < bytes.length; source += 1, target += 4) {
    const pixel = bytes[source];
    const gray = Math.round(((pixel & 0x7f) / 127) * 255);
    rgba[target] = gray;
    rgba[target + 1] = gray;
    rgba[target + 2] = gray;
    rgba[target + 3] = hasMask && (pixel & 0x80) === 0 ? 0 : 255;
  }

  return { width, height, data: rgba, hasMask, colorDepth: 7 };
}

