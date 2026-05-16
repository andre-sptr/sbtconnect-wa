"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Settings = {
  guardrails: { dailyCap: number; minDelaySeconds: number; maxDelaySeconds: number; quietHours: string; sessionMode: string };
  waha: { configured: boolean; url: string; session: string };
  lock?: { owner?: string | null; lockedUntil?: string | null } | null;
};

export function SettingsClient() {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then((response) => response.json())
      .then(setSettings)
      .catch(() => {});
  }, []);

  if (!settings) return <p className="text-sm text-muted-foreground">Memuat settings...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Konfigurasi WAHA dan guardrail pengiriman konservatif.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              WAHA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-md bg-muted p-3">
              <span>Status</span>
              <Badge variant={settings.waha.configured ? "success" : "destructive"}>{settings.waha.configured ? "Configured" : "Missing env"}</Badge>
            </div>
            <div className="rounded-md bg-muted p-3">
              <p className="text-muted-foreground">URL</p>
              <p className="mt-1 break-all font-medium">{settings.waha.url || "-"}</p>
            </div>
            <div className="rounded-md bg-muted p-3">
              <p className="text-muted-foreground">Session</p>
              <p className="mt-1 font-medium">{settings.waha.session || "-"}</p>
            </div>
            <div className="rounded-md bg-muted p-3">
              <p className="text-muted-foreground">Global lock</p>
              <p className="mt-1 font-medium">{settings.lock?.lockedUntil ? `Locked until ${settings.lock.lockedUntil}` : "Idle"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Guardrail Anti-Risiko</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-md bg-muted p-3">
              <p className="text-muted-foreground">Daily cap</p>
              <p className="mt-1 font-medium">{settings.guardrails.dailyCap} outbound / hari / session</p>
            </div>
            <div className="rounded-md bg-muted p-3">
              <p className="text-muted-foreground">Delay acak</p>
              <p className="mt-1 font-medium">{settings.guardrails.minDelaySeconds}-{settings.guardrails.maxDelaySeconds} detik antar pesan</p>
            </div>
            <div className="rounded-md bg-muted p-3">
              <p className="text-muted-foreground">Quiet hours</p>
              <p className="mt-1 font-medium">{settings.guardrails.quietHours}</p>
            </div>
            <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800">
              Guardrail mengurangi risiko, bukan jaminan bebas ban. Gunakan hanya untuk penerima internal/opt-in dan volume kecil.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
