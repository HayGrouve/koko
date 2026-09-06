const LOCAL_HEADER = 0x04034b50;
const DATA_DESCRIPTOR = 0x08074b50;
const CENTRAL_HEADER = 0x02014b50;
const EOCD = 0x06054b50;
const DATA_DESCRIPTOR_FLAG = 0x0008;

type CentralEntry = {
  nameBytes: Uint8Array;
  crc: number;
  size: number;
  localOffset: number;
  dosTime: number;
  dosDate: number;
};

export type ZipStoredEntry = {
  name: string;
  body: () => ReadableStream<Uint8Array>;
};

export function zipStoredEntries(
  entries: readonly ZipStoredEntry[],
): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async start(controller) {
      const central: CentralEntry[] = [];
      let offset = 0;
      const { dosTime, dosDate } = dosDateTime(new Date());

      const write = (chunk: Uint8Array) => {
        controller.enqueue(chunk);
        offset += chunk.byteLength;
      };

      for (const entry of entries) {
        const nameBytes = new TextEncoder().encode(entry.name);
        const localOffset = offset;
        write(
          localFileHeader(nameBytes, dosTime, dosDate),
        );
        write(nameBytes);

        let crc = 0xffffffff;
        let size = 0;
        const reader = entry.body().getReader();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          crc = crc32Update(crc, value);
          size += value.byteLength;
          write(value);
        }
        crc = (crc ^ 0xffffffff) >>> 0;
        write(dataDescriptor(crc, size));
        central.push({
          nameBytes,
          crc,
          size,
          localOffset,
          dosTime,
          dosDate,
        });
      }

      const centralStart = offset;
      for (const entry of central) {
        write(centralFileHeader(entry));
        write(entry.nameBytes);
      }
      write(endOfCentralDirectory(central.length, offset - centralStart, centralStart));
      controller.close();
    },
  });
}

function localFileHeader(
  nameBytes: Uint8Array,
  dosTime: number,
  dosDate: number,
): Uint8Array {
  const header = Buffer.alloc(30);
  header.writeUInt32LE(LOCAL_HEADER, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(DATA_DESCRIPTOR_FLAG, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(dosTime, 10);
  header.writeUInt16LE(dosDate, 12);
  header.writeUInt32LE(0, 14);
  header.writeUInt32LE(0, 18);
  header.writeUInt32LE(0, 22);
  header.writeUInt16LE(nameBytes.byteLength, 26);
  header.writeUInt16LE(0, 28);
  return header;
}

function dataDescriptor(crc: number, size: number): Uint8Array {
  const header = Buffer.alloc(16);
  header.writeUInt32LE(DATA_DESCRIPTOR, 0);
  header.writeUInt32LE(crc, 4);
  header.writeUInt32LE(size, 8);
  header.writeUInt32LE(size, 12);
  return header;
}

function centralFileHeader(entry: CentralEntry): Uint8Array {
  const header = Buffer.alloc(46);
  header.writeUInt32LE(CENTRAL_HEADER, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(DATA_DESCRIPTOR_FLAG, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(entry.dosTime, 12);
  header.writeUInt16LE(entry.dosDate, 14);
  header.writeUInt32LE(entry.crc, 16);
  header.writeUInt32LE(entry.size, 20);
  header.writeUInt32LE(entry.size, 24);
  header.writeUInt16LE(entry.nameBytes.byteLength, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(0, 38);
  header.writeUInt32LE(entry.localOffset, 42);
  return header;
}

function endOfCentralDirectory(
  count: number,
  centralSize: number,
  centralOffset: number,
): Uint8Array {
  const header = Buffer.alloc(22);
  header.writeUInt32LE(EOCD, 0);
  header.writeUInt16LE(0, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(count, 8);
  header.writeUInt16LE(count, 10);
  header.writeUInt32LE(centralSize, 12);
  header.writeUInt32LE(centralOffset, 16);
  header.writeUInt16LE(0, 20);
  return header;
}

function dosDateTime(date: Date): { dosTime: number; dosDate: number } {
  const dosTime =
    (date.getSeconds() >> 1) |
    (date.getMinutes() << 5) |
    (date.getHours() << 11);
  const dosDate =
    date.getDate() |
    ((date.getMonth() + 1) << 5) |
    ((date.getFullYear() - 1980) << 9);
  return { dosTime, dosDate };
}

const CRC_TABLE = makeCrcTable();

function makeCrcTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) === 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
}

function crc32Update(crc: number, chunk: Uint8Array): number {
  let next = crc;
  for (const byte of chunk) {
    const index = (next ^ byte) & 0xff;
    const row = CRC_TABLE[index];
    if (row === undefined) {
      throw new Error("crc table");
    }
    next = row ^ (next >>> 8);
  }
  return next >>> 0;
}
