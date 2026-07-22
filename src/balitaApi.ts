// balitaApi.ts
// Wrapper fetch() ke endpoint balita/pengukuran di relay server.
//
// CATATAN KEAMANAN: API_KEY di sini kebaca oleh siapa pun yang buka
// DevTools/Network tab di browser (karena ini kode frontend, bukan server).
// Ini cukup untuk skala posyandu kecil (kader terpercaya, jaringan terbatas),
// TAPI ini BUKAN otentikasi per-user yang sesungguhnya. Kalau nanti perlu
// login per-kader (misal buat audit siapa yang input data kapan), itu perlu
// sistem auth terpisah (session/JWT per akun), bukan cuma satu API key
// yang dipakai bersama.

import type { Balita, Pengukuran } from "./types/balita";

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
    throw new Error("VITE_RELAY_URL belum di-set, tidak bisa akses data balita.");
  }
  return RELAY_URL;
}

export async function listBalita(): Promise<Balita[]> {
  const res = await fetch(`${requireBaseUrl()}/api/balita`, {
    headers: authHeaders(),
  });
  return handle<Balita[]>(res);
}

export async function createBalita(input: {
  namaBayi: string;
  namaOrtu: string;
  tglLahir: string; // "YYYY-MM-DD"
  jk: "L" | "P";
}): Promise<Balita> {
  const res = await fetch(`${requireBaseUrl()}/api/balita`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  return handle<Balita>(res);
}

export async function getBalita(id: number): Promise<Balita> {
  const res = await fetch(`${requireBaseUrl()}/api/balita/${id}`, {
    headers: authHeaders(),
  });
  return handle<Balita>(res);
}

export async function listPengukuran(balitaId: number): Promise<Pengukuran[]> {
  const res = await fetch(`${requireBaseUrl()}/api/balita/${balitaId}/pengukuran`, {
    headers: authHeaders(),
  });
  return handle<Pengukuran[]>(res);
}

export async function savePengukuran(
  balitaId: number,
  input: { bb: number; tb: number }
): Promise<Pengukuran> {
  const res = await fetch(`${requireBaseUrl()}/api/balita/${balitaId}/pengukuran`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  return handle<Pengukuran>(res);
}
