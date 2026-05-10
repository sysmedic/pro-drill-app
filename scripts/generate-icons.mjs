import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

const crc32 = (buffers) => {
  let crc = 0xffffffff;
  for (const buffer of buffers) {
    for (const byte of buffer) {
      crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const pngChunk = (type, data = Buffer.alloc(0)) => {
  const typeBuffer = Buffer.from(type);
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  typeBuffer.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32([typeBuffer, data]), 8 + data.length);
  return chunk;
};

const insideCircle = (x, y, cx, cy, radius) => {
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= radius * radius;
};

const writePng = (filePath, size, { maskable = false } = {}) => {
  const width = size;
  const height = size;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  const cx = width / 2;
  const cy = height / 2;
  const ballRadius = width * (maskable ? 0.31 : 0.39);
  const bg = [248, 250, 252, 255];
  const primary = [79, 70, 229, 255];
  const secondary = [20, 184, 166, 255];
  const hole = [15, 23, 42, 255];

  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;
    for (let x = 0; x < width; x += 1) {
      const offset = rowStart + 1 + x * 4;
      const dist = Math.hypot(x - cx, y - cy);
      let color = bg;

      if (dist <= ballRadius) {
        const t = Math.min(1, dist / ballRadius);
        color = [
          Math.round(primary[0] * (1 - t) + secondary[0] * t),
          Math.round(primary[1] * (1 - t) + secondary[1] * t),
          Math.round(primary[2] * (1 - t) + secondary[2] * t),
          255,
        ];
      }

      const holeRadius = width * 0.045;
      if (
        insideCircle(x, y, cx - width * 0.09, cy - width * 0.1, holeRadius) ||
        insideCircle(x, y, cx + width * 0.08, cy - width * 0.12, holeRadius) ||
        insideCircle(x, y, cx - width * 0.01, cy + width * 0.06, holeRadius * 1.2)
      ) {
        color = hole;
      }

      raw[offset] = color[0];
      raw[offset + 1] = color[1];
      raw[offset + 2] = color[2];
      raw[offset + 3] = color[3];
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND'),
  ]);

  writeFileSync(filePath, png);
};

writePng('public/icon-192.png', 192);
writePng('public/icon-512.png', 512);
writePng('public/maskable-icon-512.png', 512, { maskable: true });
