"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";
import { AiWorkspaceLogo } from "@/components/ai-workspace-logo";
import {
  LayoutDashboard,
  Folder,
  Users,
  FileCheck2,
  CheckSquare,
  Files,
  Calendar,
  Bookmark,
  Sparkles,
  GitBranch,
  X,
  LogOut,
} from "lucide-react";

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: Folder },
  { label: "Team", href: "/team", icon: Users },
  { label: "Requirements", href: "/requirements", icon: FileCheck2 },
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
  { label: "Documents", href: "/documents", icon: Files },
  { label: "Meetings", href: "/meetings", icon: Calendar },
  { label: "Decisions", href: "/decisions", icon: Bookmark },
  { label: "AI Copilot", href: "/assistant", icon: Sparkles },
  { label: "Integrations", href: "/integrations", icon: GitBranch },
];

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // Get user display name and initials
  const displayName = user?.displayName || user?.fullName || "Alice Developer";
  const userRole = user?.professionalRole || user?.systemRole || user?.role || "Developer";
  const initials =
    displayName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "AD";

  const navContent = (
    <div className="flex flex-col h-full bg-[#161927] text-white select-none overflow-hidden">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center justify-between shrink-0 border-b border-white/[0.06]">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 group transition-transform hover:scale-[1.02]"
          onClick={onCloseMobile}
        >
          <AiWorkspaceLogo size="md" />
        </Link>

        {mobileOpen && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Main Navigation Links - Dedicated Scroll Container */}
      <nav className="flex-1 min-h-0 px-3 py-3 space-y-1 overflow-y-auto overflow-x-hidden [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.15)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/15 [&::-webkit-scrollbar-track]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-white/25">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className={cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 group",
                isActive
                  ? "bg-codex-accent text-white font-semibold shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-white/[0.06]"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 shrink-0 transition-colors",
                  isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                )}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Profile Footer - Anchored at the bottom end */}
      <div className="p-3 shrink-0 border-t border-white/[0.08] bg-[#161927]">
        <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] transition-all">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-[#3b82f6] flex items-center justify-center text-xs font-bold text-white shadow-sm shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex flex-col">
              <span className="text-xs font-semibold text-white truncate leading-tight">
                {displayName}
              </span>
              <span className="text-[11px] text-slate-400 truncate leading-tight capitalize mt-0.5">
                {userRole.toLowerCase()}
              </span>
            </div>
          </div>

          <button
            onClick={() => logout()}
            title="Log out"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors shrink-0"
            aria-label="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 bg-[#161927] border-r border-white/[0.08] flex-col shrink-0 h-screen max-h-screen overflow-hidden sticky top-0 z-30">
        {navContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <aside className="relative w-64 max-w-[85vw] bg-[#161927] border-r border-white/[0.1] flex flex-col h-full z-10 shadow-2xl overflow-hidden">
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
};
