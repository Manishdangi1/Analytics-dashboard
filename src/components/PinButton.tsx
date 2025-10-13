"use client";
import { useState } from "react";
import { registerDashboardGraph } from "@/lib/queries";

export default function PinButton({ title, figure, html, graph_type }: { title?: string | null; figure?: unknown; html?: string | null; graph_type?: string | null }) {
  const [isPending, setIsPending] = useState(false);

  const handlePin = async () => {
    setIsPending(true);
    try {
      await registerDashboardGraph({
        title: title || "Pinned Graph",
        graph_type: graph_type || null,
        figure: (figure as Record<string, unknown>) ?? null,
        html_content: html || null,
        active: true,
      });
      // Refresh the page to update the dashboard
      window.location.reload();
    } catch (error) {
      console.error("Failed to pin graph:", error);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <button onClick={handlePin} className="text-xs rounded border border-white/20 px-2 py-1 hover:bg-white/10">
      {isPending ? "Pinning…" : "Pin to Dashboard"}
    </button>
  );
}


