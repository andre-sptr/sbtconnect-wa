"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Pause, Play, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils";

type Campaign = {
  id: number;
  name: string;
  status: string;
  enabled: boolean;
  cronExpression?: string | null;
  nextRunAt?: string | null;
  lastRunAt?: string | null;
  _count: { recipients: number; outboundMessages: number; inboundMessages: number };
};

export function CampaignsClient() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const query = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
    const response = await fetch(`/api/campaigns${query}`, { cache: "no-store" });
    setLoading(false);
    if (response.ok) setCampaigns((await response.json()).campaigns);
  }

  useEffect(() => {
    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
  }, [q]);

  async function remove(campaign: Campaign) {
    if (!window.confirm(`Hapus campaign ${campaign.name}?`)) return;
    await fetch(`/api/campaigns/${campaign.id}`, { method: "DELETE" });
    load();
  }

  async function toggle(campaign: Campaign) {
    const detail = await fetch(`/api/campaigns/${campaign.id}`).then((r) => r.json());
    await fetch(`/api/campaigns/${campaign.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...detail.campaign, enabled: !campaign.enabled }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">Campaigns</h1>
          <p className="mt-1 text-sm text-muted-foreground">Draft, schedule, dan queue broadcast WhatsApp.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/campaigns/new">
            <Plus className="h-4 w-4" />
            Buat Campaign
          </Link>
        </Button>
      </div>
      <Card>
        <CardContent className="space-y-4 pt-5">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Cari campaign..." value={q} onChange={(event) => setQ(event.target.value)} />
            </div>
            <Button variant="outline" onClick={load}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <div className="divide-y rounded-md border">
            {loading ? <p className="p-4 text-sm text-muted-foreground">Memuat campaign...</p> : null}
            {!loading && campaigns.length === 0 ? <p className="p-4 text-sm text-muted-foreground">Belum ada campaign.</p> : null}
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_220px_150px]">
                <Link href={`/dashboard/campaigns/${campaign.id}`} className="min-w-0">
                  <p className="font-medium text-foreground">{campaign.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {campaign._count.recipients} penerima · {campaign._count.outboundMessages} outbound · {campaign._count.inboundMessages} reply
                  </p>
                </Link>
                <div className="text-sm text-muted-foreground">
                  <p>{campaign.cronExpression || "Manual only"}</p>
                  <p>Next: {formatDateTime(campaign.nextRunAt)}</p>
                  <p>Last: {formatDateTime(campaign.lastRunAt)}</p>
                </div>
                <div className="flex items-start justify-between gap-2 lg:justify-end">
                  <Badge variant={campaign.enabled ? "success" : campaign.status === "paused" ? "warning" : "muted"}>
                    {campaign.enabled ? "Scheduled" : campaign.status}
                  </Badge>
                  <Button variant="outline" size="icon" onClick={() => toggle(campaign)} title="Pause/resume">
                    {campaign.enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => remove(campaign)} title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
