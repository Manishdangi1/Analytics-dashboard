"use client";
import { useState } from "react";
import { unregisterDashboardGraph } from "@/lib/queries";
import { IconPinnedOff } from "@tabler/icons-react";

export default function UnpinButton({ graphId, onUnpinned }: { graphId: string; onUnpinned?: () => void }) {
  const [isPending, setIsPending] = useState(false);

  const handleUnpin = async () => {
    setIsPending(true);
    try {
      await unregisterDashboardGraph(graphId);
      
      // Call the provided callback
      if (onUnpinned) {
        onUnpinned();
      }
      
      // Also trigger global refresh if available
      if (typeof window !== "undefined" && (window as unknown as { refreshDashboardGraphs?: () => void }).refreshDashboardGraphs) {
        (window as unknown as { refreshDashboardGraphs: () => void }).refreshDashboardGraphs();
      }
    } catch (error) {
      console.error("Failed to unpin graph:", error);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <button
      onClick={handleUnpin}
      disabled={isPending}
      title="Unpin from dashboard"
      className="inline-flex items-center gap-1 rounded-md border border-red-400/30 bg-red-500/10 px-2 py-1 text-xs text-red-300 hover:bg-red-500/15 hover:text-red-200 transition disabled:opacity-60 disabled:cursor-not-allowed dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/15 dark:hover:text-red-200 light:border-red-500/50 light:bg-red-500/20 light:text-red-600 light:hover:bg-red-500/25 light:hover:text-red-700"
    >
      {isPending ? (
        <span>Unpinning…</span>
      ) : (
        <>
          <IconPinnedOff size={14} />
          <span>Unpin</span>
        </>
      )}
    </button>
  );
}


