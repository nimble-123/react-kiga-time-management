"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { changePasswordAction } from "@/actions/auth";

export default function ProfilePage() {
  const [current, setCurrent] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    const result = await changePasswordAction({
      currentPassword: current,
      newPassword: newPw,
      confirmPassword: confirm,
    });

    if (result.success) {
      setMessage("Passwort erfolgreich geaendert.");
      setCurrent("");
      setNewPw("");
      setConfirm("");
    } else {
      setError(result.error ?? "Fehler");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-2xl font-bold">Profil</h1>

      <Card>
        <CardHeader>
          <CardTitle>Passwort aendern</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-sm font-medium">Aktuelles Passwort</label>
              <Input
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Neues Passwort</label>
              <Input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Passwort bestaetigen</label>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {message && <p className="text-sm text-positive">{message}</p>}
            <Button type="submit" disabled={loading}>
              {loading ? "Speichern..." : "Passwort aendern"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
