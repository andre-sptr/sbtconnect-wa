"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/utils";

type Message = {
  id: string;
  direction: "inbound" | "outbound";
  text: string;
  at: string;
  status: string;
  unread: boolean;
  campaign?: { id: number; name: string } | null;
};
type Thread = {
  contact: { id: number; name: string; phone: string; team: string; role: string; tags: string[]; optedOut: boolean };
  unreadCount: number;
  lastMessage: Message | null;
  messages: Message[];
};
type Template = { id: number; name: string; body: string; category: string };

export function InboxClient() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [unread, setUnread] = useState(false);
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const query = new URLSearchParams();
    if (q.trim()) query.set("q", q.trim());
    if (unread) query.set("unread", "1");
    const [threadsRes, templateRes] = await Promise.all([
      fetch(`/api/inbox/threads?${query.toString()}`, { cache: "no-store" }),
      fetch("/api/templates", { cache: "no-store" }),
    ]);
    if (threadsRes.ok) {
      const nextThreads = (await threadsRes.json()).threads as Thread[];
      setThreads(nextThreads);
      if (!selectedId && nextThreads[0]) setSelectedId(nextThreads[0].contact.id);
    }
    if (templateRes.ok) setTemplates((await templateRes.json()).templates);
  }

  useEffect(() => {
    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
  }, [q, unread]);

  const selected = useMemo(() => threads.find((thread) => thread.contact.id === selectedId) || threads[0] || null, [threads, selectedId]);

  function applyTemplate(templateId: string) {
    const template = templates.find((item) => item.id === Number(templateId));
    if (!template || !selected) return;
    setReply(
      template.body
        .replaceAll("{name}", selected.contact.name || "Rekan")
        .replaceAll("{phone}", selected.contact.phone.replace("@c.us", ""))
        .replaceAll("{team}", selected.contact.team || "-")
        .replaceAll("{role}", selected.contact.role || "-")
        .replaceAll("{campaignName}", selected.lastMessage?.campaign?.name || "follow-up")
        .replaceAll("{senderName}", "user")
    );
  }

  async function sendReply() {
    if (!selected) return;
    setError("");
    const response = await fetch("/api/inbox/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId: selected.contact.id, text: reply }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(json.error || "Balasan gagal masuk queue.");
      return;
    }
    setReply("");
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">Inbox</h1>
          <p className="mt-1 text-sm text-muted-foreground">Thread balasan penerima dengan filter dan quick reply.</p>
        </div>
        <Button variant="outline" onClick={load}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>
      {error ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      <Card>
        <CardContent className="grid gap-0 p-0 lg:grid-cols-[360px_1fr]">
          <div className="border-b p-4 lg:border-b-0 lg:border-r">
            <div className="mb-3 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Cari thread..." value={q} onChange={(event) => setQ(event.target.value)} />
              </div>
              <Button variant={unread ? "default" : "outline"} onClick={() => setUnread(!unread)}>Unread</Button>
            </div>
            <div className="max-h-[620px] divide-y overflow-y-auto rounded-md border">
              {threads.length === 0 ? <p className="p-4 text-sm text-muted-foreground">Belum ada thread.</p> : null}
              {threads.map((thread) => (
                <button
                  key={thread.contact.id}
                  type="button"
                  onClick={() => setSelectedId(thread.contact.id)}
                  className={`block w-full p-4 text-left transition-colors hover:bg-muted/60 ${selected?.contact.id === thread.contact.id ? "bg-muted" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-foreground">{thread.contact.name || thread.contact.phone}</p>
                    {thread.unreadCount ? <Badge variant="success">{thread.unreadCount}</Badge> : null}
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">{thread.lastMessage?.text || "Tidak ada pesan"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(thread.lastMessage?.at)}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex min-h-[680px] flex-col">
            {!selected ? (
              <p className="p-6 text-sm text-muted-foreground">Pilih thread untuk membaca balasan.</p>
            ) : (
              <>
                <div className="border-b p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">{selected.contact.name || selected.contact.phone}</h2>
                    <Badge variant={selected.contact.optedOut ? "destructive" : "muted"}>{selected.contact.optedOut ? "Opt-out" : selected.contact.phone}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{selected.contact.team || "-"} · {selected.contact.role || "-"}</p>
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                  {selected.messages.map((message) => (
                    <div key={message.id} className={`flex ${message.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[78%] rounded-lg border p-3 text-sm ${message.direction === "outbound" ? "bg-red-700 text-white" : "bg-muted text-foreground"}`}>
                        <p className="whitespace-pre-wrap leading-6 [overflow-wrap:anywhere]">{message.text}</p>
                        <p className={`mt-2 text-xs ${message.direction === "outbound" ? "text-red-100" : "text-muted-foreground"}`}>
                          {formatDateTime(message.at)} · {message.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t p-4">
                  <div className="mb-2 flex gap-2">
                    <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" onChange={(event) => applyTemplate(event.target.value)}>
                      <option value="">Quick template</option>
                      {templates.filter((template) => template.category === "reply").map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Textarea rows={3} value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Tulis balasan..." />
                    <Button className="self-end" onClick={sendReply} disabled={!reply.trim() || selected.contact.optedOut}>
                      <Send className="h-4 w-4" />
                      Kirim
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
