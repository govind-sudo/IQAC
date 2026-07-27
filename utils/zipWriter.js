// utils/zipWriter.js
//
// Minimal, dependency-free ZIP archive builder.
//
// Written because the project has no `archiver` dependency and adding
// one just to bundle a few dozen PDFs isn't worth it. Uses Node's
// built-in zlib (deflateRaw) plus a hand-rolled CRC-32, producing a
// standard, universally-openable .zip (Windows Explorer, macOS Archive
// Utility, 7-Zip, unzip).
//
// Scope/limits (deliberate, and fine for this use case):
//   - Buffers the whole archive in memory before sending. Student
//     documents are capped at 4MB each by uploadMiddleware.js, so a
//     bulk download of one document type across a few hundred students
//     stays well within reason. If the student count ever grows into
//     the thousands, swap this for a streaming implementation.
//   - No ZIP64. Individual entries and the total archive must stay
//     under 4GB — see MAX_TOTAL_BYTES below, which fails loudly rather
//     than silently producing a corrupt archive.
//   - Store-only fallback: if deflating a file makes it *bigger*
//     (already-compressed PDFs and JPEGs often do), the entry is
//     stored uncompressed instead.

const zlib = require('zlib');

const MAX_TOTAL_BYTES = 3.5 * 1024 * 1024 * 1024; // stay clear of the 4GB ZIP64 boundary

// ---------- CRC-32 ----------
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  return table;
})();

function crc32(buffer) {
  let crc = -1;
  for (let i = 0; i < buffer.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buffer[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

// ---------- DOS date/time ----------
function toDosDateTime(date) {
  const d = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  const year = Math.max(1980, d.getFullYear());
  const time =
    (d.getHours() << 11) | (d.getMinutes() << 5) | (Math.floor(d.getSeconds() / 2) & 0x1f);
  const dosDate = ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time: time & 0xffff, date: dosDate & 0xffff };
}

// Entry names inside a zip must use forward slashes and should avoid
// characters that break extraction on Windows.
function sanitizeEntryName(name) {
  return String(name || 'file')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\.\.\//g, '')
    .replace(/[:*?"<>|]/g, '_');
}

/**
 * Build a ZIP archive in memory.
 *
 * @param {Array<{name: string, data: Buffer, date?: Date}>} entries
 * @returns {Buffer} the complete .zip file
 */
function createZip(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error('createZip: at least one entry is required.');
  }

  const localParts = [];
  const centralParts = [];
  let offset = 0;
  let total = 0;

  // Guard against duplicate names inside the archive — two students
  // with the same UG number shouldn't ever happen, but a collision
  // would silently overwrite on extraction, so disambiguate instead.
  const usedNames = new Set();

  entries.forEach((entry) => {
    let name = sanitizeEntryName(entry.name);
    if (usedNames.has(name)) {
      const dot = name.lastIndexOf('.');
      const stem = dot > 0 ? name.slice(0, dot) : name;
      const ext = dot > 0 ? name.slice(dot) : '';
      let n = 2;
      while (usedNames.has(`${stem}_${n}${ext}`)) n++;
      name = `${stem}_${n}${ext}`;
    }
    usedNames.add(name);

    const nameBuf = Buffer.from(name, 'utf8');
    const raw = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data || '');

    const crc = crc32(raw);
    const deflated = raw.length ? zlib.deflateRawSync(raw, { level: 6 }) : Buffer.alloc(0);

    // Only pay the deflate overhead if it actually saved space.
    const useDeflate = deflated.length < raw.length;
    const payload = useDeflate ? deflated : raw;
    const method = useDeflate ? 8 : 0;

    total += payload.length;
    if (total > MAX_TOTAL_BYTES) {
      throw new Error(
        'The selected documents exceed the maximum archive size. Please narrow the selection.'
      );
    }

    const { time, date } = toDosDateTime(entry.date);

    // ---- Local file header ----
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); // signature
    local.writeUInt16LE(20, 4);         // version needed
    local.writeUInt16LE(0x0800, 6);     // flags: UTF-8 filename
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(payload.length, 18); // compressed size
    local.writeUInt32LE(raw.length, 22);     // uncompressed size
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);              // extra field length

    localParts.push(local, nameBuf, payload);

    // ---- Central directory header ----
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);   // version made by
    central.writeUInt16LE(20, 6);   // version needed
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(payload.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30);   // extra
    central.writeUInt16LE(0, 32);   // comment
    central.writeUInt16LE(0, 34);   // disk number
    central.writeUInt16LE(0, 36);   // internal attrs
    central.writeUInt32LE(0, 38);   // external attrs
    central.writeUInt32LE(offset, 42);

    centralParts.push(central, nameBuf);

    offset += local.length + nameBuf.length + payload.length;
  });

  const centralBuf = Buffer.concat(centralParts);

  // ---- End of central directory ----
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);                  // disk number
  end.writeUInt16LE(0, 6);                  // disk with central dir
  end.writeUInt16LE(entries.length, 8);     // entries on this disk
  end.writeUInt16LE(entries.length, 10);    // total entries
  end.writeUInt32LE(centralBuf.length, 12); // central dir size
  end.writeUInt32LE(offset, 16);            // central dir offset
  end.writeUInt16LE(0, 20);                 // comment length

  return Buffer.concat([...localParts, centralBuf, end]);
}

module.exports = { createZip, crc32 };