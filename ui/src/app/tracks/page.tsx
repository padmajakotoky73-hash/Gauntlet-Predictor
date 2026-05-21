"use client";

import { useEffect, useState } from "react";
import { api, Track } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";

const PROFILE_LABEL: Record<string, string> = {
  pure_straight:    "Straight",
  highway_with_turns: "Highway",
  mixed_circuit:    "Mixed",
  twisty_city:      "Twisty City",
  twisty_off_road:  "Twisty Off-road",
  jump_heavy:       "Jump Heavy",
  tunnel_tight:     "Tunnel",
};

const PROFILE_COLOR: Record<string, string> = {
  pure_straight:    "bg-blue-500/20 text-blue-300",
  highway_with_turns: "bg-cyan-500/20 text-cyan-300",
  mixed_circuit:    "bg-violet-500/20 text-violet-300",
  twisty_city:      "bg-orange-500/20 text-orange-300",
  twisty_off_road:  "bg-amber-500/20 text-amber-300",
  jump_heavy:       "bg-red-500/20 text-red-300",
  tunnel_tight:     "bg-emerald-500/20 text-emerald-300",
};

function StatBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 35 ? "bg-primary" : pct >= 25 ? "bg-blue-500" : "bg-muted-foreground/40";
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-8 shrink-0 text-muted-foreground">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right font-mono">{pct}%</span>
    </div>
  );
}

export default function TracksPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.getTracks().then(setTracks).finally(() => setLoading(false));
  }, []);

  const filtered = tracks.filter(t =>
    t.display_name.toLowerCase().includes(search.toLowerCase()) ||
    t.location.toLowerCase().includes(search.toLowerCase()) ||
    t.profile.toLowerCase().includes(search.toLowerCase())
  );

  const locations = [...new Set(tracks.map(t => t.location))].sort();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Track Browser</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {tracks.length} tracks across {locations.length} locations
          </p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search tracks…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(9)].map((_, i) => <Skeleton key={i} className="h-44 rounded-lg" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(track => (
            <Card key={track.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm font-semibold leading-snug">
                    {track.display_name}
                  </CardTitle>
                  <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${PROFILE_COLOR[track.profile] ?? "bg-muted text-muted-foreground"}`}>
                    {PROFILE_LABEL[track.profile] ?? track.profile}
                  </span>
                </div>
                <div className="flex gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">{track.location}</span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">{track.track_length}</span>
                  {track.sample_count > 0 && (
                    <>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{track.sample_count} sample{track.sample_count !== 1 ? "s" : ""}</span>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-1.5 pt-0">
                <StatBar label="TS" value={track.w_top_speed} />
                <StatBar label="Ac" value={track.w_acceleration} />
                <StatBar label="Ha" value={track.w_handling} />
                <StatBar label="Ni" value={track.w_nitro} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {!loading && filtered.length === 0 && (
        <div className="text-center text-muted-foreground py-16">No tracks match your search.</div>
      )}
    </div>
  );
}
