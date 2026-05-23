"use client";

import { Fragment, useEffect, useState } from "react";
import { api, Car, CarInput, CarUpdate } from "@/lib/api";
import { STAT_KEYS, STAT_LABELS, STAT_COLORS, StatKey } from "@/lib/stats";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Pencil, Trash2, Plus, X, Check, ChevronRight, ChevronDown } from "lucide-react";

// ── Constants ──────────────────────────────────────────────────────────────

const CLASS_ORDER = ["S", "A", "B", "C", "D"];

const CLASS_BADGE: Record<string, string> = {
  S: "bg-red-500/20 text-red-400 border border-red-500/30",
  A: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
  B: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  C: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  D: "bg-zinc-700 text-zinc-300 border border-zinc-600",
};

const EMPTY_FORM: CarInput = {
  name: "",
  rank: 0,
  car_class: "S",
  top_speed: 0,
  acceleration: 0,
  handling: 0,
  nitro: 0,
};

// ── Small components ───────────────────────────────────────────────────────

function Stars({ n }: { n: number }) {
  return (
    <span className="font-mono tracking-tight">
      {Array.from({ length: 6 }, (_, i) =>
        i < n
          ? <span key={i} className="text-amber-400">★</span>
          : <span key={i} className="text-zinc-700">☆</span>
      )}
    </span>
  );
}

function getNStat(car: Car, k: StatKey): number {
  const map: Record<StatKey, number> = {
    top_speed:    car.n_top_speed,
    acceleration: car.n_acceleration,
    handling:     car.n_handling,
    nitro:        car.n_nitro,
  };
  return map[k];
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function GaragePage() {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CarInput>(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CarUpdate>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const load = async () => {
    try {
      const data = await api.getCars();
      setCars(data);
    } catch {
      setError("Failed to load cars");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Sort by class S→D, then rank desc within each class
  const sorted = [...cars].sort((a, b) => {
    const ca = CLASS_ORDER.indexOf(a.car_class);
    const cb = CLASS_ORDER.indexOf(b.car_class);
    if (ca !== cb) return ca - cb;
    return b.rank - a.rank;
  });

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = async () => {
    setSaving(true);
    setError("");
    try {
      await api.addCar(form);
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this car?")) return;
    try {
      await api.deleteCar(id);
      await load();
    } catch (e) {
      setError(String(e));
    }
  };

  const startEdit = (car: Car) => {
    setEditId(car.id);
    setEditForm({
      top_speed:    car.top_speed,
      acceleration: car.acceleration,
      handling:     car.handling,
      nitro:        car.nitro,
    });
    // Expand the row so the edit form is visible
    setExpandedIds(prev => new Set(prev).add(car.id));
  };

  const saveEdit = async () => {
    if (!editId) return;
    setSaving(true);
    try {
      await api.updateCar(editId, editForm);
      setEditId(null);
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Garage</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {cars.length} car{cars.length !== 1 ? "s" : ""} · normalized stats update automatically
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Car
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/15 text-destructive text-sm px-4 py-2">
          {error}
        </div>
      )}

      {/* Add-car form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New Car</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-2 space-y-1">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Bugatti Chiron"
              />
            </div>
            <div className="space-y-1">
              <Label>Stars (rank)</Label>
              <Input
                type="number"
                min={0}
                max={6}
                value={form.rank}
                onChange={e => setForm({ ...form, rank: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1">
              <Label>Class</Label>
              <Input
                value={form.car_class}
                onChange={e => setForm({ ...form, car_class: e.target.value.toUpperCase() })}
                maxLength={1}
              />
            </div>
            <div className="space-y-1">
              <Label>Top Speed (km/h)</Label>
              <Input type="number" value={form.top_speed} onChange={e => setForm({ ...form, top_speed: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <Label>Acceleration</Label>
              <Input type="number" value={form.acceleration} onChange={e => setForm({ ...form, acceleration: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <Label>Handling</Label>
              <Input type="number" value={form.handling} onChange={e => setForm({ ...form, handling: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <Label>Nitro</Label>
              <Input type="number" value={form.nitro} onChange={e => setForm({ ...form, nitro: Number(e.target.value) })} />
            </div>
            <div className="col-span-2 md:col-span-4 flex gap-2 pt-2">
              <Button onClick={handleAdd} disabled={saving || !form.name}>
                {saving ? "Saving…" : "Add Car"}
              </Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : cars.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <p className="text-zinc-400">No cars in your garage yet.</p>
              <Button onClick={() => setShowForm(true)}>+ Add Car</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Car</TableHead>
                  <TableHead className="w-16">Class</TableHead>
                  <TableHead className="w-36">Stars</TableHead>
                  <TableHead className="w-16 text-right">Rank</TableHead>
                  <TableHead className="text-right">Top Speed</TableHead>
                  <TableHead className="w-20 text-right">Score</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map(car => {
                  const expanded  = expandedIds.has(car.id);
                  const isEditing = editId === car.id;
                  return (
                    <Fragment key={car.id}>
                      {/* Main row */}
                      <TableRow className="cursor-pointer hover:bg-muted/30">
                        <TableCell
                          className="w-8"
                          onClick={() => toggleExpand(car.id)}
                        >
                          {expanded
                            ? <ChevronDown  className="h-4 w-4 text-zinc-500" />
                            : <ChevronRight className="h-4 w-4 text-zinc-500" />
                          }
                        </TableCell>
                        <TableCell className="font-medium text-zinc-100">
                          {car.display_name}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-bold ${CLASS_BADGE[car.car_class] ?? "bg-zinc-700 text-zinc-300"}`}>
                            {car.car_class}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Stars n={car.rank} />
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-zinc-100">
                          {car.rank}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {car.top_speed.toFixed(1)}
                          <span className="text-zinc-500 text-xs ml-1">km/h</span>
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-zinc-100">
                          {car.overall_score.toFixed(3)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 justify-end">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => startEdit(car)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(car.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Expanded row — edit form or stat bars */}
                      {expanded && (
                        <TableRow className="bg-muted/10 hover:bg-muted/10">
                          <TableCell colSpan={8} className="px-8 py-3">
                            {isEditing ? (
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                  {(["top_speed", "acceleration", "handling", "nitro"] as const).map(stat => (
                                    <div key={stat} className="space-y-1">
                                      <Label className="text-xs">{STAT_LABELS[stat]}</Label>
                                      <Input
                                        type="number"
                                        className="h-7 text-right"
                                        value={editForm[stat] ?? 0}
                                        onChange={e => setEditForm({ ...editForm, [stat]: Number(e.target.value) })}
                                      />
                                    </div>
                                  ))}
                                </div>
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={saveEdit} disabled={saving}>
                                    <Check className="h-3 w-3 mr-1" />
                                    {saving ? "Saving…" : "Save"}
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => setEditId(null)}>
                                    <X className="h-3 w-3 mr-1" />
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2 max-w-sm">
                                {STAT_KEYS.map(k => (
                                  <div key={k} className="grid grid-cols-[110px_1fr_auto] items-center gap-3">
                                    <span className={`text-xs ${STAT_COLORS[k].text}`}>{STAT_LABELS[k]}</span>
                                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full ${STAT_COLORS[k].bar}`}
                                        style={{ width: `${getNStat(car, k) * 100}%` }}
                                      />
                                    </div>
                                    <span className="font-mono text-xs text-zinc-400 tabular-nums w-12 text-right">
                                      {(getNStat(car, k) * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
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
