/**
 * Status Badge Component
 * Displays online/down status with neon glow effect and last-checked timestamp
 */

import { format } from "date-fns";

interface StatusBadgeProps {
  status: "online" | "down" | "unknown";
  lastCheckedAt?: Date;
  responseTime?: number;
}

export function StatusBadge({
  status,
  lastCheckedAt,
  responseTime,
}: StatusBadgeProps) {
  const isOnline = status === "online";
  const isDown = status === "down";
  const isUnknown = status === "unknown";
  
  const statusColor = isOnline ? "text-green-400" : isDown ? "text-red-500" : "text-gray-400";
  const glowClass = isOnline ? "border-glow-cyan" : isDown ? "border-glow" : "";
  const bgClass = isOnline
    ? "bg-green-950 border-green-500"
    : isDown
    ? "bg-red-950 border-red-600"
    : "bg-gray-900 border-gray-600";

  const statusText =
    status === "unknown" ? "Checking..." : status.toUpperCase();
  const lastChecked = lastCheckedAt
    ? format(new Date(lastCheckedAt), "MMM dd, HH:mm:ss")
    : "Never";

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-sm border ${bgClass} ${glowClass}`}>
      {/* Status Indicator Dot */}
      <div
        className={`w-2 h-2 rounded-full ${
          isOnline ? "bg-green-400 animate-pulse" : isDown ? "bg-red-500" : "bg-gray-500"
        }`}
      />

      {/* Status Text */}
      <span className={`text-xs font-bold uppercase tracking-wider ${statusColor}`}>
        {statusText}
      </span>

      {/* Response Time */}
      {responseTime !== undefined && responseTime >= 0 && (
        <span className="text-xs text-gray-400 ml-1">
          {responseTime}ms
        </span>
      )}

      {/* Last Checked */}
      <span className="text-xs text-gray-500 ml-2 border-l border-gray-700 pl-2">
        {lastChecked}
      </span>
    </div>
  );
}
