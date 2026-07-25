import type { DeviceSnapshot } from "./types/sensor";
import type { DeviceDataConnection, DeviceMode } from "./deviceData";
import QRCode from "qrcode";

// Sama dengan DATA_INTERVAL di firmware TFT lama: QR tidak perlu di-refresh
// tiap ada pembacaan sensor baru (200ms), cukup berkala biar tidak flicker
// terus-terusan padahal cuma noise kecil dari load cell / ultrasonic.
const QR_REFRESH_INTERVAL_MS = 5000;

function fmt(value: number | null, digits: number, unit: string): string {
  return value === null ? "N/A" : `${value.toFixed(digits)} ${unit}`;
}

// Payload QR persis sama format yang dibaca parseQRPayload() di aplikasi
// Android: { "bb": number, "tb": number }.
function buildQrPayload(bb: number, tb: number): string {
  return JSON.stringify({ bb, tb });
}

// connection dibuat & di-start() oleh main.ts, lalu dibagi ke mountDashboard
// dan mountBalitaPanel sekaligus -> keduanya lihat snapshot alat yang sama
// persis, tanpa perlu dua koneksi WebSocket terpisah ke relay server.
export function mountDashboard(root: HTMLElement, connection: DeviceDataConnection, mode: DeviceMode) {
  root.innerHTML = `
    <div class="fw-dash">
      <header class="fw-titlebar">
        <div class="fw-titlebar-left">
          <span class="fw-plate">KMS-01</span>
          <h1>Aplikasi KIA Digital</h1>
        </div>
        <div id="fw-conn" class="fw-conn is-offline">
          <span class="fw-conn-dot"></span>
          <span id="fw-conn-text">Mode simulasi</span>
        </div>
      </header>

      <div class="fw-grid">
        <section class="fw-panel fw-panel-databayi">
          <h2>Data Bayi</h2>
          <div class="fw-readout-row">
            <span class="fw-readout-label">Berat badan</span>
            <span id="fw-bb" class="fw-readout-value">-</span>
          </div>
          <div class="fw-readout-row">
            <span class="fw-readout-label">Tinggi badan</span>
            <span id="fw-tb" class="fw-readout-value">-</span>
          </div>
          <p class="fw-hint">Scan QR code di app KMS untuk melihat status gizi lengkap.</p>
        </section>

        <section class="fw-panel fw-panel-qr">
          <h2>QR Code</h2>
          <div class="fw-qr-wrap">
            <canvas id="fw-qr-canvas"></canvas>
          </div>
        </section>
      </div>
    </div>
  `;

  const connEl = root.querySelector<HTMLDivElement>("#fw-conn")!;
  const connText = root.querySelector<HTMLSpanElement>("#fw-conn-text")!;
  const qrCanvas = root.querySelector<HTMLCanvasElement>("#fw-qr-canvas")!;

  let lastQrAt = 0;
  let lastQrPayload = "";

  function refreshQrIfDue(snap: DeviceSnapshot) {
    const now = Date.now();
    if (now - lastQrAt < QR_REFRESH_INTERVAL_MS) return;

    const payload = buildQrPayload(snap.bb, snap.tb);
    if (payload === lastQrPayload) {
      lastQrAt = now;
      return;
    }

    lastQrAt = now;
    lastQrPayload = payload;

    QRCode.toCanvas(qrCanvas, payload, { width: 200, margin: 1 }).catch((err: unknown) => {
      console.error("Gagal generate QR code:", err);
    });
  }

  function render(snap: DeviceSnapshot) {
    connEl.className = `fw-conn ${snap.connected ? "is-online" : "is-offline"}`;
    connText.textContent =
      mode === "simulated"
        ? "Mode simulasi"
        : snap.connected
          ? "Perangkat terhubung"
          : "Perangkat terputus";

    root.querySelector("#fw-bb")!.textContent = fmt(snap.bb, 1, "kg");
    root.querySelector("#fw-tb")!.textContent = fmt(snap.tb, 1, "cm");

    refreshQrIfDue(snap);
  }

  connection.subscribe(render);
}
