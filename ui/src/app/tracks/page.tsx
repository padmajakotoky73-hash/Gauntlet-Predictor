"use client";

import { useEffect, useState } from "react";
import { api, Track } from "@/lib/api";
import { STAT_KEYS, STAT_LABELS, STAT_COLORS } from "@/lib/stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";

const PROFILE_LABEL: Record<string, string> = {
  pure_straight:      "Straight",
  highway_with_turns: "Highway",
  mixed_circuit:      "Mixed",
  twisty_city:        "Twisty City",
  twisty_off_road:    "Twisty Off-road",
  jump_heavy:         "Jump Heavy",
  tunnel_tight:       "Tunnel",
};

const PROFILE_COLOR: Record<string, string> = {
  pure_straight:      "bg-blue-500/20 text-blue-300",
  highway_with_turns: "bg-cyan-500/20 text-cyan-300",
  mixed_circuit:      "bg-violet-500/20 text-violet-300",
  twisty_city:        "bg-orange-500/20 text-orange-300",
  twisty_off_road:    "bg-amber-500/20 text-amber-300",
  jump_heavy:         "bg-red-500/20 text-red-300",
  tunnel_tight:       "bg-emerald-500/20 text-emerald-300",
};

const TRACK_WEIGHT: Record<string, (t: Track) => number> = {
  top_speed:    t => t.w_top_speed,
  acceleration: t => t.w_acceleration,
  handling:     t => t.w_handling,
  nitro:        t => t.w_nitro,
};

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
                      <span className="text-xs text-muted-foreground">
                        {track.sample_count} sample{track.sample_count !== 1 ? "s" : ""}
                      </span>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-2 pt-0">
                {STAT_KEYS.map(k => {
                  const w = TRACK_WEIGHT[k](track);
                  return (
                    <div key={k} className="grid grid-cols-[110px_1fr_auto] items-center gap-3">
                      <span className={`text-sm ${STAT_COLORS[k].text}`}>{STAT_LABELS[k]}</span>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${STAT_COLORS[k].bar}`}
                          style={{ width: `${w * 100}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs text-zinc-400 tabular-nums w-12 text-right">
                        {(w * 100).toFixed(0)}%
                      </span>
                    </div>
                  );
                })}
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
