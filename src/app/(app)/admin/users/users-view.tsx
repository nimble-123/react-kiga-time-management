"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { createUser, updateUser, resetUserPassword, setInitialBalance } from "@/actions/users";
import { UserPlus, Key, Wallet, UserX, UserCheck, Loader2 } from "lucide-react";

interface UserData {
  id: number;
  username: string;
  displayName: string;
  role: string;
  isActive: boolean;
  entryDate: Date | null;
  exitDate: Date | null;
  workSchedules: { weeklyHours: number; workingDays: string }[];
  initialBalance: { overtimeHours: number } | null;
}

export function UsersView({ users: initialUsers }: { users: UserData[] }) {
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const { showSuccess, showError } = useToast();

  // Create form
  const [newUsername, setNewUsername] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"USER" | "ADMIN">("USER");
  const [newWeeklyHours, setNewWeeklyHours] = useState(30);
  const [newWorkingDays, setNewWorkingDays] = useState(["MO", "TU", "WE", "TH", "FR"]);
  const [newEntryDate, setNewEntryDate] = useState("");

  // Inline dialogs
  const [resetPwUser, setResetPwUser] = useState<UserData | null>(null);
  const [resetPwValue, setResetPwValue] = useState("");
  const [balanceUser, setBalanceUser] = useState<UserData | null>(null);
  const [balanceValue, setBalanceValue] = useState("");
  const [confirmToggle, setConfirmToggle] = useState<UserData | null>(null);

  const handleCreate = async () => {
    if (!newUsername.trim() || !newDisplayName.trim()) {
      showError("Benutzername und Anzeigename sind Pflichtfelder");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      showError("Passwort muss mindestens 6 Zeichen lang sein");
      return;
    }
    setCreating(true);
    const result = await createUser({
      username: newUsername.trim(),
      displayName: newDisplayName.trim(),
      password: newPassword,
      role: newRole,
      weeklyHours: newWeeklyHours,
      workingDays: newWorkingDays,
    });
    if (result.success) {
      showSuccess(`Benutzer "${newDisplayName}" angelegt`);
      setShowCreate(false);
      setNewUsername(""); setNewDisplayName(""); setNewPassword("");
      window.location.reload();
    } else {
      showError(result.error ?? "Fehler beim Anlegen");
    }
    setCreating(false);
  };

  const handleResetPassword = async () => {
    if (!resetPwUser || !resetPwValue || resetPwValue.length < 6) {
      showError("Passwort muss mindestens 6 Zeichen lang sein");
      return;
    }
    await resetUserPassword(resetPwUser.id, resetPwValue);
    showSuccess(`Passwort fuer ${resetPwUser.displayName} zurueckgesetzt`);
    setResetPwUser(null);
    setResetPwValue("");
  };

  const handleSetBalance = async () => {
    if (!balanceUser) return;
    const val = parseFloat(balanceValue);
    if (isNaN(val)) {
      showError("Bitte eine gueltige Zahl eingeben (z.B. 12.5 oder -3)");
      return;
    }
    await setInitialBalance(balanceUser.id, val);
    showSuccess(`Ueberstundenkonto fuer ${balanceUser.displayName} auf ${val}h gesetzt`);
    setBalanceUser(null);
    setBalanceValue("");
    window.location.reload();
  };

  const handleToggleActive = async () => {
    if (!confirmToggle) return;
    await updateUser(confirmToggle.id, { isActive: !confirmToggle.isActive });
    showSuccess(`${confirmToggle.displayName} ${confirmToggle.isActive ? "deaktiviert" : "aktiviert"}`);
    setConfirmToggle(null);
    window.location.reload();
  };

  const allDays = ["MO", "TU", "WE", "TH", "FR"];
  const dayLabels: Record<string, string> = { MO: "Mo", TU: "Di", WE: "Mi", TH: "Do", FR: "Fr" };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowCreate(!showCreate)} title="Neuen Benutzer anlegen">
          <UserPlus className="h-4 w-4 mr-2" />
          Neuer Benutzer
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <Card>
          <CardHeader><CardTitle>Neuen Benutzer anlegen</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Benutzername <span className="text-destructive">*</span></label>
                <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="z.B. maria.weber" />
                <p className="text-xs text-muted-foreground mt-0.5">Nur Buchstaben, Zahlen, Punkt, Bindestrich</p>
              </div>
              <div>
                <label className="text-sm font-medium">Anzeigename <span className="text-destructive">*</span></label>
                <Input value={newDisplayName} onChange={(e) => setNewDisplayName(e.target.value)} placeholder="z.B. Maria Weber" />
              </div>
              <div>
                <label className="text-sm font-medium">Initialpasswort <span className="text-destructive">*</span></label>
                <Input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mind. 6 Zeichen" type="text" />
                <p className="text-xs text-muted-foreground mt-0.5">Muss beim ersten Login geaendert werden</p>
              </div>
              <div>
                <label className="text-sm font-medium">Rolle</label>
                <Select value={newRole} onChange={(e) => setNewRole(e.target.value as "USER" | "ADMIN")}>
                  <option value="USER">Benutzer</option>
                  <option value="ADMIN">Administrator</option>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Wochenstunden</label>
                <Input type="number" min={0} max={50} step={0.5} value={newWeeklyHours} onChange={(e) => setNewWeeklyHours(Number(e.target.value))} />
              </div>
              <div>
                <label className="text-sm font-medium">Arbeitstage</label>
                <div className="flex gap-1 mt-1">
                  {allDays.map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={`px-3 py-1.5 text-xs rounded border cursor-pointer transition-colors ${
                        newWorkingDays.includes(d) ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent"
                      }`}
                      onClick={() => setNewWorkingDays(
                        newWorkingDays.includes(d)
                          ? newWorkingDays.filter((x) => x !== d)
                          : [...newWorkingDays, d],
                      )}
                      title={`${dayLabels[d]}tag als Arbeitstag ${newWorkingDays.includes(d) ? "entfernen" : "hinzufuegen"}`}
                    >
                      {dayLabels[d]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Eintrittsdatum</label>
                <Input type="date" value={newEntryDate} onChange={(e) => setNewEntryDate(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Erstelle...</> : "Benutzer anlegen"}
              </Button>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Abbrechen</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User list */}
      <div className="space-y-2">
        {initialUsers.map((u) => {
          const schedule = u.workSchedules[0];
          const workingDays: string[] = schedule ? JSON.parse(schedule.workingDays) : [];
          return (
            <Card key={u.id} className={!u.isActive ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="min-w-[140px]">
                      <p className="font-medium">{u.displayName}</p>
                      <p className="text-xs text-muted-foreground">@{u.username}</p>
                    </div>
                    <Badge variant={u.role === "ADMIN" ? "default" : "secondary"}>
                      {u.role === "ADMIN" ? "Admin" : "Benutzer"}
                    </Badge>
                    <Badge variant={u.isActive ? "success" : "destructive"}>
                      {u.isActive ? "Aktiv" : "Inaktiv"}
                    </Badge>
                    {schedule && (
                      <span className="text-sm text-muted-foreground" title="Arbeitszeitmodell">
                        {schedule.weeklyHours}h/Wo ({workingDays.map((d) => dayLabels[d] ?? d).join(", ")})
                      </span>
                    )}
                    {u.initialBalance && (
                      <span className="text-sm text-muted-foreground" title="Ueberstundenkonto (Startwert)">
                        Konto: {u.initialBalance.overtimeHours > 0 ? "+" : ""}{u.initialBalance.overtimeHours}h
                      </span>
                    )}
                    {u.entryDate && (
                      <span className="text-xs text-muted-foreground" title="Eintrittsdatum">
                        Eintritt: {new Date(u.entryDate).toLocaleDateString("de-DE")}
                      </span>
                    )}
                    {u.exitDate && (
                      <span className="text-xs text-muted-foreground" title="Austrittsdatum">
                        Austritt: {new Date(u.exitDate).toLocaleDateString("de-DE")}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => { setBalanceUser(u); setBalanceValue(String(u.initialBalance?.overtimeHours ?? 0)); }} title="Ueberstundenkonto setzen">
                      <Wallet className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setResetPwUser(u); setResetPwValue(""); }} title="Passwort zuruecksetzen">
                      <Key className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmToggle(u)} title={u.isActive ? "Benutzer deaktivieren" : "Benutzer aktivieren"}>
                      {u.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Reset password dialog */}
      {resetPwUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-sm">
            <CardHeader><CardTitle className="text-base">Passwort zuruecksetzen</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Neues Passwort fuer <strong>{resetPwUser.displayName}</strong></p>
              <Input
                type="text"
                placeholder="Neues Passwort (mind. 6 Zeichen)"
                value={resetPwValue}
                onChange={(e) => setResetPwValue(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">Der Benutzer wird beim naechsten Login aufgefordert, das Passwort zu aendern.</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setResetPwUser(null)}>Abbrechen</Button>
                <Button size="sm" onClick={handleResetPassword} disabled={resetPwValue.length < 6}>Zuruecksetzen</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Set balance dialog */}
      {balanceUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-sm">
            <CardHeader><CardTitle className="text-base">Ueberstundenkonto setzen</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Startwert fuer <strong>{balanceUser.displayName}</strong> in Stunden.
                Positive Werte = Guthaben, negative = Schulden.
              </p>
              <Input
                type="number"
                step="0.5"
                placeholder="z.B. 12.5 oder -3"
                value={balanceValue}
                onChange={(e) => setBalanceValue(e.target.value)}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setBalanceUser(null)}>Abbrechen</Button>
                <Button size="sm" onClick={handleSetBalance}>Speichern</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Toggle active confirmation */}
      {confirmToggle && (
        <ConfirmDialog
          title={confirmToggle.isActive ? "Benutzer deaktivieren" : "Benutzer aktivieren"}
          message={confirmToggle.isActive
            ? `${confirmToggle.displayName} kann sich nach der Deaktivierung nicht mehr anmelden.`
            : `${confirmToggle.displayName} wird wieder aktiviert und kann sich anmelden.`}
          confirmLabel={confirmToggle.isActive ? "Deaktivieren" : "Aktivieren"}
          variant={confirmToggle.isActive ? "destructive" : "default"}
          onConfirm={handleToggleActive}
          onCancel={() => setConfirmToggle(null)}
        />
      )}
    </div>
  );
}
