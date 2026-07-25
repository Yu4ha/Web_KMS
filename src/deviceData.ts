import type { DeviceSnapshot } from "./types/sensor";

const SIMULATED_INTERVAL_MS = 1000;
const POLL_INTERVAL_MS = 2000; // fallback jika WebSocket gagal
const POLL_TIMEOUT_MS = 5000;
const WS_RECONNECT_DELAY_MS = 2000;

export type DeviceMode = "simulated" | "live";
export type SnapshotListener = (snapshot: DeviceSnapshot) => void;

// Bentuk respons dari relay server (GET /api/status dan pesan WS /ws)
interface ApiStatusResponse {
  timestamp: string;
  bb: number;
  tb: number;
  gram: number | null;
  level: number | null;
  connected?: boolean;
}

function initialSnapshot(): DeviceSnapshot {
  return {
    timestamp: new Date(),
    bb: 3.8,
    tb: 53.4,
    level: 0,
    connected: false,
  };
}

function toSnapshot(data: ApiStatusResponse, connectedFallback: boolean): DeviceSnapshot {
  return {
    timestamp: new Date(data.timestamp),
    bb: data.bb,
    tb: data.tb,
    level: data.level,
    connected: data.connected ?? connectedFallback,
  };
}

// Simulasi drift kecil di sekitar nilai bb/tb terakhir, dipakai mode "simulated"
// (dev/demo tanpa alat fisik menyala). Bukan representasi pertumbuhan asli.
function simulateDrift(prev: number, maxDrift: number, min: number, max: number): number {
  const drift = (Math.random() - 0.5) * maxDrift;
  const next = prev + drift;
  return Math.min(max, Math.max(min, next));
}

/**
 * Mengelola koneksi data device (simulasi atau live ke relay server) dan
 * memanggil listener setiap kali ada snapshot baru. Pengganti hook React
 * useDeviceData, dipakai lewat subscribe()/start()/stop().
 */
export class DeviceDataConnection {
  private mode: DeviceMode;
  private baseUrl: string | undefined;
  private listeners = new Set<SnapshotListener>();
  private snapshot: DeviceSnapshot = initialSnapshot();

  private simInterval: ReturnType<typeof setInterval> | null = null;
  private bbRef = 3.8;
  private tbRef = 53.4;

  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private usingPollFallback = false;
  private stopped = false;

  constructor(mode: DeviceMode, baseUrl?: string) {
    this.mode = mode;
    this.baseUrl = baseUrl;
  }

  getSnapshot(): DeviceSnapshot {
    return this.snapshot;
  }

  subscribe(listener: SnapshotListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot); // langsung kasih snapshot terakhir saat subscribe
    return () => this.listeners.delete(listener);
  }

  private emit(snapshot: DeviceSnapshot) {
    this.snapshot = snapshot;
    this.listeners.forEach((l) => l(snapshot));
  }

  start() {
    this.stopped = false;
    if (this.mode === "simulated") {
      this.startSimulated();
    } else if (this.baseUrl) {
      this.startLive(this.baseUrl);
    }
  }

  stop() {
    this.stopped = true;
    if (this.simInterval) clearInterval(this.simInterval);
    this.simInterval = null;

    this.ws?.close();
    this.ws = null;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = null;
    this.usingPollFallback = false;
  }

  private startSimulated() {
    this.emit({ ...this.snapshot, connected: true });

    this.simInterval = setInterval(() => {
      this.bbRef = simulateDrift(this.bbRef, 0.02, 0, 15);
      this.tbRef = simulateDrift(this.tbRef, 0.1, 30, 100);

      this.emit({
        timestamp: new Date(),
        bb: Math.round(this.bbRef * 10) / 10,
        tb: Math.round(this.tbRef * 10) / 10,
        level: Math.round((this.bbRef / 15) * 100),
        connected: true,
      });
    }, SIMULATED_INTERVAL_MS);
  }

  private startLive(baseUrl: string) {
    const pollOnce = async () => {
      try {
        const res = await fetch(`${baseUrl}/api/status`, {
          signal: AbortSignal.timeout(POLL_TIMEOUT_MS),
          headers: {
            "ngrok-skip-browser-warning": "true",
          },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: ApiStatusResponse = await res.json();
        if (this.stopped) return;
        this.emit(toSnapshot(data, true));
      } catch {
        if (this.stopped) return;
        this.emit({ ...this.snapshot, connected: false });
      }
    };

    const startPollFallback = () => {
      if (this.usingPollFallback) return;
      this.usingPollFallback = true;
      pollOnce();
      this.pollTimer = setInterval(pollOnce, POLL_INTERVAL_MS);
    };

    const stopPollFallback = () => {
      this.usingPollFallback = false;
      if (this.pollTimer) clearInterval(this.pollTimer);
      this.pollTimer = null;
    };

    const connectWs = () => {
      if (this.stopped) return;

      const wsUrl = `${baseUrl.replace(/^http/, "ws")}/ws`;
      const ws = new WebSocket(wsUrl);
      this.ws = ws;

      ws.onopen = () => stopPollFallback();

      ws.onmessage = (event) => {
        if (this.stopped) return;
        try {
          const data: ApiStatusResponse = JSON.parse(event.data);
          this.emit(toSnapshot(data, true));
        } catch {
          // abaikan pesan yang tidak valid
        }
      };

      ws.onerror = () => ws.close();

      ws.onclose = () => {
        if (this.stopped) return;
        startPollFallback();
        this.reconnectTimer = setTimeout(connectWs, WS_RECONNECT_DELAY_MS);
      };
    };

    connectWs();
    startPollFallback();
  }
}
