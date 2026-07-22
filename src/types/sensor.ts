// Tipe data ini mengikuti struktur payload yang dikirim firmware ESP32
// (HX711 load cell -> bb & gram, HC-SR04 -> tb) lewat relay server (server.ts).
//
// Catatan: klasifikasi status gizi (Normal/Kurang/Lebih dsb) TIDAK dihitung
// di sini. Itu dihitung di aplikasi Android terpisah, yang butuh data
// tambahan (usia, jenis kelamin) di luar apa yang diukur alat ini.
// Dashboard web ini murni menampilkan data mentah bb/tb secara real-time.

export interface DeviceSnapshot {
  timestamp: Date;
  bb: number;          // berat badan, kg
  tb: number;           // tinggi badan, cm
  gram: number | null;  // berat mentah dari load cell (opsional, buat debug/UI tambahan)
  level: number | null; // persentase 0-100 terhadap kalibrasi load cell (opsional)
  connected: boolean;   // status koneksi ke relay server
}
