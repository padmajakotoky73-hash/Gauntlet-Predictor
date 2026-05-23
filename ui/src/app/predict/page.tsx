"use client";

import { useEffect, useState } from "react";
import { api, Car, Track, PredictResult } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendingUp, Clock, AlertTriangle } from "lucide-react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";

const CONFIDENCE_BADGE: Record<string, string> = {
  LOW:    "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  MEDIUM: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  HIGH:   "bg-green-500/20 text-green-300 border-green-500/30",
};

export default function PredictPage() {
  const [cars, setCars] = useState<Car[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [carId, setCarId] = useState("");
  const [trackId, setTrackId] = useState("");
  const [result, setResult] = useState<PredictResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.getCars(), api.getTracks()])
      .then(([c, t]) => { setCars(c); setTracks(t); })
      .finally(() => setFetching(false));
  }, []);

  const run = async () => {
    if (!carId || !trackId) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const r = await api.predict(carId, trackId);
      setResult(r);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const radarData = result
    ? [
        { stat: "Top Speed",    value: Math.round(result.stat_contributions.top_speed * 100) },
        { stat: "Acceleration", value: Math.round(result.stat_contributions.acceleration * 100) },
        { stat: "Handling",     value: Math.round(result.stat_contributions.handling * 100) },
        { stat: "Nitro",        value: Math.round(result.stat_contributions.nitro * 100) },
      ]
    : [];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold">Predict</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose a car and track to get a predicted lap time.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          {fetching ? (
            <div className="space-y-3">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Car</label>
                <Select value={carId} onValueChange={v => setCarId(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a car…" />
                  </SelectTrigger>
                  <SelectContent>
                    {[...cars].sort((a, b) => a.display_name.localeCompare(b.display_name)).map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="font-medium">{c.display_name}</span>
                        <span className="ml-2 text-muted-foreground text-xs">#{c.rank} · {c.car_class}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Track</label>
                <Select value={trackId} onValueChange={v => setTrackId(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a track…" />
                  </SelectTrigger>
                  <SelectContent>
                    {[...tracks].sort((a, b) => a.display_name.localeCompare(b.display_name)).map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={run} disabled={!carId || !trackId || loading} className="w-full">
                <TrendingUp className="h-4 w-4 mr-2" />
                {loading ? "Predicting…" : "Predict"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md bg-destructive/15 text-destructive text-sm px-4 py-2 flex gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {result && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Time result */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Predicted Time</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-end gap-2">
                <Clock className="h-5 w-5 text-primary mb-1" />
                <span className="text-4xl font-bold font-mono">{result.predicted_time.toFixed(3)}</span>
                <span className="text-lg text-muted-foreground mb-0.5">s</span>
              </div>
              <div className="text-sm text-muted-foreground">
                ± {result.ci.toFixed(3)}s confidence interval
              </div>
              <div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${CONFIDENCE_BADGE[result.confidence]}`}>
                  {result.confidence} confidence
                </span>
              </div>
              <div className="pt-2 border-t border-border space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Car</span>
                  <span className="font-medium">{result.car_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Track</span>
                  <span className="font-medium text-right max-w-[60%]">{result.track_name}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stat contributions radar */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Stat Contributions</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="stat" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Radar dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} />
                </RadarChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-2">
                {result && Object.entries(result.stat_contributions).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-muted-foreground capitalize">{k.replace("_", " ")}</span>
                    <span className="font-mono">{(v * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
