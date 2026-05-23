const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── Types ──────────────────────────────────────────────────────────────────

export interface Track {
  id: string;
  display_name: string;
  location: string;
  w_top_speed: number;
  w_acceleration: number;
  w_handling: number;
  w_nitro: number;
  par_time_sec: number;
  par_car_score: number;
  beta: number;
  sample_count: number;
  profile: string;
  track_length: string;
}

export interface Car {
  id: string;
  name: string;
  display_name: string;
  overall_score: number;
  rank: number;
  car_class: string;
  top_speed: number;
  acceleration: number;
  handling: number;
  nitro: number;
  n_top_speed: number;
  n_acceleration: number;
  n_handling: number;
  n_nitro: number;
}

export interface CarInput {
  name: string;
  rank: number;
  car_class: string;
  top_speed: number;
  acceleration: number;
  handling: number;
  nitro: number;
}

export interface CarUpdate {
  top_speed?: number;
  acceleration?: number;
  handling?: number;
  nitro?: number;
}

export interface PredictResult {
  car_name: string;
  track_name: string;
  predicted_time: number;
  ci: number;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  stat_contributions: {
    top_speed: number;
    acceleration: number;
    handling: number;
    nitro: number;
  };
}

export interface DefenseAssignment {
  track_id: string;
  track_name: string;
  track_display_name: string;
  car_id: string;
  car_name: string;
  car_display_name: string;
  predicted_time: number;
  ci: number;
  confidence: "LOW" | "MEDIUM" | "HIGH";
}

export interface DefenseResult {
  assignments: DefenseAssignment[];
  total_time: number;
  warnings: string[];
}

export interface RaceLog {
  timestamp: string;
  track_id: string;
  car_id: string;
  actual_time_sec: number;
  predicted_time_sec: number;
  notes: string;
}

export interface LogResult {
  actual: number;
  predicted: number;
  error: number;
  beta_updated: number;
  weights_refitted: boolean;
}

export interface CalibrationStatus {
  id: string;
  display_name: string;
  sample_count: number;
  run_count: number;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  last_calibrated: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function put<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function del<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── API functions ──────────────────────────────────────────────────────────

export const api = {
  getTracks: () => get<Track[]>("/tracks"),
  getCars:   () => get<Car[]>("/cars"),
  addCar:    (data: CarInput) => post<Car>("/cars", data),
  updateCar: (id: string, data: CarUpdate) => put<Car>(`/cars/${id}`, data),
  deleteCar: (id: string) => del<{ ok: boolean }>(`/cars/${id}`),
  predict:   (carId: string, trackId: string) =>
    get<PredictResult>(`/predict?car_id=${carId}&track_id=${trackId}`),
  defense:   (trackIds: string[]) =>
    post<DefenseResult>("/defense", { track_ids: trackIds }),
  getLogs:   (limit = 20) => get<RaceLog[]>(`/logs?limit=${limit}`),
  logRun:    (data: { car_id: string; track_id: string; actual_time_sec: number; notes?: string }) =>
    post<LogResult>("/log", data),
  calibrationStatus: () => get<CalibrationStatus[]>("/calibration-status"),
};
