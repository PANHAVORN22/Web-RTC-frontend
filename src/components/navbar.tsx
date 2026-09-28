"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, Project } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Plus,
  FolderKanban,
  Menu,
} from "lucide-react";
import { QuickCreateModal } from "@/components/quick-create-modal";
import { NotificationCenter } from "@/components/notification-center";

interface NavbarProps {
  onToggleMobileMenu?: () => void;
  onOpenCommandPalette?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleMobileMenu,
  onOpenCommandPalette,
}) => {
  const router = useRouter();
  const { currentProject, projects, setCurrentProject } = useAuth();
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else if (onOpenCommandPalette) {
      onOpenCommandPalette();
    }
  };

  return (
    <>
      <header className="sticky top-0 z-20 w-full bg-[#F4F5F7] border-b border-codex-border/80 px-4 sm:px-8 py-3">
        <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
          {/* Left: Mobile Menu Toggle & Search Bar */}
          <div className="flex items-center gap-3 flex-1 max-w-md">
            {onToggleMobileMenu && (
              <button
                type="button"
                onClick={onToggleMobileMenu}
                className="md:hidden p-2 rounded-lg text-slate-600 hover:text-codex-text hover:bg-slate-200/60"
                aria-label="Toggle navigation menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search requirements, tasks, documents..."
                className="w-full h-10 pl-10 pr-4 rounded-xl border border-codex-border bg-white text-xs text-codex-text shadow-sm focus:outline-none focus:ring-2 focus:ring-codex-accent focus:border-transparent placeholder:text-slate-400 transition-all"
              />
            </form>
          </div>

          {/* Right Actions: Project Switcher, Notification Bell & + New */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Active Project Switcher */}
            {projects.length > 0 && (
              <div className="hidden sm:flex items-center gap-2 bg-white border border-codex-border rounded-xl px-3 py-1.5 shadow-sm text-xs">
                <FolderKanban className="w-3.5 h-3.5 text-codex-accent shrink-0" />
                <select
                  value={currentProject?.id || ""}
                  onChange={(e) => {
                    const p = projects.find((proj: Project) => proj.id === e.target.value);
                    if (p) setCurrentProject(p);
                  }}
                  className="bg-transparent text-xs font-semibold text-codex-text focus:outline-none cursor-pointer pr-1"
                  aria-label="Select active project"
                >
                  {projects.map((p: Project) => (
                    <option key={p.id} value={p.id}>
                      [{p.key}] {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Notification Center */}
            <NotificationCenter />

            {/* + New Button */}
            <Button
              onClick={() => setQuickCreateOpen(true)}
              className="bg-codex-accent hover:bg-codex-hover text-white rounded-xl px-4 py-2 text-xs font-semibold shadow-sm gap-1.5 h-10"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>New</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Quick Create Dialog */}
      <QuickCreateModal
        isOpen={quickCreateOpen}
        onClose={() => setQuickCreateOpen(false)}
      />
    </>
  );
};
