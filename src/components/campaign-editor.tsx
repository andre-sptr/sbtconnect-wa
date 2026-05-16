"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, ExternalLink, Play, Save, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Contact = { id: number; name: string; phone: string; team: string; role: string; optedIn: boolean; optedOut: boolean; tags: string[] };
type Template = { id: number; name: string; body: string; category: string };

type FormState = {
  name: string;
  draft: string;
  cronExpression: string;
  timezone: string;
  enabled: boolean;
  contactIds: number[];
  audienceTags: string[];
};

const defaultForm: FormState = {
  name: "",
  draft: "Halo {name}, reminder {campaignName}. Mohon balas pesan ini jika sudah ditindaklanjuti.\n\n- {senderName}",
  cronExpression: "0 8 * * *",
  timezone: "Asia/Jakarta",
  enabled: false,
  contactIds: [],
  audienceTags: [],
};

export function CampaignEditor({ campaignId }: { campaignId?: number }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(defaultForm);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  async function load() {
    const [contactRes, templateRes] = await Promise.all([
      fetch("/api/contacts", { cache: "no-store" }),
      fetch("/api/templates", { cache: "no-store" }),
    ]);
    if (contactRes.ok) setContacts((await contactRes.json()).contacts);
    if (templateRes.ok) setTemplates((await templateRes.json()).templates);
    if (campaignId) {
      const response = await fetch(`/api/campaigns/${campaignId}`, { cache: "no-store" });
      if (response.ok) {
        const json = await response.json();
        setForm({
          name: json.campaign.name,
          draft: json.campaign.draft,
          cronExpression: json.campaign.cronExpression || "0 8 * * *",
          timezone: json.campaign.timezone,
          enabled: json.campaign.enabled,
          contactIds: json.campaign.contactIds,
          audienceTags: json.campaign.audienceTags,
        });
      }
    }
  }

  useEffect(() => {
    load();
  }, [campaignId]);

  const selectedContacts = useMemo(() => contacts.filter((contact) => form.contactIds.includes(contact.id)), [contacts, form.contactIds]);
  const firstContact = selectedContacts[0] || contacts[0];
  const preview = useMemo(() => {
    if (!firstContact) return form.draft;
    return form.draft
      .replaceAll("{name}", firstContact.name || "Rekan")
      .replaceAll("{phone}", firstContact.phone.replace("@c.us", ""))
      .replaceAll("{team}", firstContact.team || "-")
      .replaceAll("{role}", firstContact.role || "-")
      .replaceAll("{campaignName}", form.name || "Campaign")
      .replaceAll("{senderName}", "user");
  }, [form.draft, form.name, firstContact]);

  function toggleContact(contactId: number) {
    setForm((current) => ({
      ...current,
      contactIds: current.contactIds.includes(contactId)
        ? current.contactIds.filter((id) => id !== contactId)
        : [...current.contactIds, contactId],
    }));
  }

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");
    const response = await fetch(campaignId ? `/api/campaigns/${campaignId}` : "/api/campaigns", {
      method: campaignId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(json.error || "Gagal menyimpan campaign.");
      return;
    }
    setMessage("Campaign tersimpan.");
    if (!campaignId) router.push(`/dashboard/campaigns/${json.campaign.id}`);
    router.refresh();
  }

  async function runNow() {
    if (!campaignId) return;
    setRunning(true);
    setError("");
    setMessage("");
    const response = await fetch(`/api/campaigns/${campaignId}/run`, { method: "POST" });
    setRunning(false);
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(json.error || "Run gagal.");
      return;
    }
    setMessage(`Run dibuat. Queue: ${json.run?.queuedCount ?? 0}, skip: ${json.run?.skippedCount ?? 0}.`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">{campaignId ? form.name || "Edit Campaign" : "Buat Campaign"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Pilih penerima opt-in, tulis draft, dan atur crontab.</p>
        </div>
        <div className="flex gap-2">
          {campaignId ? (
            <Button variant="outline" onClick={runNow} disabled={running}>
              <Play className="h-4 w-4" />
              {running ? "Enqueue..." : "Run Now"}
            </Button>
          ) : null}
          <Button onClick={save} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </div>
      {message ? <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" />
                Draft Broadcast
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nama Campaign</Label>
                <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Reminder Absensi Harian" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Template</Label>
                  <select
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                    onChange={(event) => {
                      const template = templates.find((item) => item.id === Number(event.target.value));
                      if (template) setForm({ ...form, draft: template.body });
                    }}
                  >
                    <option value="">Pilih template</option>
                    {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                  </select>
                </div>
                <Textarea rows={8} value={form.draft} onChange={(event) => setForm({ ...form, draft: event.target.value })} />
                <p className="text-xs text-muted-foreground">Placeholder: {"{name}"}, {"{phone}"}, {"{team}"}, {"{role}"}, {"{campaignName}"}, {"{senderName}"}, {"{date}"}, {"{datetime}"}.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-primary" />
                Jadwal
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-[1fr_180px]">
              <div className="space-y-2">
                <Label>Cron Expression</Label>
                <Input value={form.cronExpression} onChange={(event) => setForm({ ...form, cronExpression: event.target.value })} placeholder="0 8 * * *" />
                <a href="https://crontab.guru" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  <ExternalLink className="h-3 w-3" />
                  crontab.guru
                </a>
              </div>
              <div className="space-y-2">
                <Label>Status Scheduler</Label>
                <button type="button" onClick={() => setForm({ ...form, enabled: !form.enabled })} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm">
                  <span>{form.enabled ? "Aktif" : "Paused"}</span>
                  <Badge variant={form.enabled ? "success" : "muted"}>{form.enabled ? "ON" : "OFF"}</Badge>
                </button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Penerima</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[460px] divide-y overflow-y-auto rounded-md border">
                {contacts.length === 0 ? <p className="p-4 text-sm text-muted-foreground">Tambahkan kontak dulu.</p> : null}
                {contacts.map((contact) => {
                  const disabled = !contact.optedIn || contact.optedOut;
                  return (
                    <label key={contact.id} className="flex cursor-pointer items-start gap-3 p-3 text-sm">
                      <input type="checkbox" className="mt-1" checked={form.contactIds.includes(contact.id)} disabled={disabled} onChange={() => toggleContact(contact.id)} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-foreground">{contact.name || contact.phone}</span>
                        <span className="block text-muted-foreground">{contact.phone} · {contact.team || "-"} · {contact.role || "-"}</span>
                      </span>
                      <Badge variant={disabled ? "warning" : "success"}>{disabled ? "blocked" : "opt-in"}</Badge>
                    </label>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md bg-muted p-3">
                  <p className="text-muted-foreground">Penerima</p>
                  <p className="mt-1 text-xl font-semibold">{selectedContacts.length}</p>
                </div>
                <div className="rounded-md bg-muted p-3">
                  <p className="text-muted-foreground">Guardrail</p>
                  <p className="mt-1 font-semibold">45-90s delay</p>
                </div>
              </div>
              <div className="rounded-md border bg-background p-3">
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Preview</p>
                <p className="whitespace-pre-wrap leading-6 text-foreground [overflow-wrap:anywhere]">{preview}</p>
              </div>
              <p className="text-xs text-muted-foreground">WAHA bukan API resmi. Dashboard memaksa opt-in, daily cap, quiet hours, dan queue serial, tetapi tidak bisa menjamin nomor bebas ban.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
