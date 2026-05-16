"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Plus, RefreshCw, Search, Trash2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/utils";

type Contact = {
  id: number;
  name: string;
  phone: string;
  team: string;
  role: string;
  tags: string[];
  optedIn: boolean;
  optedOut: boolean;
  lastInboundAt?: string | null;
  lastOutboundAt?: string | null;
};

const emptyForm = { id: 0, name: "", phone: "", team: "", role: "", tagsText: "", optedIn: true, optedOut: false };

export function ContactsClient() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [importText, setImportText] = useState("name,phone,team,role,tags,optIn\nAndre,081234567890,People,Staff,onboarding,true");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const query = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
    const response = await fetch(`/api/contacts${query}`, { cache: "no-store" });
    setLoading(false);
    if (response.ok) setContacts((await response.json()).contacts);
  }

  useEffect(() => {
    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
  }, [q]);

  const optedInCount = useMemo(() => contacts.filter((contact) => contact.optedIn && !contact.optedOut).length, [contacts]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    const response = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: form.id || undefined,
        name: form.name,
        phone: form.phone,
        team: form.team,
        role: form.role,
        tags: form.tagsText.split(",").map((tag) => tag.trim()).filter(Boolean),
        optedIn: form.optedIn,
        optedOut: form.optedOut,
      }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(json.error || "Gagal menyimpan kontak.");
      return;
    }
    setForm(emptyForm);
    setMessage("Kontak tersimpan.");
    load();
  }

  async function importContacts() {
    setError("");
    setMessage("");
    const response = await fetch("/api/contacts/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: importText }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(json.error || "Import gagal.");
      return;
    }
    setMessage(`Import selesai: ${json.created} baru, ${json.updated} diperbarui.`);
    load();
  }

  async function remove(contact: Contact) {
    if (!window.confirm(`Hapus ${contact.name || contact.phone}?`)) return;
    await fetch(`/api/contacts/${contact.id}`, { method: "DELETE" });
    load();
  }

  function edit(contact: Contact) {
    setForm({
      id: contact.id,
      name: contact.name,
      phone: contact.phone,
      team: contact.team,
      role: contact.role,
      tagsText: contact.tags.join(", "),
      optedIn: contact.optedIn,
      optedOut: contact.optedOut,
    });
  }

  function exportCsv() {
    const header = "name,phone,team,role,tags,optedIn,optedOut\n";
    const rows = contacts.map((contact) => [contact.name, contact.phone, contact.team, contact.role, contact.tags.join(";"), contact.optedIn, contact.optedOut].join(","));
    const blob = new Blob([header + rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "contacts.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">Contacts</h1>
          <p className="mt-1 text-sm text-muted-foreground">{optedInCount} kontak opt-in dari {contacts.length} kontak.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv}>
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" onClick={load}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>
      {message ? <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                {form.id ? "Edit Kontak" : "Tambah Kontak"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={save}>
                <div className="space-y-1">
                  <Label>Nama</Label>
                  <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Andre" />
                </div>
                <div className="space-y-1">
                  <Label>Nomor WA</Label>
                  <Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="081234567890" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Tim</Label>
                    <Input value={form.team} onChange={(event) => setForm({ ...form, team: event.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Role</Label>
                    <Input value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Tags</Label>
                  <Input value={form.tagsText} onChange={(event) => setForm({ ...form, tagsText: event.target.value })} placeholder="onboarding, reminder" />
                </div>
                <div className="flex gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={form.optedIn} 
                      onChange={(event) => {
                        const isChecked = event.target.checked;
                        setForm({ ...form, optedIn: isChecked, optedOut: isChecked ? false : form.optedOut });
                      }} 
                    />
                    Opt-in
                  </label>
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={form.optedOut} 
                      onChange={(event) => {
                        const isChecked = event.target.checked;
                        setForm({ ...form, optedOut: isChecked, optedIn: isChecked ? false : form.optedIn });
                      }} 
                    />
                    Opt-out
                  </label>
                </div>
                <Button className="w-full">{form.id ? "Simpan Perubahan" : "Tambah Kontak"}</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                Import Paste/CSV
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea rows={8} value={importText} onChange={(event) => setImportText(event.target.value)} />
              <Button variant="outline" className="w-full" onClick={importContacts}>
                Import Kontak
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="space-y-4 pt-5">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Cari nama, nomor, tim, role, tag..." value={q} onChange={(event) => setQ(event.target.value)} />
            </div>
            <div className="divide-y rounded-md border">
              {loading ? <p className="p-4 text-sm text-muted-foreground">Memuat kontak...</p> : null}
              {!loading && contacts.length === 0 ? <p className="p-4 text-sm text-muted-foreground">Belum ada kontak.</p> : null}
              {contacts.map((contact) => (
                <div key={contact.id} className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_180px_96px]">
                  <button type="button" className="min-w-0 text-left" onClick={() => edit(contact)}>
                    <p className="font-medium text-foreground">{contact.name || contact.phone}</p>
                    <p className="text-sm text-muted-foreground">{contact.phone} · {contact.team || "-"} · {contact.role || "-"}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {contact.tags.map((tag) => <Badge key={tag} variant="muted">{tag}</Badge>)}
                    </div>
                  </button>
                  <div className="text-xs text-muted-foreground">
                    <p>In: {formatDateTime(contact.lastInboundAt)}</p>
                    <p>Out: {formatDateTime(contact.lastOutboundAt)}</p>
                  </div>
                  <div className="flex items-start justify-between gap-2 lg:justify-end">
                    <Badge variant={contact.optedOut ? "destructive" : contact.optedIn ? "success" : "warning"}>{contact.optedOut ? "Opt-out" : contact.optedIn ? "Opt-in" : "No opt-in"}</Badge>
                    <Button variant="outline" size="icon" onClick={() => remove(contact)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
