import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { AddSystemForm } from "@/components/AddSystemForm";
import { SystemCard } from "@/components/SystemCard";
import { PingChart } from "@/components/PingChart";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { MonitoredSystem, PingRecord } from "@shared/types";

export default function MonitoringDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [selectedSystemId, setSelectedSystemId] = useState<number | null>(null);
  const [refreshingId, setRefreshingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const systemsQuery = trpc.systems.list.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  const historyQuery = trpc.systems.getHistory.useQuery(
    { systemId: selectedSystemId! },
    {
      enabled: isAuthenticated && selectedSystemId !== null,
    }
  );

  const createSystemMutation = trpc.systems.create.useMutation({
    onSuccess: () => {
      toast.success("System added successfully!");
      systemsQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add system");
    },
  });

  const deleteSystemMutation = trpc.systems.delete.useMutation({
    onSuccess: () => {
      toast.success("System removed successfully!");
      if (selectedSystemId === deletingId) {
        setSelectedSystemId(null);
      }
      systemsQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to remove system");
    },
  });

  const manualPingMutation = trpc.systems.manualPing.useMutation({
    onSuccess: (result) => {
      toast.success(
        `Ping complete: ${result.status} (${result.responseTime}ms)`
      );
      systemsQuery.refetch();
      historyQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to ping system");
    },
  });

  const systems = systemsQuery.data || [];

  const handleAddSystem = async (title: string, url: string) => {
    return new Promise<void>((resolve, reject) => {
      createSystemMutation.mutate(
        { title, url },
        {
          onSuccess: () => resolve(),
          onError: (error) => reject(error),
        }
      );
    });
  };

  const handleDeleteSystem = async (systemId: number) => {
    setDeletingId(systemId);
    return new Promise<void>((resolve, reject) => {
      deleteSystemMutation.mutate(
        { systemId },
        {
          onSuccess: () => {
            setDeletingId(null);
            resolve();
          },
          onError: (error) => {
            setDeletingId(null);
            reject(error);
          },
        }
      );
    });
  };

  const handleManualPing = async (systemId: number) => {
    setRefreshingId(systemId);
    return new Promise<void>((resolve, reject) => {
      manualPingMutation.mutate(
        { systemId },
        {
          onSuccess: () => {
            setRefreshingId(null);
            resolve();
          },
          onError: (error) => {
            setRefreshingId(null);
            reject(error);
          },
        }
      );
    });
  };

  useEffect(() => {
    if (systems.length > 0 && selectedSystemId === null) {
      setSelectedSystemId(systems[0].id);
    }
  }, [systems, selectedSystemId]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-lg">Please log in to access the dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-pink-600 bg-slate-950 py-6 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-black text-neon-pink uppercase tracking-widest mb-2">
            System Status Monitor
          </h1>
          <p className="text-sm text-gray-400 font-mono">
            Real-time uptime monitoring with 12-hour ping history
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {systemsQuery.error && (
          <div className="mb-6 p-4 bg-red-950 border border-red-600 rounded-sm flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-400">Error loading systems</p>
              <p className="text-sm text-red-300">
                {systemsQuery.error.message}
              </p>
            </div>
          </div>
        )}

        {systemsQuery.isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-pink-600 animate-spin" />
          </div>
        )}

        {!systemsQuery.isLoading && systems.length === 0 && (
          <div className="max-w-md mx-auto">
            <div className="text-center mb-6">
              <p className="text-gray-400 mb-2">No systems monitored yet</p>
              <p className="text-sm text-gray-500">Add your first system below to get started</p>
            </div>
            <AddSystemForm
              onSubmit={handleAddSystem}
              isLoading={createSystemMutation.isPending}
              currentSystemCount={systems.length}
              maxSystems={20}
            />
          </div>
        )}

        {!systemsQuery.isLoading && systems.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <AddSystemForm
                onSubmit={handleAddSystem}
                isLoading={createSystemMutation.isPending}
                currentSystemCount={systems.length}
                maxSystems={20}
              />

              <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
                {systems.map((system) => (
                  <button
                    key={system.id}
                    onClick={() => setSelectedSystemId(system.id)}
                    className={`w-full text-left p-3 rounded-sm border transition-all ${
                      selectedSystemId === system.id
                        ? "border-cyan-400 bg-slate-800 shadow-lg shadow-cyan-500/20"
                        : "border-gray-700 bg-slate-900 hover:border-gray-600"
                    }`}
                  >
                    <h4 className="font-bold text-sm text-neon-pink uppercase tracking-wider">
                      {system.title}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      {system.url}
                    </p>
                    <div className="mt-2">
                      <span
                        className={`inline-block text-xs font-bold px-2 py-1 rounded ${
                          system.status === "online"
                            ? "bg-green-950 text-green-400"
                            : system.status === "down"
                            ? "bg-red-950 text-red-500"
                            : "bg-gray-800 text-gray-400"
                        }`}
                      >
                        {system.status.toUpperCase()}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              {selectedSystemId && (
                <>
                  <SystemCard
                    system={systems.find((s) => s.id === selectedSystemId)!}
                    onDelete={handleDeleteSystem}
                    onRefresh={handleManualPing}
                    isRefreshing={refreshingId === selectedSystemId}
                    isDeleting={deletingId === selectedSystemId}
                  />

                  <PingChart
                    data={historyQuery.data || []}
                    title={systems.find((s) => s.id === selectedSystemId)?.title || "System"}
                    isLoading={historyQuery.isLoading}
                  />
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
