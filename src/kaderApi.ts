// kaderApi.ts
// Wrapper fetch() ke endpoint /api/kader/* -- pakai X-Api-Key yang sama
// dengan panel alat, TAPI ini endpoint terpisah dari /api/me/* (mobile app):
// read-only, scoped buat kebutuhan dashboard kader (Tabel Ortu, Grafik,
// Rekap PDF, Rekap Bulanan).

import type { OrtuSummary, BalitaKader, GrowthStat, PengukuranKader } from "./types/kader";

const RELAY_URL: string | undefined = import.meta.env.VITE_RELAY_URL;
const API_KEY: string = import.meta.env.VITE_API_KEY ?? "";

function authHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-Api-Key": API_KEY,
    "ngrok-skip-browser-warning": "true",
  };
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function requireBaseUrl(): string {
  if (!RELAY_URL) {
    throw new Error("VITE_RELAY_URL belum di-set, tidak bisa akses data kader.");
  }
  return RELAY_URL;
}

export async function listOrtu(): Promise<OrtuSummary[]> {
  const res = await fetch(`${requireBaseUrl()}/api/kader/ortu`, { headers: authHeaders() });
  return handle<OrtuSummary[]>(res);
}

export async function listBalitaByOrtu(userId: number): Promise<BalitaKader[]> {
  const res = await fetch(`${requireBaseUrl()}/api/kader/ortu/${userId}/balita`, {
    headers: authHeaders(),
  });
  return handle<BalitaKader[]>(res);
}

export async function updatePengukuranCatatan(
  pengukuranId: number,
  catatan: string
): Promise<PengukuranKader> {
  const res = await fetch(`${requireBaseUrl()}/api/kader/pengukuran/${pengukuranId}/catatan`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ catatan }),
  });
  return handle<PengukuranKader>(res);
}

export async function getGrowthStats(): Promise<GrowthStat[]> {
  const res = await fetch(`${requireBaseUrl()}/api/kader/growth-stats`, {
    headers: authHeaders(),
  });
  return handle<GrowthStat[]>(res);
}

export async function listPengukuranByBalita(balitaId: number): Promise<PengukuranKader[]> {
  const res = await fetch(`${requireBaseUrl()}/api/kader/balita/${balitaId}/pengukuran`, {
    headers: authHeaders(),
  });
  return handle<PengukuranKader[]>(res);
}
// PDF diambil sebagai blob (bukan navigasi <a href> biasa), karena endpoint
// ini butuh header X-Api-Key yang nggak bisa dikirim lewat navigasi biasa.
export async function downloadOrtuReport(userId: number, filenameHint: string): Promise<void> {
  const res = await fetch(`${requireBaseUrl()}/api/kader/ortu/${userId}/report`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `rekap-${filenameHint}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---- Rekap Bulanan ----
// Daftar SEMUA balita + status pengukuran BB/TB pada satu bulan tertentu.
// Dipakai kader buat lihat siapa yang belum diukur bulan ini.

export interface RekapBulananRow {
  balitaId: number;
  namaBayi: string;
  jk: "L" | "P";
  namaOrtu: string;
  username: string;
  sudahDiukur: boolean;
  bb: number | null;
  tb: number | null;
  tglDiukur: string | null;
}

export interface RekapBulanan {
  tahunBulan: string;
  totalBalita: number;
  sudahDiukur: number;
  belumDiukur: number;
  rows: RekapBulananRow[];
}

export async function getRekapBulanan(tahunBulan?: string): Promise<RekapBulanan> {
  const qs = tahunBulan ? `?tahunBulan=${encodeURIComponent(tahunBulan)}` : "";
  const res = await fetch(`${requireBaseUrl()}/api/kader/rekap-bulanan${qs}`, {
    headers: authHeaders(),
  });
  return handle<RekapBulanan>(res);
}
