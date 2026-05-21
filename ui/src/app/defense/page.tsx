"use client";

import { useEffect, useState } from "react";
import { api, Track, DefenseResult } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Shield, Clock, AlertTriangle } from "lucide-react";

const CONFIDENCE_COLOR: Record<string, string> = {
  LOW:    "text-yellow-400",
  MEDIUM: "text-blue-400",
  HIGH:   "text-green-400",
};

const SLOTS = 5;

export default function DefensePage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selected, setSelected] = useState<string[]>(Array(SLOTS).fill(""));
  const [result, setResult] = useState<DefenseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getTracks().then(setTracks).finally(() => setFetching(false));
  }, []);

  const setSlot = (i: number, val: string | null) => {
    setSelected(prev => prev.map((s, idx) => (idx === i ? (val ?? "") : s)));
  };

  const ready = selected.every(s => s !== "");

  const run = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const r = await api.defense(selected);
      setResult(r);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold">Defense Optimizer</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Pick 5 Gauntlet tracks and get the optimal car assignment.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select 5 Tracks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {fetching ? (
            [...Array(5)].map((_, i) => <Skeleton key={i} className="h-9 w-full" />)
          ) : (
            <>
              {[...Array(SLOTS)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-6 text-center text-sm text-muted-foreground font-medium">
                    {i + 1}
                  </span>
                  <Select value={selected[i]} onValueChange={v => setSlot(i, v)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder={`Track ${i + 1}…`} />
                    </SelectTrigger>
                    <SelectContent>
                      {tracks.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}

              <Button
                className="w-full mt-2"
                disabled={!ready || loading}
                onClick={run}
              >
                <Shield className="h-4 w-4 mr-2" />
                {loading ? "Optimizing…" : "Optimize Lineup"}
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
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Optimal Lineup</CardTitle>
              <div className="flex items-center gap-1.5 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono font-bold">{result.total_time.toFixed(3)}s</span>
                <span className="text-muted-foreground">total</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-0 p-0">
            {result.assignments.map((a, i) => (
              <div key={a.track_id}>
                {i > 0 && <Separator />}
                <div className="px-6 py-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{a.track_name}</p>
                    <p className="font-semibold mt-0.5">{a.car_name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono font-bold">{a.predicted_time.toFixed(3)}s</p>
                    <p className="text-xs text-muted-foreground">± {a.ci.toFixed(3)}s</p>
                    <span className={`text-xs font-semibold ${CONFIDENCE_COLOR[a.confidence]}`}>
                      {a.confidence}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
          {result.warnings.length > 0 && (
            <div className="px-6 pb-4">
              <Separator className="mb-3" />
              <div className="space-y-1">
                {result.warnings.map(w => (
                  <div key={w} className="flex gap-2 text-xs text-yellow-400">
                    <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                    {w} has LOW confidence (&lt; 3 samples)
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
