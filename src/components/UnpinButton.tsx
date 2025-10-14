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
      if (onUnpinned) {
        onUnpinned();
      } else {
        // Refresh the page to update the dashboard
        window.location.reload();
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
      className="inline-flex items-center gap-1 rounded-md border border-red-400/30 bg-red-500/10 px-2 py-1 text-xs text-red-300 hover:bg-red-500/15 hover:text-red-200 transition disabled:opacity-60 disabled:cursor-not-allowed"
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


