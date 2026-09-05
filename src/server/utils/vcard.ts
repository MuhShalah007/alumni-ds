import type { Alumni } from "../db/schema";

interface VCardOptions {
  namaLengkap: string;
  namaPanggilan: string;
  noHp: string;
  email: string | null;
  alamat: string;
  unit: string;
  angkatan: string;
  tahunLulus: number;
}

export function generateVCard(opts: VCardOptions): string {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escapeVCard(opts.namaLengkap)}`,
    `N:${escapeVCard(opts.namaLengkap)};;;;`,
    `NICKNAME:${escapeVCard(opts.namaPanggilan)}`,
    `TEL;TYPE=CELL:${opts.noHp}`,
  ];

  if (opts.email) lines.push(`EMAIL:${opts.email}`);
  lines.push(`ADR;TYPE=HOME:;;${escapeVCard(opts.alamat)};;;;`);
  lines.push(`NOTE:Alumni ${opts.unit} Angkatan ${opts.angkatan} Lulus ${opts.tahunLulus}`);
  lines.push("END:VCARD");

  return lines.join("\r\n");
}

function escapeVCard(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

export type { VCardOptions };
