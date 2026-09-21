"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth, Project } from "@/context/auth-context";
import {
  Search,
  LayoutDashboard,
  FileCheck2,
  GitPullRequest,
  CheckSquare,
  Calendar,
  FileText,
  Sparkles,
  Layers,
  FolderOpen,
  Plus,
  ArrowRight,
  X,
} from "lucide-react";

interface PaletteItem {
  label: string;
  href?: string;
  icon: any;
  category: string;
  desc: string;
  action?: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const { currentProject, projects, setCurrentProject } = useAuth();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Actions catalog
  const navigationItems: PaletteItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, category: "Navigation", desc: "Overview & progress metrics" },
    { label: "Requirements", href: "/requirements", icon: FileCheck2, category: "Navigation", desc: "Specifications & criteria" },
    { label: "Architectural Decisions (ADR)", href: "/decisions", icon: GitPullRequest, category: "Navigation", desc: "Technical decision records" },
    { label: "Tasks", href: "/tasks", icon: CheckSquare, category: "Navigation", desc: "Action items & due dates" },
    { label: "Meetings", href: "/meetings", icon: Calendar, category: "Navigation", desc: "Minutes & transcripts" },
    { label: "Documents", href: "/documents", icon: FileText, category: "Navigation", desc: "File storage & knowledge" },
    { label: "AI Copilot", href: "/assistant", icon: Sparkles, category: "Navigation", desc: "Chat with workspace citations" },
    { label: "Universal Search", href: "/search", icon: Search, category: "Navigation", desc: "Multi-entity keyword search" },
    { label: "Integrations", href: "/integrations", icon: Layers, category: "Navigation", desc: "GitHub issues & external tools" },
    { label: "Projects / Workspaces", href: "/projects", icon: FolderOpen, category: "Navigation", desc: "Switch or create workspaces" },
  ];

  const quickActions: PaletteItem[] = [
    { label: "Create Requirement", href: "/requirements?create=true", icon: Plus, category: "Quick Action", desc: "Define new project scope" },
    { label: "Create Task", href: "/tasks?create=true", icon: Plus, category: "Quick Action", desc: "Add actionable engineering item" },
    { label: "Log Architectural Decision", href: "/decisions?create=true", icon: Plus, category: "Quick Action", desc: "Record technical ADR" },
    { label: "Log Meeting", href: "/meetings?create=true", icon: Plus, category: "Quick Action", desc: "Record minutes or transcript" },
    { label: "Upload Document", href: "/documents", icon: Plus, category: "Quick Action", desc: "Add PDF, DOCX, or Markdown" },
    { label: "Ask AI Copilot", href: "/assistant", icon: Sparkles, category: "Quick Action", desc: "Ask question about project" },
  ];

  const projectItems: PaletteItem[] = projects.map((p: Project) => ({
    label: `Switch to [${p.key}] ${p.name}`,
    action: () => setCurrentProject(p),
    href: "/dashboard",
    icon: FolderOpen,
    category: "Switch Workspace",
    desc: p.id === currentProject?.id ? "Currently active workspace" : `Set ${p.key} as active`,
  }));

  const allItems: PaletteItem[] = [...quickActions, ...navigationItems, ...projectItems];

  const filteredItems = allItems.filter((item) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      item.label.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.desc.toLowerCase().includes(q)
    );
  });

  const handleSelect = (item: PaletteItem) => {
    if (item.action) {
      item.action();
    }
    if (item.href) {
      router.push(item.href);
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === "Enter" && filteredItems[selectedIndex]) {
      e.preventDefault();
      handleSelect(filteredItems[selectedIndex]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start justify-center pt-16 sm:pt-24 p-4 animate-in fade-in duration-150">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="relative w-full max-w-xl bg-[#0e1015] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150"
        onKeyDown={handleKeyDown}
      >
        {/* Search Header */}
        <div className="p-3.5 border-b border-white/[0.08] flex items-center gap-3 bg-[#121318]">
          <Search className="w-4 h-4 text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command, page, or search workspace..."
            className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded text-zinc-500 hover:text-zinc-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono bg-white/10 px-1.5 py-0.5 rounded text-zinc-400 shrink-0">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-white/[0.04]">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500 space-y-2">
              <p>No commands matching &quot;{query}&quot;</p>
              <button
                onClick={() => {
                  router.push(`/search?search=${encodeURIComponent(query)}`);
                  onClose();
                }}
                className="text-indigo-400 hover:underline inline-flex items-center gap-1 font-medium"
              >
                <span>Search all workspace content for &quot;{query}&quot;</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredItems.map((item, idx) => {
                const Icon = item.icon;
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={`${item.category}-${item.label}-${idx}`}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all ${
                      isSelected
                        ? "bg-indigo-600/20 text-white border border-indigo-500/30"
                        : "text-zinc-300 hover:bg-white/[0.04] border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected
                            ? "bg-indigo-600/30 text-indigo-300"
                            : "bg-white/[0.04] text-zinc-400"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="truncate min-w-0">
                        <div className="text-xs font-semibold truncate">{item.label}</div>
                        <div className="text-[10px] text-zinc-500 truncate">{item.desc}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider bg-white/[0.03] px-1.5 py-0.5 rounded">
                        {item.category}
                      </span>
                      {isSelected && (
                        <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer shortcuts tip */}
        <div className="p-2.5 bg-[#0a0b0e] border-t border-white/[0.06] text-[10px] text-zinc-500 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="font-mono bg-white/10 px-1 py-0.2 rounded text-zinc-400 mr-1">↑↓</kbd>
              Navigate
            </span>
            <span>
              <kbd className="font-mono bg-white/10 px-1 py-0.2 rounded text-zinc-400 mr-1">↵</kbd>
              Open
            </span>
          </div>
          <span className="font-mono">
            {currentProject ? `Active: [${currentProject.key}]` : "No Workspace Selected"}
          </span>
        </div>
      </div>
    </div>
  );
}
