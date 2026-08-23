// rekapBulanan.ts
// Rekap kader: daftar balita per bulan, status sudah/belum diukur BB & TB.
// Kader pilih bulan lewat <input type="month">, default bulan berjalan.

import { getRekapBulanan, type RekapBulananRow } from "./kaderApi";

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

function renderRows(rows: RekapBulananRow[], hanyaBelum: boolean): string {
  const filtered = hanyaBelum ? rows.filter((r) => !r.sudahDiukur) : rows;

  if (filtered.length === 0) {
    return `<tr><td colspan="6" class="rb-empty">Tidak ada data untuk ditampilkan.</td></tr>`;
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
      <div id="rb-table-wrap"><p class="rp-loading">Memuat data...</p></div>
    `;

    const bulanInput = root.querySelector<HTMLInputElement>("#rb-bulan")!;
    const filterInput = root.querySelector<HTMLInputElement>("#rb-filter")!;
    const summaryEl = root.querySelector<HTMLDivElement>("#rb-summary")!;
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

      tableWrap.innerHTML = `
        <table class="rb-table">
          <thead>
            <tr>
              <th>Nama Balita</th>
              <th>JK</th>
              <th>Ortu</th>
              <th>BB</th>
              <th>TB</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>${renderRows(data.rows, hanyaBelum)}</tbody>
        </table>
      `;
    } catch (err) {
      summaryEl.innerHTML = "";
      tableWrap.innerHTML = `<p class="rp-empty">Gagal memuat rekap: ${
        err instanceof Error ? err.message : "unknown error"
      }</p>`;
    }
  }

  await render();
}
