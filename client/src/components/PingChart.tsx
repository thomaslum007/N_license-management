/**
 * Ping Chart Component
 * Displays 12-hour ping history with Recharts
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import type { PingRecord } from "@shared/types";

interface PingChartProps {
  data: PingRecord[];
  title: string;
  isLoading?: boolean;
}

export function PingChart({
  data,
  title,
  isLoading = false,
}: PingChartProps) {
  // Transform data for chart
  const chartData = data.map((record) => ({
    timestamp: format(new Date(record.timestamp), "HH:mm"),
    responseTime: record.responseTime,
    status: record.status,
    fullTime: new Date(record.timestamp),
  }));

  // Sample data if too many points (keep every nth point)
  const sampledData =
    chartData.length > 60
      ? chartData.filter((_, i) => i % Math.ceil(chartData.length / 60) === 0)
      : chartData;

  return (
    <div className="border-glow p-4 rounded-sm bg-slate-900 border border-pink-600">
      <h3 className="text-sm font-bold text-neon-pink uppercase tracking-widest mb-4">
        {title} - 12h History
      </h3>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center text-gray-500">
          <p className="text-xs">Loading chart data...</p>
        </div>
      ) : sampledData.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-gray-500">
          <p className="text-xs">No data available yet</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={sampledData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgb(55 65 81)"
              vertical={false}
            />
            <XAxis
              dataKey="timestamp"
              stroke="rgb(107 114 128)"
              style={{ fontSize: "12px" }}
              tick={{ fill: "rgb(107 114 128)" }}
            />
            <YAxis
              stroke="rgb(107 114 128)"
              style={{ fontSize: "12px" }}
              tick={{ fill: "rgb(107 114 128)" }}
              label={{
                value: "Response Time (ms)",
                angle: -90,
                position: "insideLeft",
                style: { fontSize: "12px", fill: "rgb(107 114 128)" },
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgb(15 23 42)",
                border: "1px solid rgb(219 39 119)",
                borderRadius: "4px",
              }}
              labelStyle={{ color: "rgb(219 39 119)" }}
              formatter={(value: any) => [
                `${value}ms`,
                "Response Time",
              ]}
              labelFormatter={(label) => `Time: ${label}`}
            />
            <Line
              type="monotone"
              dataKey="responseTime"
              stroke="rgb(219 39 119)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              name="Response Time"
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
