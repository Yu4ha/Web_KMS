// growthChart.ts
// Grafik agregat: rata-rata BB & TB semua balita per usia bulan (0-20),
// bukan grafik per-bayi kayak di mobile app. Digambar manual pakai SVG,
// nggak nambah dependency chart library baru.

import { getGrowthStats } from "./kaderApi";
import type { GrowthStat } from "./types/kader";

const W = 600;
const H = 260;
const PAD_L = 40;
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 30;

function buildChartSvg(
  stats: GrowthStat[],
  valueOf: (s: GrowthStat) => number,
  color: string,
  unit: string
): string {
  const values = stats.map(valueOf);
  const minV = Math.floor(Math.min(...values) * 0.9);
  const maxV = Math.ceil(Math.max(...values) * 1.1);
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const xy = (i: number) => {
    const x = PAD_L + (i / Math.max(1, stats.length - 1)) * innerW;
    const t = (valueOf(stats[i]) - minV) / (maxV - minV || 1);
    const y = PAD_T + innerH - t * innerH;
    return [x, y] as const;
  };

  const path = stats
    .map((_, i) => {
      const [x, y] = xy(i);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const points = stats
    .map((s, i) => {
      const [x, y] = xy(i);
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${color}"><title>${s.usiaBulan} bln: ${valueOf(s)} ${unit} (n=${s.jumlahSampel})</title></circle>`;
    })
    .join("");

  const xLabels = stats
    .map((s, i) => {
      if (s.usiaBulan % 4 !== 0) return "";
      const [x] = xy(i);
      return `<text x="${x.toFixed(1)}" y="${H - 8}" font-size="10" fill="#8b93a7" text-anchor="middle">${s.usiaBulan}</text>`;
    })
    .join("");

  return `
    <svg viewBox="0 0 ${W} ${H}" class="gc-svg">
      <line x1="${PAD_L}" y1="${PAD_T}" x2="${PAD_L}" y2="${H - PAD_B}" stroke="#2c3547" />
      <line x1="${PAD_L}" y1="${H - PAD_B}" x2="${W - PAD_R}" y2="${H - PAD_B}" stroke="#2c3547" />
      <text x="4" y="${PAD_T + 8}" font-size="10" fill="#8b93a7">${maxV}</text>
      <text x="4" y="${H - PAD_B}" font-size="10" fill="#8b93a7">${minV}</text>
      <path d="${path}" fill="none" stroke="${color}" stroke-width="2" />
      ${points}
      ${xLabels}
      <text x="${W / 2}" y="${H - 2}" font-size="10" fill="#8b93a7" text-anchor="middle">usia (bulan)</text>
    </svg>
  `;
}

export async function mountGrowthChart(root: HTMLElement) {
  root.innerHTML = `<p class="gc-loading">Memuat data grafik...</p>`;

  try {
    const stats = await getGrowthStats();

    if (stats.length === 0) {
      root.innerHTML = `<p class="gc-empty">Belum ada data pengukuran untuk dihitung rata-ratanya.</p>`;
      return;
    }

    const totalSampel = stats.reduce((sum, s) => sum + s.jumlahSampel, 0);

    root.innerHTML = `
      <h2 class="section-title">Rata-rata Pertumbuhan (0-20 bulan)</h2>
      <p class="gc-note">Agregat dari seluruh balita terdaftar, total ${totalSampel} pengukuran.</p>

      <div class="gc-chart-block">
        <h3>Rata-rata Berat Badan (kg)</h3>
        ${buildChartSvg(stats, (s) => s.avgBb, "#7fb3ff", "kg")}
      </div>

      <div class="gc-chart-block">
        <h3>Rata-rata Tinggi Badan (cm)</h3>
        ${buildChartSvg(stats, (s) => s.avgTb, "#34d399", "cm")}
      </div>
    `;
  } catch (err) {
    root.innerHTML = `<p class="gc-empty">Gagal memuat grafik: ${
      err instanceof Error ? err.message : "unknown error"
    }</p>`;
  }
}
