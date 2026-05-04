/**
 * Add System Form Component
 * Form for adding new monitored systems with validation
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, AlertCircle } from "lucide-react";

interface AddSystemFormProps {
  onSubmit: (title: string, url: string) => Promise<void>;
  isLoading?: boolean;
  maxSystems?: number;
  currentSystemCount?: number;
}

export function AddSystemForm({
  onSubmit,
  isLoading = false,
  maxSystems = 20,
  currentSystemCount = 0,
}: AddSystemFormProps) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const isAtLimit = currentSystemCount >= maxSystems;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("System title is required");
      return;
    }

    if (!url.trim()) {
      setError("URL is required");
      return;
    }

    if (isAtLimit) {
      setError(`Maximum ${maxSystems} systems allowed`);
      return;
    }

    try {
      await onSubmit(title.trim(), url.trim());
      setTitle("");
      setUrl("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to add system"
      );
    }
  };

  return (
    <div className="border-glow p-4 rounded-sm bg-slate-900 border border-cyan-500">
      <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-widest mb-4">
        + Add System
      </h3>

      {error && (
        <div className="mb-3 p-2 bg-red-950 border border-red-600 rounded-sm flex gap-2 items-start">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {isAtLimit && (
        <div className="mb-3 p-2 bg-yellow-950 border border-yellow-600 rounded-sm">
          <p className="text-xs text-yellow-400">
            Maximum {maxSystems} systems reached
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
            System Title
          </label>
          <Input
            type="text"
            placeholder="e.g., Google, API Server"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isLoading || isAtLimit}
            className="bg-slate-800 border-gray-700 text-white placeholder-gray-600 focus:border-cyan-500 focus:ring-cyan-500"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
            URL
          </label>
          <Input
            type="text"
            placeholder="e.g., www.google.com or https://api.example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isLoading || isAtLimit}
            className="bg-slate-800 border-gray-700 text-white placeholder-gray-600 focus:border-cyan-500 focus:ring-cyan-500"
          />
        </div>

        <Button
          type="submit"
          disabled={isLoading || isAtLimit}
          className="w-full bg-cyan-600 hover:bg-cyan-500 text-black font-bold uppercase tracking-wider"
        >
          <Plus className="w-4 h-4 mr-2" />
          {isLoading ? "Adding..." : "Add System"}
        </Button>
      </form>
    </div>
  );
}
