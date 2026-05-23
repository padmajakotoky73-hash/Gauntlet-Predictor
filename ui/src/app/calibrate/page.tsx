"use client";

import { useEffect, useState } from "react";
import { api, Car, Track, CalibrationStatus, RaceLog } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// ── Bucket config ──────────────────────────────────────────────────────────

interface Bucket {
  key: string;
  label: string;
  description: string;
  badgeClass: string;
  filter: (t: CalibrationStatus) => boolean;
  alwaysShow: boolean;
}

const BUCKETS: Bucket[] = [
  {
    key: "no_data",
    label: "No Data",
    description: "Tracks with zero logged runs. Run a race and log it to start building data.",
    badgeClass: "bg-zinc-700 text-zinc-300 border-0",
    filter: t => t.run_count === 0,
    alwaysShow: true,
  },
  {
    key: "building",
    label: "Building",
    description: "Tracks with some data but not yet calibrated. Need at least 5 logged runs.",
    badgeClass: "bg-amber-600 text-amber-50 border-0",
    filter: t => t.run_count > 0 && t.run_count < 5,
    alwaysShow: false,
  },
  {
    key: "calibrated",
    label: "Calibrated",
    description: "Tracks with calibrated β values. Predictions here are most reliable.",
    badgeClass: "bg-emerald-600 text-emerald-50 border-0",
    filter: t => t.run_count >= 5,
    alwaysShow: false,
  },
];

// ── CalibrationRow ─────────────────────────────────────────────────────────

function CalibrationRow({ track }: { track: CalibrationStatus }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded hover:bg-zinc-800/50 transition-colors">
      <span className="text-sm text-zinc-100">{track.display_name}</span>
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs text-zinc-500 tabular-nums">
          {track.run_count} run{track.run_count === 1 ? "" : "s"}
        </span>
        {track.last_calibrated && (
          <span className="font-mono text-xs text-zinc-500">
            {formatDistanceToNow(new Date(track.last_calibrated), { addSuffix: true })}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function CalibratePage() {
  const [cars, setCars] = useState<Car[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [status, setStatus] = useState<CalibrationStatus[]>([]);
  const [logs, setLogs] = useState<RaceLog[]>([]);
  const [fetching, setFetching] = useState(true);

  const [carId, setCarId] = useState("");
  const [trackId, setTrackId] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitResult, setSubmitResult] = useState<string>("");
  const [error, setError] = useState("");

  const load = async () => {
    const [c, t, s, l] = await Promise.all([
      api.getCars(),
      api.getTracks(),
      api.calibrationStatus(),
      api.getLogs(30),
    ]);
    setCars(c);
    setTracks(t);
    setStatus(s);
    setLogs(l);
  };

  useEffect(() => {
    load().finally(() => setFetching(false));
  }, []);

  const handleLog = async () => {
    if (!carId || !trackId || !time) return;
    setSaving(true);
    setError("");
    setSubmitResult("");
    try {
      const r = await api.logRun({
        car_id: carId,
        track_id: trackId,
        actual_time_sec: parseFloat(time),
        notes,
      });
      const errStr = `${r.error >= 0 ? "+" : ""}${r.error.toFixed(3)}`;
      setSubmitResult(
        `Logged! Actual: ${r.actual.toFixed(3)}s · Predicted: ${r.predicted.toFixed(3)}s · Error: ${errStr}s · Beta: ${r.beta_updated.toFixed(3)}${r.weights_refitted ? " · Weights refitted!" : ""}`
      );
      setTime("");
      setNotes("");
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold">Log & Calibrate</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Log actual race times to calibrate predictions. Weights refit after 8 samples per track.
        </p>
      </div>

      {/* Log a race form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Log a Race
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {fetching ? (
            [...Array(4)].map((_, i) => <Skeleton key={i} className="h-9 w-full" />)
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Car</Label>
                  <Select value={carId} onValueChange={v => setCarId(v ?? "")}>
                    <SelectTrigger><SelectValue placeholder="Select car…" /></SelectTrigger>
                    <SelectContent>
                      {[...cars].sort((a, b) => a.display_name.localeCompare(b.display_name)).map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.display_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Track</Label>
                  <Select value={trackId} onValueChange={v => setTrackId(v ?? "")}>
                    <SelectTrigger><SelectValue placeholder="Select track…" /></SelectTrigger>
                    <SelectContent>
                      {[...tracks].sort((a, b) => a.display_name.localeCompare(b.display_name)).map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.display_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Actual Time (seconds)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="e.g. 28.415"
                    value={time}
                    onChange={e => setTime(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Notes (optional)</Label>
                  <Input
                    placeholder="e.g. perfect nitro launch"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <Button
                className="w-full sm:w-auto"
                disabled={!carId || !trackId || !time || saving}
                onClick={handleLog}
              >
                {saving ? "Saving…" : "Log Race"}
              </Button>

              {submitResult && (
                <div className="text-xs text-green-400 bg-green-500/10 rounded px-3 py-2">
                  {submitResult}
                </div>
              )}
              {error && (
                <div className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2">
                  {error}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Calibration status — grouped by bucket */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Calibration Status</h3>
        {fetching ? (
          [...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)
        ) : (
          BUCKETS.map(bucket => {
            const bucketTracks = [...status]
              .filter(bucket.filter)
              .sort((a, b) => a.display_name.localeCompare(b.display_name));

            if (!bucket.alwaysShow && bucketTracks.length === 0) return null;

            return (
              <Card key={bucket.key}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-zinc-100 text-base">{bucket.label}</span>
                    <Badge className={bucket.badgeClass}>{bucketTracks.length}</Badge>
                  </CardTitle>
                  <CardDescription className="text-zinc-400">{bucket.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1 pt-0">
                  {bucketTracks.length === 0 ? (
                    <p className="text-sm text-zinc-600 px-3 py-2">No tracks in this group yet.</p>
                  ) : (
                    bucketTracks.map(t => <CalibrationRow key={t.id} track={t} />)
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Recent race logs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Race Logs</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {fetching ? (
            <div className="p-6 space-y-2">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No race logs yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Track</TableHead>
                  <TableHead>Car</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Predicted</TableHead>
                  <TableHead className="text-right">Error</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log, i) => {
                  const err = log.actual_time_sec - log.predicted_time_sec;
                  const track = tracks.find(t => t.id === log.track_id);
                  const car   = cars.find(c => c.id === log.car_id);
                  return (
                    <TableRow key={i}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                      </TableCell>
                      <TableCell className="text-sm max-w-[160px] truncate">
                        {track?.display_name ?? log.track_id}
                      </TableCell>
                      <TableCell className="text-sm max-w-[120px] truncate">
                        {car?.display_name ?? log.car_id}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{log.actual_time_sec.toFixed(3)}s</TableCell>
                      <TableCell className="text-right font-mono text-sm text-muted-foreground">{log.predicted_time_sec.toFixed(3)}s</TableCell>
                      <TableCell className={`text-right font-mono text-sm ${err > 0 ? "text-red-400" : "text-green-400"}`}>
                        {err >= 0 ? "+" : ""}{err.toFixed(3)}s
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{log.notes}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
