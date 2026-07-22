import "./style.css";
import { mountDashboard } from "./dashboard";
import { mountOrtuTable } from "./ortuTable";
import { mountGrowthChart } from "./growthChart";
import { mountReportPanel } from "./reportPanel";
import { DeviceDataConnection, type DeviceMode } from "./deviceData";

type SectionKey = "alat" | "ortu" | "grafik" | "rekap";

const root = document.querySelector<HTMLDivElement>("#app");
if (!root) {
  throw new Error("Elemen #app tidak ditemukan di index.html");
}

root.innerHTML = `
  <div class="app-shell">
    <nav class="sidebar">
      <div class="sidebar-brand">
        <img src="../src/assets/tambelang.jpeg" class="sidebar-logo" alt="Logo Posyandu Tambelang" />
        <span class="sidebar-brand-name">Posyandu Tambelang</span>
      </div>
      <button class="sidebar-item is-active" data-section="alat">Panel Alat</button>
      <button class="sidebar-item" data-section="ortu">Data Ortu</button>
      <button class="sidebar-item" data-section="grafik">Grafik Pertumbuhan</button>
      <button class="sidebar-item" data-section="rekap">Rekap PDF</button>
    </nav>
    <main class="content">
      <section id="section-alat" class="content-section is-active"></section>
      <section id="section-ortu" class="content-section"></section>
      <section id="section-grafik" class="content-section"></section>
      <section id="section-rekap" class="content-section"></section>
    </main>
  </div>
`;

const navButtons = root.querySelectorAll<HTMLButtonElement>(".sidebar-item");
const sections: Record<SectionKey, HTMLElement> = {
  alat: root.querySelector("#section-alat")!,
  ortu: root.querySelector("#section-ortu")!,
  grafik: root.querySelector("#section-grafik")!,
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

// 3 section lain di-refetch tiap kali dibuka (bukan sekali di awal), soalnya
// datanya bisa berubah sejak terakhir kader buka tab itu.
function activate(key: SectionKey) {
  navButtons.forEach((btn) => btn.classList.toggle("is-active", btn.dataset.section === key));
  (Object.keys(sections) as SectionKey[]).forEach((k) =>
    sections[k].classList.toggle("is-active", k === key)
  );

  if (key === "ortu") mountOrtuTable(sections.ortu);
  if (key === "grafik") mountGrowthChart(sections.grafik);
  if (key === "rekap") mountReportPanel(sections.rekap);
}

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => activate(btn.dataset.section as SectionKey));
});
