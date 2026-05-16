"use client";

import { useEffect, useState } from "react";
import { Save, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Template = { id: number; name: string; body: string; category: string; isActive: boolean };
const empty = { id: 0, name: "", body: "Halo {name}, reminder {campaignName}.\n\n- {senderName}", category: "reminder", isActive: true };

export function TemplatesClient() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [form, setForm] = useState(empty);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const response = await fetch("/api/templates", { cache: "no-store" });
    if (response.ok) setTemplates((await response.json()).templates);
  }

  useEffect(() => {
    load();
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    setError("");
    const response = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, id: form.id || undefined }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(json.error || "Gagal menyimpan template.");
      return;
    }
    setForm(empty);
    setMessage("Template tersimpan.");
    load();
  }

  async function remove(template: Template) {
    if (!window.confirm(`Hapus template ${template.name}?`)) return;
    await fetch(`/api/templates/${template.id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-foreground">Templates</h1>
        <p className="mt-1 text-sm text-muted-foreground">Draft broadcast dan quick reply yang bisa dipakai ulang.</p>
      </div>
      {message ? <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>{form.id ? "Edit Template" : "Buat Template"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={save}>
              <div className="space-y-1">
                <Label>Nama</Label>
                <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Kategori</Label>
                <Input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Body</Label>
                <Textarea rows={8} value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />
                Aktif
              </label>
              <Button className="w-full">
                <Save className="h-4 w-4" />
                Simpan
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="divide-y rounded-md border">
              {templates.length === 0 ? <p className="p-4 text-sm text-muted-foreground">Belum ada template.</p> : null}
              {templates.map((template) => (
                <div key={template.id} className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_120px_48px]">
                  <button type="button" className="min-w-0 text-left" onClick={() => setForm(template)}>
                    <p className="font-medium text-foreground">{template.name}</p>
                    <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm text-muted-foreground">{template.body}</p>
                  </button>
                  <Badge className="w-fit" variant={template.isActive ? "success" : "muted"}>{template.category}</Badge>
                  <Button variant="outline" size="icon" onClick={() => remove(template)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
