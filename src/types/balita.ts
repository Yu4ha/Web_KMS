// types/balita.ts
// Bentuknya sengaja dibuat identik dengan response API relay server
// (lihat server.ts: mapBalitaRow / mapPengukuranRow), supaya tidak perlu
// transformasi apa pun waktu data diterima dari fetch().

export interface Balita {
  id: number;
  namaBayi: string;
  namaOrtu: string;
  tglLahir: string; // "YYYY-MM-DD"
  jk: "L" | "P";
  createdAt: string;
}

export type NutritionClass = "normal" | "warn" | "danger";

export interface Pengukuran {
  id: number;
  balitaId: number;
  bb: number;
  tb: number;
  usiaBulan: number;
  imt: number;
  zscore: number;
  status: string;
  cls: NutritionClass;
  catatan: string;
  diLuarRentang: boolean;
  createdAt: string;
}
