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
import { Shield, AlertTriangle, X } from "lucide-react";

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

  const sortedTracks = [...tracks].sort((a, b) => a.display_name.localeCompare(b.display_name));

  // Selected Track objects in slot order (non-empty only)
  const selectedTracks = selected
    .filter(id => id !== "")
    .map(id => tracks.find(t => t.id === id))
    .filter((t): t is Track => t !== undefined);

  const setSlot = (i: number, val: string | null) => {
    setSelected(prev => prev.map((s, idx) => (idx === i ? (val ?? "") : s)));
    setResult(null);
  };

  const removeTrack = (id: string) => {
    setSelected(prev => prev.map(s => (s === id ? "" : s)));
    setResult(null);
  };

  const run = async () => {
    if (selectedTracks.length !== 5) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      // Send the 5 non-empty slot IDs in slot order
      const ids = selected.filter(id => id !== "");
      const r = await api.defense(ids);
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
        <CardContent className="space-y-4">
          {fetching ? (
            [...Array(5)].map((_, i) => <Skeleton key={i} className="h-9 w-full" />)
          ) : (
            <>
              {/* Chip strip */}
              <div className={`flex flex-wrap gap-2 p-3 rounded-lg border transition-colors ${
                selectedTracks.length === 5
                  ? "border-emerald-700/50 bg-emerald-950/20"
                  : selectedTracks.length > 0
                    ? "border-zinc-800 bg-zinc-900/50"
                    : "border-transparent"
              }`}>
                {selectedTracks.length === 0 && (
                  <span className="text-sm text-zinc-500">Pick 5 tracks below to optimize a defense lineup.</span>
                )}
                {selectedTracks.map(t => (
                  <button
                    key={t.id}
                    onClick={() => removeTrack(t.id)}
                    className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors"
                  >
                    <span className="text-sm text-zinc-100">{t.display_name}</span>
                    <X className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-100" />
                  </button>
                ))}
              </div>

              {/* 5 slot selects */}
              <div className="space-y-2">
                {[...Array(SLOTS)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-6 text-center text-sm text-muted-foreground font-medium shrink-0">
                      {i + 1}
                    </span>
                    <Select value={selected[i]} onValueChange={v => setSlot(i, v)}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder={`Track ${i + 1}…`} />
                      </SelectTrigger>
                      <SelectContent>
                        {sortedTracks.map(t => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.display_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {/* Count-aware Optimize button */}
              <Button
                onClick={run}
                disabled={selectedTracks.length !== 5 || loading}
                className="w-full"
              >
                <Shield className="h-4 w-4 mr-2" />
                {loading
                  ? "Optimizing…"
                  : selectedTracks.length === 5
                    ? "Optimize Lineup"
                    : <>Pick <span className="font-mono mx-1">{5 - selectedTracks.length}</span> more</>
                }
              </Button>

              {/* Inline chip-pair results */}
              {result && (
                <div className="space-y-2 mt-2 pt-6 border-t border-zinc-800">
                  <h3 className="text-sm text-zinc-400 mb-3">Optimal lineup</h3>
                  {result.assignments.map(a => (
                    <div key={a.track_id} className="flex items-center gap-3">
                      <div className="flex-1 px-3 py-1.5 rounded-full bg-zinc-800 border border-zinc-700 min-w-0">
                        <span className="text-sm text-zinc-100 truncate block">{a.track_display_name}</span>
                      </div>
                      <span className="text-zinc-600 shrink-0">→</span>
                      <div className="flex-1 px-3 py-1.5 rounded-full bg-zinc-800 border border-emerald-700/50 min-w-0">
                        <span className="text-sm text-zinc-100">{a.car_display_name}</span>
                        <span className="font-mono text-xs text-zinc-500 ml-2 tabular-nums">
                          {a.predicted_time.toFixed(3)}s
                        </span>
                      </div>
                    </div>
                  ))}
                  {result.warnings.length > 0 && (
                    <div className="space-y-1 pt-2">
                      {result.warnings.map(w => (
                        <div key={w} className="flex gap-2 text-xs text-yellow-400">
                          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                          {w} has LOW confidence (&lt; 3 samples)
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
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
    </div>
  );
}
