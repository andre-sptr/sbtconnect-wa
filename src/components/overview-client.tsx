"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, BookUser, CalendarClock, Inbox, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

type Overview = {
  contacts: number;
  optedInContacts: number;
  campaigns: number;
  pendingMessages: number;
  failedMessages: number;
  latestInbound: Array<{ id: number; text: string; receivedAt: string; contact: { name: string; phone: string }; campaign?: { name: string } | null }>;
  nextCampaign?: { name: string; nextRunAt: string | null } | null;
};

export function OverviewClient() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");

  async function load() {
    const response = await fetch("/api/overview", { cache: "no-store" });
    if (!response.ok) {
      setError("Gagal memuat overview.");
      return;
    }
    setData(await response.json());
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 15000);
    return () => window.clearInterval(timer);
  }, []);

  if (error) return <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Memuat dashboard...</p>;

  const cards = [
    { label: "Kontak", value: data.contacts, sub: `${data.optedInContacts} opt-in`, icon: BookUser },
    { label: "Campaign", value: data.campaigns, sub: data.nextCampaign ? `Next ${formatDateTime(data.nextCampaign.nextRunAt)}` : "Belum ada jadwal", icon: CalendarClock },
    { label: "Pending Queue", value: data.pendingMessages, sub: "Serial WAHA queue", icon: Send },
    { label: "Gagal", value: data.failedMessages, sub: "Perlu review", icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-foreground">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">Status kontak, campaign, queue, dan balasan terbaru.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardContent className="flex items-center justify-between pt-5">
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{card.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{card.sub}</p>
              </div>
              <div className="rounded-md bg-red-50 p-3 text-red-700 dark:bg-red-950/40 dark:text-red-300">
                <card.icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Inbox className="h-5 w-5 text-primary" />
            Balasan Terbaru
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y rounded-md border">
            {data.latestInbound.length === 0 ? <p className="p-4 text-sm text-muted-foreground">Belum ada balasan masuk.</p> : null}
            {data.latestInbound.map((message) => (
              <div key={message.id} className="grid gap-2 p-4 md:grid-cols-[minmax(0,1fr)_160px]">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{message.contact.name || message.contact.phone}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground [overflow-wrap:anywhere]">{message.text}</p>
                </div>
                <div className="flex flex-col items-start gap-2 md:items-end">
                  <Badge variant="success">Inbound</Badge>
                  <p className="text-xs text-muted-foreground">{formatDateTime(message.receivedAt)}</p>
                  {message.campaign ? <p className="text-xs text-muted-foreground">{message.campaign.name}</p> : null}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
