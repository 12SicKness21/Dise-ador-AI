import { createWriteStream, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createDeflate } from "zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, "..", "public", "icons");
mkdirSync(iconsDir, { recursive: true });

function crc32(buf) {
  let crc = 0xffffffff;
  for (const b of buf) {
    crc ^= b;
    for (let i = 0; i < 8; i++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type);
  const crcBuf = Buffer.concat([t, data]);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc32(crcBuf), 0);
  return Buffer.concat([len, t, data, c]);
}

function adler32(data) {
  let s1 = 1, s2 = 0;
  for (const b of data) { s1 = (s1 + b) % 65521; s2 = (s2 + s1) % 65521; }
  return ((s2 << 16) | s1) >>> 0;
}

function deflateSync(data) {
  const out = [];
  const blockSize = 65535;
  for (let i = 0; i < data.length; i += blockSize) {
    const block = data.slice(i, i + blockSize);
    const isLast = i + blockSize >= data.length;
    const hdr = Buffer.alloc(5);
    hdr[0] = isLast ? 1 : 0;
    hdr.writeUInt16LE(block.length, 1);
    hdr.writeUInt16LE(~block.length & 0xffff, 3);
    out.push(hdr, block);
  }
  const adler = Buffer.alloc(4);
  adler.writeUInt32BE(adler32(data), 0);
  return Buffer.concat([Buffer.from([0x78, 0x01]), ...out, adler]);
}

function makePNG(size, r, g, b) {
  const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB
  const raw = [];
  for (let y = 0; y < size; y++) {
    raw.push(0); // filter type None
    for (let x = 0; x < size; x++) raw.push(r, g, b);
  }
  const idat = deflateSync(Buffer.from(raw));
  return Buffer.concat([PNG_SIG, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

// Black icons (placeholder)
for (const [name, size] of [["icon-192.png", 192], ["icon-512.png", 512], ["icon-512-maskable.png", 512]]) {
  const png = makePNG(size, 0, 0, 0);
  const ws = createWriteStream(join(iconsDir, name));
  ws.write(png);
  ws.end();
  console.log(`Generated ${name} (${size}x${size})`);
}
