"use client";

import React, { useState, useEffect } from "react";
import { useAuth, Project } from "@/context/auth-context";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  X,
  CheckSquare,
  FileCheck2,
  Bookmark,
  Calendar,
  FolderPlus,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type EntityType = "task" | "requirement" | "decision" | "meeting" | "project";

export const QuickCreateModal: React.FC<QuickCreateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { currentProject, projects, refreshProjects } = useAuth();
  const [selectedProjectId, setSelectedProjectId] = useState<string>(currentProject?.id || "");
  const [activeTab, setActiveTab] = useState<EntityType>("task");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [projectKey, setProjectKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Synchronize target project when current project or modal opens
  useEffect(() => {
    if (isOpen) {
      if (currentProject?.id) {
        setSelectedProjectId(currentProject.id);
      } else if (projects.length > 0) {
        setSelectedProjectId((prev) => prev || projects[0].id);
      }
    }
  }, [currentProject, projects, isOpen]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const targetProject = projects.find((p) => p.id === selectedProjectId) || currentProject;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setError(null);
    setLoading(true);

    try {
      if (activeTab === "project") {
        const key = projectKey.trim().toUpperCase() || title.trim().slice(0, 4).toUpperCase();
        await api.projects.create({ name: title.trim(), key, description: description.trim() });
        await refreshProjects();
      } else {
        const pId = targetProject?.id;
        if (!pId) {
          throw new Error("Please select an active project first.");
        }

        if (activeTab === "task") {
          await api.tasks.create(pId, {
            title: title.trim(),
            description: description.trim() || undefined,
            priority: priority as any,
          });
        } else if (activeTab === "requirement") {
          await api.requirements.create(pId, {
            title: title.trim(),
            description: description.trim() || undefined,
            priority: priority as any,
          });
        } else if (activeTab === "decision") {
          await api.decisions.create(pId, {
            title: title.trim(),
            decisionText: description.trim() || title.trim(),
          });
        } else if (activeTab === "meeting") {
          const now = new Date();
          const ends = new Date(now.getTime() + 60 * 60 * 1000);
          await api.meetings.create(pId, {
            title: title.trim(),
            startsAt: now.toISOString(),
            endsAt: ends.toISOString(),
            notes: description.trim() || undefined,
          });
        }
      }

      // Notify any listening components to refresh data
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("workspace:refresh", { detail: { type: activeTab } }));
      }

      setTitle("");
      setDescription("");
      setProjectKey("");
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err?.message || "Failed to create item.");
    } finally {
      setLoading(false);
    }
  };

  const tabs: { id: EntityType; label: string; icon: React.ElementType }[] = [
    { id: "task", label: "Task", icon: CheckSquare },
    { id: "requirement", label: "Requirement", icon: FileCheck2 },
    { id: "decision", label: "Decision", icon: Bookmark },
    { id: "meeting", label: "Meeting", icon: Calendar },
    { id: "project", label: "New Project", icon: FolderPlus },
  ];

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-codex-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-codex-border bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-codex-text">Quick Create</span>
            {activeTab !== "project" && projects.length > 0 && (
              <div className="relative inline-flex items-center">
                <select
                  value={targetProject?.id || ""}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="appearance-none text-xs font-semibold text-codex-accent bg-blue-50 hover:bg-blue-100/70 border border-blue-200/80 rounded-full pl-2.5 pr-6 py-0.5 focus:outline-none focus:ring-2 focus:ring-codex-accent cursor-pointer transition-colors"
                  aria-label="Select target project"
                >
                  {projects.map((p: Project) => (
                    <option key={p.id} value={p.id}>
                      [{p.key}] {p.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-codex-accent pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-70" />
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-codex-text hover:bg-slate-100 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection without unsightly scrollbar */}
        <div className="flex border-b border-codex-border px-4 sm:px-6 bg-slate-50/40 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setError(null);
                }}
                className={cn(
                  "flex items-center gap-1.5 py-3 px-3 text-xs font-medium border-b-2 transition-all shrink-0 whitespace-nowrap",
                  isActive
                    ? "border-codex-accent text-codex-accent font-semibold bg-white rounded-t-lg -mb-px"
                    : "border-transparent text-slate-500 hover:text-codex-text hover:bg-slate-100/60"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-red-50 text-codex-warning rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              {activeTab === "project" ? "Project Name" : "Title"} *
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                activeTab === "task"
                  ? "e.g., Implement authentication workflow"
                  : activeTab === "requirement"
                  ? "e.g., Must support SSO Google login"
                  : activeTab === "decision"
                  ? "e.g., Adopt PostgreSQL and pgvector for storage"
                  : activeTab === "meeting"
                  ? "e.g., Sprint Planning & Backlog Grooming"
                  : "e.g., Client Portal Overhaul"
              }
              autoFocus
              required
            />
          </div>

          {activeTab === "project" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Project Key (3-6 uppercase letters)
              </label>
              <Input
                value={projectKey}
                onChange={(e) => setProjectKey(e.target.value.toUpperCase())}
                placeholder="e.g., PORT"
                maxLength={6}
              />
            </div>
          )}

          {(activeTab === "task" || activeTab === "requirement") && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full h-9 rounded-lg border border-codex-border bg-white px-3 text-xs text-codex-text shadow-sm focus:outline-none focus:ring-2 focus:ring-codex-accent"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              {activeTab === "decision"
                ? "Decision Outcome / Details"
                : "Description (Optional)"}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder={
                activeTab === "decision"
                  ? "Record the agreed architectural decision or rationale..."
                  : "Add additional context or notes..."
              }
              className="w-full rounded-lg border border-codex-border bg-white p-3 text-xs text-codex-text shadow-sm focus:outline-none focus:ring-2 focus:ring-codex-accent resize-none placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-codex-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !title.trim()}
              className="gap-1.5"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Create {tabs.find((t) => t.id === activeTab)?.label}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
