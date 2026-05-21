"use client";

import { useEffect, useState } from "react";
import { api, Car, CarInput, CarUpdate } from "@/lib/api";
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
import { Pencil, Trash2, Plus, X, Check } from "lucide-react";

const EMPTY_FORM: CarInput = {
  name: "",
  rank: 0,
  car_class: "S",
  top_speed: 0,
  acceleration: 0,
  handling: 0,
  nitro: 0,
};

const CLASS_COLOR: Record<string, string> = {
  S: "text-yellow-400",
  A: "text-blue-400",
  B: "text-green-400",
  C: "text-orange-400",
  D: "text-red-400",
};

export default function GaragePage() {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CarInput>(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CarUpdate>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

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
      top_speed: car.top_speed,
      acceleration: car.acceleration,
      handling: car.handling,
      nitro: car.nitro,
    });
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

  const f = (n: number) => (typeof n === "number" ? n.toFixed(1) : "—");
  const fn = (n: number) => (typeof n === "number" ? n.toFixed(3) : "—");

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

      {/* Add form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New Car</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-2 space-y-1">
              <Label>Name</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Bugatti Chiron" />
            </div>
            <div className="space-y-1">
              <Label>Rank</Label>
              <Input type="number" value={form.rank} onChange={e => setForm({ ...form, rank: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <Label>Class</Label>
              <Input value={form.car_class} onChange={e => setForm({ ...form, car_class: e.target.value.toUpperCase() })} maxLength={1} />
            </div>
            <div className="space-y-1">
              <Label>Top Speed</Label>
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
              <Button onClick={handleAdd} disabled={saving || !form.name}>{saving ? "Saving…" : "Add Car"}</Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : cars.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">No cars yet. Add your first car above.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-12">Cls</TableHead>
                  <TableHead className="w-16 text-right">Rank</TableHead>
                  <TableHead className="text-right">Top Spd</TableHead>
                  <TableHead className="text-right">Accel</TableHead>
                  <TableHead className="text-right">Handling</TableHead>
                  <TableHead className="text-right">Nitro</TableHead>
                  <TableHead className="text-right text-xs text-muted-foreground">n_ts</TableHead>
                  <TableHead className="text-right text-xs text-muted-foreground">n_ac</TableHead>
                  <TableHead className="text-right text-xs text-muted-foreground">n_ha</TableHead>
                  <TableHead className="text-right text-xs text-muted-foreground">n_ni</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {cars.map((car) => (
                  <TableRow key={car.id}>
                    <TableCell className="font-medium">{car.name}</TableCell>
                    <TableCell>
                      <span className={`font-bold ${CLASS_COLOR[car.car_class] ?? ""}`}>
                        {car.car_class}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{car.rank}</TableCell>
                    {editId === car.id ? (
                      <>
                        <TableCell><Input className="h-7 w-20 text-right" type="number" value={editForm.top_speed} onChange={e => setEditForm({ ...editForm, top_speed: Number(e.target.value) })} /></TableCell>
                        <TableCell><Input className="h-7 w-20 text-right" type="number" value={editForm.acceleration} onChange={e => setEditForm({ ...editForm, acceleration: Number(e.target.value) })} /></TableCell>
                        <TableCell><Input className="h-7 w-20 text-right" type="number" value={editForm.handling} onChange={e => setEditForm({ ...editForm, handling: Number(e.target.value) })} /></TableCell>
                        <TableCell><Input className="h-7 w-20 text-right" type="number" value={editForm.nitro} onChange={e => setEditForm({ ...editForm, nitro: Number(e.target.value) })} /></TableCell>
                        <TableCell className="text-right text-muted-foreground text-xs">{fn(car.n_top_speed)}</TableCell>
                        <TableCell className="text-right text-muted-foreground text-xs">{fn(car.n_acceleration)}</TableCell>
                        <TableCell className="text-right text-muted-foreground text-xs">{fn(car.n_handling)}</TableCell>
                        <TableCell className="text-right text-muted-foreground text-xs">{fn(car.n_nitro)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 justify-end">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit}><Check className="h-3 w-3" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditId(null)}><X className="h-3 w-3" /></Button>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="text-right">{f(car.top_speed)}</TableCell>
                        <TableCell className="text-right">{f(car.acceleration)}</TableCell>
                        <TableCell className="text-right">{f(car.handling)}</TableCell>
                        <TableCell className="text-right">{f(car.nitro)}</TableCell>
                        <TableCell className="text-right text-muted-foreground text-xs">{fn(car.n_top_speed)}</TableCell>
                        <TableCell className="text-right text-muted-foreground text-xs">{fn(car.n_acceleration)}</TableCell>
                        <TableCell className="text-right text-muted-foreground text-xs">{fn(car.n_handling)}</TableCell>
                        <TableCell className="text-right text-muted-foreground text-xs">{fn(car.n_nitro)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 justify-end">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(car)}><Pencil className="h-3 w-3" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(car.id)}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
