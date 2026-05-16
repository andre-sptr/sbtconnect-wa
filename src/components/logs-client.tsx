"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils";

type Log = { id: number; level: string; entityType: string; entityId?: number | null; action: string; message: string; createdAt: string };

export function LogsClient() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [q, setQ] = useState("");
  const [level, setLevel] = useState("");

  async function load() {
    const query = new URLSearchParams();
    if (q.trim()) query.set("q", q.trim());
    if (level) query.set("level", level);
    const response = await fetch(`/api/logs?${query.toString()}`, { cache: "no-store" });
    if (response.ok) setLogs((await response.json()).logs);
  }

  useEffect(() => {
    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
  }, [q, level]);

  function variant(value: string) {
    if (value === "error") return "destructive";
    if (value === "warning") return "warning";
    if (value === "success") return "success";
    return "muted";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">Logs</h1>
          <p className="mt-1 text-sm text-muted-foreground">Audit trail campaign, queue, webhook, dan safety guardrail.</p>
        </div>
        <Button variant="outline" onClick={load}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>
      <Card>
        <CardContent className="space-y-4 pt-5">
          <div className="grid gap-3 md:grid-cols-[1fr_180px]">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Cari log..." value={q} onChange={(event) => setQ(event.target.value)} />
            </div>
            <select value={level} onChange={(event) => setLevel(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Semua level</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
              <option value="success">Success</option>
            </select>
          </div>
          <div className="rounded-md border overflow-hidden">
            {/* Table Header */}
            <div className="hidden lg:grid grid-cols-[160px_100px_180px_1fr] border-b bg-muted/30 px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <div className="text-left">Time</div>
              <div className="text-center">Level</div>
              <div className="text-center">Event</div>
              <div className="text-center">Message</div>
            </div>

            <div className="divide-y">
              {logs.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                  Belum ada log.
                </div>
              ) : null}
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="grid gap-3 p-4 hover:bg-muted/30 transition-colors lg:grid-cols-[160px_100px_180px_minmax(0,1fr)] lg:items-center"
                >
                  <div className="text-[13px] font-medium text-muted-foreground">
                    {formatDateTime(log.createdAt)}
                  </div>
                  <div className="flex items-center">
                    <Badge
                      className="w-16 justify-center text-[11px] font-bold uppercase tracking-tighter"
                      variant={variant(log.level) as any}
                    >
                      {log.level}
                    </Badge>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[13px] font-semibold text-foreground uppercase tracking-tight">
                      {log.entityType}
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground italic">
                      {log.action}
                    </span>
                  </div>
                  <div className="text-[13px] leading-relaxed text-foreground/90">
                    <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">
                      {log.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
