// rekapBulanan.ts
// Rekap kader: daftar balita per bulan, status sudah/belum diukur BB & TB,
// plus chart ringkasan (sudah/belum diukur, dan breakdown status gizi).
// Kader pilih bulan lewat <input type="month">, default bulan berjalan.

import { getRekapBulanan, type RekapBulananRow } from "./kaderApi";

const CHART_WIDTH = 560;
const BAR_HEIGHT = 28;
const BAR_GAP = 14;
const LABEL_WIDTH = 140;

interface BarItem {
  label: string;
  value: number;
  color: string;
}

function currentTahunBulan(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function formatTanggal(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function statusGiziLabel(cls: RekapBulananRow["cls"]): string {
  if (cls === "normal") return "Normal";
  if (cls === "warn") return "Perlu Perhatian";
  if (cls === "danger") return "Berisiko";
  return "-";
}

// Bar chart horizontal sederhana, tanpa library eksternal -- SVG murni,
// konsisten sama pola manual-SVG yang dipakai growthChart.ts (.gc-svg).
function buildBarChart(items: BarItem[]): string {
  const maxValue = Math.max(1, ...items.map((i) => i.value));
  const chartAreaWidth = CHART_WIDTH - LABEL_WIDTH - 50;
  const height = items.length * (BAR_HEIGHT + BAR_GAP) + BAR_GAP;

  const bars = items
    .map((item, i) => {
      const y = BAR_GAP + i * (BAR_HEIGHT + BAR_GAP);
      const barWidth = Math.max(2, (item.value / maxValue) * chartAreaWidth);
      return `
        <text x="${LABEL_WIDTH - 10}" y="${y + BAR_HEIGHT / 2 + 4}" text-anchor="end"
              font-size="12" fill="#1a1d24">${item.label}</text>
        <rect x="${LABEL_WIDTH}" y="${y}" width="${barWidth}" height="${BAR_HEIGHT}"
              rx="4" fill="${item.color}" />
        <text x="${LABEL_WIDTH + barWidth + 8}" y="${y + BAR_HEIGHT / 2 + 4}"
              font-size="12" font-weight="700" fill="#1a1d24">${item.value}</text>
      `;
    })
    .join("");

  return `
    <svg class="rb-svg" viewBox="0 0 ${CHART_WIDTH} ${height}" xmlns="http://www.w3.org/2000/svg">
      ${bars}
    </svg>
  `;
}

function renderCharts(rows: RekapBulananRow[]): string {
  const sudah = rows.filter((r) => r.sudahDiukur).length;
  const belum = rows.length - sudah;

  const normal = rows.filter((r) => r.cls === "normal").length;
  const warn = rows.filter((r) => r.cls === "warn").length;
  const danger = rows.filter((r) => r.cls === "danger").length;

  const chartStatus = buildBarChart([
    { label: "Sudah Diukur", value: sudah, color: "#16a34a" },
    { label: "Belum Diukur", value: belum, color: "#dc2626" },
  ]);

  const chartGizi = buildBarChart([
    { label: "Normal", value: normal, color: "#16a34a" },
    { label: "Perlu Perhatian", value: warn, color: "#d97706" },
    { label: "Berisiko", value: danger, color: "#dc2626" },
  ]);

  return `
    <div class="rb-charts">
      <div class="rb-chart-block">
        <h3>Status Pengukuran</h3>
        ${chartStatus}
      </div>
      <div class="rb-chart-block">
        <h3>Status Gizi (dari yang sudah diukur)</h3>
        ${sudah === 0 ? `<p class="rb-empty-chart">Belum ada yang diukur bulan ini.</p>` : chartGizi}
      </div>
    </div>
  `;
}

function renderRows(rows: RekapBulananRow[], hanyaBelum: boolean): string {
  const filtered = hanyaBelum ? rows.filter((r) => !r.sudahDiukur) : rows;

  if (filtered.length === 0) {
    return `<tr><td colspan="7" class="rb-empty">Tidak ada data untuk ditampilkan.</td></tr>`;
  }

  return filtered
    .map(
      (r) => `
    <tr class="${r.sudahDiukur ? "rb-ok" : "rb-missing"}">
      <td>${r.namaBayi}</td>
      <td>${r.jk === "L" ? "Laki-laki" : "Perempuan"}</td>
      <td>${r.namaOrtu} <span class="rb-sub">(${r.username})</span></td>
      <td>${r.bb !== null ? `${r.bb} kg` : "-"}</td>
      <td>${r.tb !== null ? `${r.tb} cm` : "-"}</td>
      <td>${statusGiziLabel(r.cls)}</td>
      <td>
        <span class="rb-badge ${r.sudahDiukur ? "rb-badge-ok" : "rb-badge-missing"}">
          ${r.sudahDiukur ? `Sudah &middot; ${formatTanggal(r.tglDiukur)}` : "Belum diukur"}
        </span>
      </td>
    </tr>`
    )
    .join("");
}

export async function mountRekapBulanan(root: HTMLElement) {
  let tahunBulan = currentTahunBulan();
  let hanyaBelum = false;

  async function render() {
    root.innerHTML = `
      <h2 class="section-title">Rekap Bulanan Kader</h2>
      <div class="rb-controls">
        <label>
          Bulan:
          <input type="month" id="rb-bulan" value="${tahunBulan}" />
        </label>
        <label class="rb-checkbox">
          <input type="checkbox" id="rb-filter" ${hanyaBelum ? "checked" : ""} />
          Tampilkan yang belum diukur saja
        </label>
      </div>
      <div id="rb-summary" class="rb-summary"></div>
      <div id="rb-charts-wrap"></div>
      <div id="rb-table-wrap"><p class="rp-loading">Memuat data...</p></div>
    `;

    const bulanInput = root.querySelector<HTMLInputElement>("#rb-bulan")!;
    const filterInput = root.querySelector<HTMLInputElement>("#rb-filter")!;
    const summaryEl = root.querySelector<HTMLDivElement>("#rb-summary")!;
    const chartsWrap = root.querySelector<HTMLDivElement>("#rb-charts-wrap")!;
    const tableWrap = root.querySelector<HTMLDivElement>("#rb-table-wrap")!;

    bulanInput.addEventListener("change", () => {
      tahunBulan = bulanInput.value || currentTahunBulan();
      render();
    });
    filterInput.addEventListener("change", () => {
      hanyaBelum = filterInput.checked;
      render();
    });

    try {
      const data = await getRekapBulanan(tahunBulan);

      summaryEl.innerHTML = `
        <span class="rb-summary-item">Total: <strong>${data.totalBalita}</strong></span>
        <span class="rb-summary-item rb-summary-ok">Sudah diukur: <strong>${data.sudahDiukur}</strong></span>
        <span class="rb-summary-item rb-summary-missing">Belum diukur: <strong>${data.belumDiukur}</strong></span>
      `;

      chartsWrap.innerHTML = renderCharts(data.rows);

      tableWrap.innerHTML = `
        <table class="rb-table">
          <thead>
            <tr>
              <th>Nama Balita</th>
              <th>JK</th>
              <th>Ortu</th>
              <th>BB</th>
              <th>TB</th>
              <th>Status Gizi</th>
              <th>Status Pengukuran</th>
            </tr>
          </thead>
          <tbody>${renderRows(data.rows, hanyaBelum)}</tbody>
        </table>
      `;
    } catch (err) {
      summaryEl.innerHTML = "";
      chartsWrap.innerHTML = "";
      tableWrap.innerHTML = `<p class="rp-empty">Gagal memuat rekap: ${
        err instanceof Error ? err.message : "unknown error"
      }</p>`;
    }
  }

  await render();
}
