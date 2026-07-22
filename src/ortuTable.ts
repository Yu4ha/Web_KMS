// ortuTable.ts
// Dashboard monitoring buat kader: siapa aja ortu yang balitanya belum
// ditimbang bulan ini. Tiap baris bisa di-expand buat lihat detail balita
// + histori pengukurannya, tanpa pindah halaman.

import { listOrtu, listBalitaByOrtu, listPengukuranByBalita, updatePengukuranCatatan } from "./kaderApi";
import type { OrtuSummary, BalitaKader } from "./types/kader";

function formatTgl(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

async function renderBalitaDetail(container: HTMLElement, balita: BalitaKader) {
  container.innerHTML = `<p class="ot-detail-loading">Memuat histori ${balita.namaBayi}...</p>`;
  try {
    const hist = await listPengukuranByBalita(balita.id);
    container.innerHTML = `
      <div class="ot-balita-block">
        <p class="ot-balita-nama">${balita.namaBayi} <span class="ot-balita-sub">(${balita.jk === "L" ? "Laki-laki" : "Perempuan"})</span></p>
        ${
          hist.length === 0
            ? `<p class="ot-empty">Belum ada pengukuran.</p>`
            : `<table class="ot-hist-table">
                <thead>
                  <tr><th>Tanggal</th><th>Usia</th><th>BB</th><th>TB</th><th>Status</th><th>Catatan Kader</th></tr>
                </thead>
                <tbody>
                  ${hist
                    .map(
                      (p) => `
                    <tr>
                      <td>${formatTgl(p.createdAt)}</td>
                      <td>${p.usiaBulan} bln</td>
                      <td>${p.bb} kg</td>
                      <td>${p.tb} cm</td>
                      <td><span class="ot-hist-badge ot-hist-badge-${p.cls}">${p.status}</span></td>
                      <td class="ot-catatan-cell">
                        <textarea class="ot-catatan-input" data-id="${p.id}" rows="2" placeholder="Tulis catatan...">${p.catatanKader ?? ""}</textarea>
                        <div class="ot-catatan-row">
                          <button class="ot-catatan-save" data-id="${p.id}" type="button">Simpan</button>
                          <span class="ot-catatan-status" data-status-for="${p.id}"></span>
                        </div>
                      </td>
                    </tr>`
                    )
                    .join("")}
                </tbody>
              </table>`
        }
      </div>
    `;

    container.querySelectorAll<HTMLButtonElement>(".ot-catatan-save").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = Number(btn.dataset.id);
        const textarea = container.querySelector<HTMLTextAreaElement>(`.ot-catatan-input[data-id="${id}"]`)!;
        const statusEl = container.querySelector<HTMLSpanElement>(`[data-status-for="${id}"]`)!;
        btn.disabled = true;
        statusEl.textContent = "Menyimpan...";
        statusEl.className = "ot-catatan-status";
        try {
          await updatePengukuranCatatan(id, textarea.value);
          statusEl.textContent = "Tersimpan";
          statusEl.className = "ot-catatan-status ot-catatan-ok";
        } catch (err) {
          statusEl.textContent = err instanceof Error ? err.message : "Gagal simpan";
          statusEl.className = "ot-catatan-status ot-catatan-err";
        } finally {
          btn.disabled = false;
        }
      });
    });
  } catch (err) {
    container.innerHTML = `<p class="ot-empty">Gagal memuat histori: ${
      err instanceof Error ? err.message : "unknown error"
    }</p>`;
  }
}

async function renderOrtuDetail(container: HTMLElement, ortu: OrtuSummary) {
  container.innerHTML = `<p class="ot-detail-loading">Memuat balita ${ortu.namaOrtu}...</p>`;
  try {
    const balitaList = await listBalitaByOrtu(ortu.id);
    if (balitaList.length === 0) {
      container.innerHTML = `<p class="ot-empty">Belum ada balita terdaftar untuk akun ini.</p>`;
      return;
    }
    container.innerHTML = balitaList
      .map((_, i) => `<div class="ot-balita-slot" data-index="${i}"></div>`)
      .join("");
    balitaList.forEach((b, i) => {
      const slot = container.querySelector<HTMLElement>(`[data-index="${i}"]`)!;
      renderBalitaDetail(slot, b);
    });
  } catch (err) {
    container.innerHTML = `<p class="ot-empty">Gagal memuat balita: ${
      err instanceof Error ? err.message : "unknown error"
    }</p>`;
  }
}

export async function mountOrtuTable(root: HTMLElement) {
  root.innerHTML = `<p class="ot-loading">Memuat data ortu...</p>`;

  try {
    const list = await listOrtu();

    if (list.length === 0) {
      root.innerHTML = `<p class="ot-empty">Belum ada akun ortu terdaftar.</p>`;
      return;
    }

    root.innerHTML = `
      <h2 class="section-title">Data Ortu</h2>
      <table class="ot-table">
        <thead>
          <tr>
            <th>Nama Ortu</th>
            <th>Username</th>
            <th>Total Balita</th>
            <th>Sudah Ditimbang</th>
            <th>Belum Ditimbang</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${list
            .map(
              (o, i) => `
            <tr class="${o.belumDitimbang > 0 ? "ot-row-warn" : ""}">
              <td>${o.namaOrtu}</td>
              <td>${o.username}</td>
              <td>${o.totalBalita}</td>
              <td>${o.sudahDitimbang}</td>
              <td>${o.belumDitimbang > 0 ? `<span class="ot-badge-warn">${o.belumDitimbang}</span>` : "0"}</td>
              <td><button class="ot-view-btn" data-index="${i}" type="button">Lihat</button></td>
            </tr>
            <tr class="ot-detail-row" data-detail-index="${i}" hidden>
              <td colspan="6"><div class="ot-detail-container"></div></td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    `;

    root.querySelectorAll<HTMLButtonElement>(".ot-view-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = btn.dataset.index!;
        const detailRow = root.querySelector<HTMLTableRowElement>(`[data-detail-index="${idx}"]`)!;
        const alreadyOpen = !detailRow.hidden;

        // cuma satu detail terbuka di satu waktu, biar tabel nggak kepanjangan
        root.querySelectorAll<HTMLTableRowElement>(".ot-detail-row").forEach((r) => (r.hidden = true));
        root.querySelectorAll<HTMLButtonElement>(".ot-view-btn").forEach((b) => (b.textContent = "Lihat"));

        if (alreadyOpen) return;

        detailRow.hidden = false;
        btn.textContent = "Tutup";
        const container = detailRow.querySelector<HTMLDivElement>(".ot-detail-container")!;
        renderOrtuDetail(container, list[Number(idx)]);
      });
    });
  } catch (err) {
    root.innerHTML = `<p class="ot-empty">Gagal memuat data ortu: ${
      err instanceof Error ? err.message : "unknown error"
    }</p>`;
  }
}
