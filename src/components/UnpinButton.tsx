"use client";
import { useState } from "react";
import { unregisterDashboardGraph } from "@/lib/queries";
import { IconPinnedOff } from "@tabler/icons-react";

export default function UnpinButton({ graphId, onUnpinned }: { graphId: string; onUnpinned?: () => void }) {
  const [isPending, setIsPending] = useState(false);

  const handleUnpin = async () => {
    setIsPending(true);
    try {
      console.log('🗑️ Unpinning graph:', graphId);
      
      // Check if this is a fallback ID (not a real graph ID)
      if (graphId.startsWith('fallback-')) {
        console.log('🔄 Fallback ID detected - removing locally only');
        // For fallback IDs, just remove locally without API call
        if (onUnpinned) {
          onUnpinned();
        }
        return;
      }
      
      await unregisterDashboardGraph(graphId);
      console.log('✅ Graph unpinned successfully');
      
      // Call the provided callback
      if (onUnpinned) {
        onUnpinned();
      }
    } catch (error) {
      console.error("❌ Failed to unpin graph:", error);
      
      // More specific error handling
      if (error instanceof Error) {
        if (error.message.includes('405')) {
          console.log('🔄 405 error - trying local removal as fallback');
          // Try to remove locally as fallback
          if (onUnpinned) {
            onUnpinned();
          }
          return; // Don't show error if we successfully removed locally
        } else if (error.message.includes('404')) {
          console.log('🔄 404 error - graph not found, removing locally');
          // Graph not found, remove locally
          if (onUnpinned) {
            onUnpinned();
          }
          return; // Don't show error if we successfully removed locally
        } else if (error.message.includes('401') || error.message.includes('403')) {
          alert("You don't have permission to remove this graph.");
        } else {
          alert(`Failed to remove graph: ${error.message}`);
        }
      } else {
        alert("Failed to remove graph from dashboard. Please try again.");
      }
    } finally {
      setIsPending(false);
    }
  };

  return (
    <button
      onClick={handleUnpin}
      disabled={isPending}
      title="Unpin from dashboard"
      className="inline-flex items-center gap-1 rounded-md border border-red-400/30 bg-red-500/10 px-2 py-1 text-xs text-red-300 hover:bg-red-500/15 hover:text-red-200 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed pressable"
      style={{
        borderColor: 'var(--error)',
        backgroundColor: 'rgba(255, 68, 68, 0.1)',
        color: 'var(--error)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(255, 68, 68, 0.15)';
        e.currentTarget.style.borderColor = 'var(--error)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(255, 68, 68, 0.1)';
        e.currentTarget.style.borderColor = 'var(--error)';
      }}
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


