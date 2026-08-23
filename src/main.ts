import { mountDashboard } from "./dashboard";
import { mountOrtuTable } from "./ortuTable";
import { mountGrowthChart } from "./growthChart";
import { mountReportPanel } from "./reportPanel";
import { mountRekapBulanan } from "./rekapBulanan";
import { DeviceDataConnection, type DeviceMode } from "./deviceData";

type SectionKey = "alat" | "ortu" | "grafik" | "rekap" | "rekap-bulanan";

const root = document.querySelector<HTMLDivElement>("#app");
if (!root) {
  throw new Error("Elemen #app tidak ditemukan di index.html");
}

root.innerHTML = `
  <div class="app-shell">
    <nav class="sidebar">
      <div class="sidebar-brand">
        <div class="sidebar-mark">
          <img src="/tambelang.jpeg" class="sidebar-logo" alt="Posyandu Tambelang">
        </div>
        <div class="sidebar-brand-text">
          <span class="sidebar-brand-name">SAKIA</span>
          <span class="sidebar-brand-tagline">Sahabat Kesehatan Ibu &amp; Anak</span>
        </div>
      </div>
      <button class="sidebar-item is-active" data-section="alat">
        <span class="sidebar-item-label">Panel Alat</span>
      </button>
      <button class="sidebar-item" data-section="ortu">
        <span class="sidebar-item-label">Data Ortu</span>
      </button>
      <button class="sidebar-item" data-section="grafik">
        <span class="sidebar-item-label">Grafik Pertumbuhan</span>
      </button>
      <button class="sidebar-item" data-section="rekap-bulanan">
        <span class="sidebar-item-label">Rekap Bulanan</span>
      </button>
      <button class="sidebar-item" data-section="rekap">
        <span class="sidebar-item-label">Rekap PDF</span>
      </button>
      <div class="sidebar-footer">Posyandu Tambelang</div>
    </nav>
    <main class="content">
      <section id="section-alat" class="content-section is-active"></section>
      <section id="section-ortu" class="content-section"></section>
      <section id="section-grafik" class="content-section"></section>
      <section id="section-rekap-bulanan" class="content-section"></section>
      <section id="section-rekap" class="content-section"></section>
    </main>
  </div>
`;

const navButtons = root.querySelectorAll<HTMLButtonElement>(".sidebar-item");
const sections: Record<SectionKey, HTMLElement> = {
  alat: root.querySelector("#section-alat")!,
  ortu: root.querySelector("#section-ortu")!,
  grafik: root.querySelector("#section-grafik")!,
  "rekap-bulanan": root.querySelector("#section-rekap-bulanan")!,
  rekap: root.querySelector("#section-rekap")!,
};

// Panel alat langsung jalan & tetap hidup di background walau tab lain
// aktif -> QR & live readout nggak boleh putus cuma karena kader lagi
// buka tab lain di sidebar.
const DEFAULT_RELAY_URL: string | undefined = import.meta.env.VITE_RELAY_URL;
const mode: DeviceMode = DEFAULT_RELAY_URL ? "live" : "simulated";
const connection = new DeviceDataConnection(mode, DEFAULT_RELAY_URL);
mountDashboard(sections.alat, connection, mode);
connection.start();

// Section lain di-refetch tiap kali dibuka (bukan sekali di awal), soalnya
// datanya bisa berubah sejak terakhir kader buka tab itu.
function activate(key: SectionKey) {
  navButtons.forEach((btn) => btn.classList.toggle("is-active", btn.dataset.section === key));
  (Object.keys(sections) as SectionKey[]).forEach((k) =>
    sections[k].classList.toggle("is-active", k === key)
  );

  if (key === "ortu") mountOrtuTable(sections.ortu);
  if (key === "grafik") mountGrowthChart(sections.grafik);
  if (key === "rekap-bulanan") mountRekapBulanan(sections["rekap-bulanan"]);
  if (key === "rekap") mountReportPanel(sections.rekap);
}

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => activate(btn.dataset.section as SectionKey));
});
