"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { createHoliday, deleteHoliday } from "@/actions/holidays";
import { Plus, Trash2 } from "lucide-react";

interface Holiday {
  id: number;
  date: Date;
  name: string;
}

export function HolidaysView({ holidays: initial }: { holidays: Holiday[] }) {
  const [newDate, setNewDate] = useState("");
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");

  const handleCreate = async () => {
    setError("");
    const result = await createHoliday({ date: newDate, name: newName });
    if (result.success) {
      setNewDate("");
      setNewName("");
      window.location.reload();
    } else {
      setError(result.error ?? "Fehler");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Feiertag loeschen?")) return;
    await deleteHoliday(id);
    window.location.reload();
  };

  // Group by year
  const byYear = new Map<number, Holiday[]>();
  for (const h of initial) {
    const y = new Date(h.date).getFullYear();
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y)!.push(h);
  }

  return (
    <div className="space-y-4">
      {/* Add form */}
      <Card>
        <CardContent className="p-4 flex items-end gap-3">
          <div>
            <label className="text-sm font-medium">Datum</label>
            <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium">Name</label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="z.B. Reformationstag" />
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Hinzufuegen
          </Button>
        </CardContent>
      </Card>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* List by year */}
      {Array.from(byYear.entries())
        .sort(([a], [b]) => b - a)
        .map(([year, holidays]) => (
          <div key={year}>
            <h3 className="text-lg font-semibold mb-2">{year}</h3>
            <div className="space-y-1">
              {holidays.map((h) => {
                const d = new Date(h.date);
                const dateStr = `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
                return (
                  <div key={h.id} className="flex items-center justify-between p-2 border rounded-md">
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-sm w-24">{dateStr}</span>
                      <span>{h.name}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(h.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
    </div>
  );
}
