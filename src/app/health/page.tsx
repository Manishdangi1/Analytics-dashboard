"use client";
import { useEffect, useState } from "react";
import { rootOverview, health } from "@/lib/queries";

export default function HealthPage() {
  const [loading, setLoading] = useState(true);
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await rootOverview();
        await health();
        if (mounted) setOk(true);
      } catch {
        if (mounted) setOk(false);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);
  return (
    <div className="min-h-screen p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Service Health</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="font-medium mb-2">Overview</h2>
          {loading ? <p className="text-sm text-neutral-400">Loading…</p> : <p className="text-sm text-neutral-300">Overview ready.</p>}
        </div>
        <div>
          <h2 className="font-medium mb-2">Health</h2>
          {loading ? <p className="text-sm text-neutral-400">Loading…</p> : (
            ok ? <p className="text-sm text-neutral-300">Service healthy.</p> : <p className="text-sm text-red-400">Unhealthy.</p>
          )}
        </div>
      </div>
    </div>
  );
}


