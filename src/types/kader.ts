// types/kader.ts
// Bentuk respons endpoint /api/kader/* di relay server, dipakai dashboard
// web kader (Tabel Ortu, Grafik Pertumbuhan, Rekap PDF).

export interface OrtuSummary {
  id: number;
  namaOrtu: string;
  email: string;
  username: string;
  hp: string | null;
  totalBalita: number;
  sudahDitimbang: number;
  belumDitimbang: number;
}

export interface BalitaKader {
  id: number;
  userId: number;
  namaBayi: string;
  tglLahir: string;
  jk: "L" | "P";
  catatanKader: string | null;
  createdAt: string;
}

export interface GrowthStat {
  usiaBulan: number;
  avgBb: number;
  avgTb: number;
  jumlahSampel: number;
}

export interface PengukuranKader {
  id: number;
  balitaId: number;
  bb: number;
  tb: number;
  usiaBulan: number;
  imt: number;
  zscore: number;
  status: string;
  cls: "normal" | "warn" | "danger";
  catatanKader: string | null;
  tahunBulan: string;
  createdAt: string;
}