// reportPanel.ts
// Generate & download PDF rekap per ortu. Daftar ortu-nya pakai endpoint
// yang sama dengan Tabel Ortu, kader tinggal klik "Cetak" dari daftar.

import { listOrtu, downloadOrtuReport } from "./kaderApi";

export async function mountReportPanel(root: HTMLElement) {
  root.innerHTML = `<p class="rp-loading">Memuat daftar ortu...</p>`;

  try {
    const list = await listOrtu();

    if (list.length === 0) {
      root.innerHTML = `<p class="rp-empty">Belum ada akun ortu terdaftar.</p>`;
      return;
    }

    root.innerHTML = `
      <h2 class="section-title">Rekap PDF per Ortu</h2>
      <div class="rp-list">
        ${list
          .map(
            (o) => `
          <div class="rp-item">
            <div>
              <p class="rp-nama">${o.namaOrtu}</p>
              <p class="rp-sub">${o.username} &middot; ${o.totalBalita} balita</p>
            </div>
            <button class="fw-connect-btn rp-btn" data-userid="${o.id}" data-nama="${o.username}" type="button">Cetak PDF</button>
          </div>`
          )
          .join("")}
      </div>
      <p id="rp-err" class="bp-err"></p>
    `;

    const errEl = root.querySelector<HTMLParagraphElement>("#rp-err")!;
    root.querySelectorAll<HTMLButtonElement>(".rp-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        errEl.textContent = "";
        btn.disabled = true;
        const original = btn.textContent;
        btn.textContent = "Membuat PDF...";
        try {
          await downloadOrtuReport(Number(btn.dataset.userid), btn.dataset.nama || "ortu");
        } catch (err) {
          errEl.textContent = err instanceof Error ? err.message : "Gagal membuat PDF.";
        } finally {
          btn.disabled = false;
          btn.textContent = original;
        }
      });
    });
  } catch (err) {
    root.innerHTML = `<p class="rp-empty">Gagal memuat daftar ortu: ${
      err instanceof Error ? err.message : "unknown error"
    }</p>`;
  }
}
