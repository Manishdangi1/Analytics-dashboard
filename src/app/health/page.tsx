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
    <div className="min-h-screen p-6 space-y-6 page-gradient">
      <h1 className="text-2xl font-semibold text-white dark:text-white light:text-gray-800">Service Health</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="indus-card p-4">
          <h2 className="font-medium mb-2 text-white dark:text-white light:text-gray-800">Overview</h2>
          {loading ? <p className="text-sm text-neutral-400 dark:text-neutral-400 light:text-gray-600">Loading…</p> : <p className="text-sm text-neutral-300 dark:text-neutral-300 light:text-gray-700">Overview ready.</p>}
        </div>
        <div className="indus-card p-4">
          <h2 className="font-medium mb-2 text-white dark:text-white light:text-gray-800">Health</h2>
          {loading ? <p className="text-sm text-neutral-400 dark:text-neutral-400 light:text-gray-600">Loading…</p> : (
            ok ? <p className="text-sm text-neutral-300 dark:text-neutral-300 light:text-gray-700">Service healthy.</p> : <p className="text-sm text-red-400 dark:text-red-400 light:text-red-600">Unhealthy.</p>
          )}
        </div>
      </div>
    </div>
  );
}


