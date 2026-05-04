/**
 * System Card Component
 * Displays a single monitored system with status, URL, and action buttons
 */

import { Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import type { MonitoredSystem } from "@shared/types";

interface SystemCardProps {
  system: MonitoredSystem;
  onDelete: (id: number) => void;
  onRefresh: (id: number) => void;
  isRefreshing?: boolean;
  isDeleting?: boolean;
}

export function SystemCard({
  system,
  onDelete,
  onRefresh,
  isRefreshing = false,
  isDeleting = false,
}: SystemCardProps) {
  return (
    <div className="border-glow p-4 rounded-sm bg-slate-900 border border-pink-600 hover:border-cyan-400 transition-colors">
      {/* Header with HUD corner */}
      <div className="hud-corner mb-4">
        <h3 className="text-lg font-bold text-neon-pink uppercase tracking-widest">
          {system.title}
        </h3>
        <p className="text-xs text-gray-500 mt-1 font-mono break-all">
          {system.url}
        </p>
      </div>

      {/* Status Section */}
      <div className="mb-4 pb-4 border-b border-gray-700">
        <StatusBadge
          status={system.status as "online" | "down" | "unknown"}
          lastCheckedAt={system.lastCheckedAt ?? undefined}
          responseTime={system.lastResponseTime ?? undefined}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onRefresh(system.id)}
          disabled={isRefreshing || isDeleting}
          className="flex-1 border-cyan-500 text-cyan-400 hover:bg-cyan-950 hover:text-cyan-300"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          {isRefreshing ? "Checking..." : "Check Now"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onDelete(system.id)}
          disabled={isDeleting || isRefreshing}
          className="flex-1 border-red-600 text-red-500 hover:bg-red-950 hover:text-red-400"
        >
          <Trash2 className="w-3 h-3 mr-1" />
          {isDeleting ? "Removing..." : "Remove"}
        </Button>
      </div>
    </div>
  );
}
