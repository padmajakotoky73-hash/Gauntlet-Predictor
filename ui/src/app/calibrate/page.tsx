"use client";

import { useEffect, useState } from "react";
import { api, Car, Track, CalibrationStatus, RaceLog } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
import { Activity, CheckCircle2, AlertTriangle, CircleDot } from "lucide-react";

const CONFIDENCE_COLOR: Record<string, string> = {
  LOW:    "text-yellow-400",
  MEDIUM: "text-blue-400",
  HIGH:   "text-green-400",
};

const CONFIDENCE_ICON: Record<string, React.ReactNode> = {
  LOW:    <AlertTriangle className="h-3.5 w-3.5 text-yellow-400" />,
  MEDIUM: <CircleDot className="h-3.5 w-3.5 text-blue-400" />,
  HIGH:   <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />,
};

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

  const totalSamples = status.reduce((s, t) => s + t.sample_count, 0);
  const highConf = status.filter(t => t.confidence === "HIGH").length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold">Log & Calibrate</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Log actual race times to calibrate predictions. Weights refit after 8 samples per track.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Log form */}
        <Card className="lg:col-span-1">
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
                <div className="space-y-1.5">
                  <Label>Car</Label>
                  <Select value={carId} onValueChange={v => setCarId(v ?? "")}>
                    <SelectTrigger><SelectValue placeholder="Select car…" /></SelectTrigger>
                    <SelectContent>
                      {cars.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Track</Label>
                  <Select value={trackId} onValueChange={v => setTrackId(v ?? "")}>
                    <SelectTrigger><SelectValue placeholder="Select track…" /></SelectTrigger>
                    <SelectContent>
                      {tracks.map(t => <SelectItem key={t.id} value={t.id}>{t.display_name}</SelectItem>)}
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

                <Button
                  className="w-full"
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

        {/* Calibration status */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Calibration Status</CardTitle>
              <div className="text-xs text-muted-foreground">
                {totalSamples} total samples · {highConf} / {status.length} tracks HIGH
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {fetching ? (
              <div className="p-6 space-y-2">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto">
                {status.map(t => (
                  <div key={t.id} className="flex items-center gap-3 px-6 py-2.5 hover:bg-muted/30">
                    <span className="shrink-0">{CONFIDENCE_ICON[t.confidence]}</span>
                    <span className="flex-1 text-sm truncate">{t.display_name}</span>
                    <div className="w-28 shrink-0">
                      <Progress
                        value={Math.min((t.sample_count / 8) * 100, 100)}
                        className="h-1.5"
                      />
                    </div>
                    <span className="text-xs font-mono text-muted-foreground w-12 text-right">
                      {t.sample_count}/8
                    </span>
                    <span className={`text-xs font-semibold w-14 text-right ${CONFIDENCE_COLOR[t.confidence]}`}>
                      {t.confidence}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent logs */}
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
                  const car = cars.find(c => c.id === log.car_id);
                  return (
                    <TableRow key={i}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                      </TableCell>
                      <TableCell className="text-sm max-w-[160px] truncate">
                        {track?.display_name ?? log.track_id}
                      </TableCell>
                      <TableCell className="text-sm max-w-[120px] truncate">
                        {car?.name ?? log.car_id}
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
