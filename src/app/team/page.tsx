"use client";

import React, { useState, useEffect, useMemo, useCallback, type KeyboardEvent, type ClipboardEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { AppLayout } from "@/components/app-layout";
import { api } from "@/lib/api";
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Clock,
  Check,
  Copy,
  Trash2,
  Search,
  Sparkles,
  ExternalLink,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  X,
  Briefcase,
  Code,
  Layers,
  ShieldAlert,
} from "lucide-react";
import { CustomDropdown, type CustomDropdownOption } from "@/components/ui/custom-dropdown";
import { FilterDropdown, type FilterOption } from "@/components/ui/filter-dropdown";

const INVITE_PROF_ROLE_OPTIONS: CustomDropdownOption[] = [
  { value: "DEVELOPER", label: "Developer" },
  { value: "PM", label: "Product Manager" },
  { value: "QA", label: "QA Engineer" },
  { value: "INFRASTRUCTURE", label: "DevOps / Infra" },
  { value: "DX", label: "UX / DX" },
  { value: "PRESENTATION", label: "Technical Writer" },
];

const INVITE_SYSTEM_ROLE_OPTIONS: CustomDropdownOption[] = [
  { value: "USER", label: "Member" },
  { value: "ADMIN", label: "Admin" },
];

const FILTER_ROLE_OPTIONS: FilterOption[] = [
  { value: "ADMIN", label: "Admin" },
  { value: "DEVELOPER", label: "Developer" },
  { value: "PM", label: "PM" },
  { value: "QA", label: "QA" },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface WorkspaceMember {
  id: string;
  email: string;
  displayName: string;
  systemRole: "ADMIN" | "USER";
  professionalRole: "PM" | "DEVELOPER" | "QA" | "DX" | "INFRASTRUCTURE" | "PRESENTATION";
  isActive: boolean;
  createdAt: string;
}

interface WorkspaceInvite {
  id: string;
  email: string;
  systemRole: "ADMIN" | "USER";
  professionalRole: "PM" | "DEVELOPER" | "QA" | "DX" | "INFRASTRUCTURE" | "PRESENTATION";
  token: string;
  inviteUrl: string;
  status: "PENDING" | "ACCEPTED" | "CANCELLED" | "EXPIRED";
  invitedBy?: { id: string; displayName: string } | null;
  expiresAt: string;
  createdAt: string;
}

export default function TeamPage() {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite input state (chip-based like evalora-frontend)
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState("");
  const [inviteSystemRole, setInviteSystemRole] = useState<"ADMIN" | "USER">("USER");
  const [inviteProfRole, setInviteProfRole] = useState<
    "PM" | "DEVELOPER" | "QA" | "DX" | "INFRASTRUCTURE" | "PRESENTATION"
  >("DEVELOPER");
  const [inviting, setInviting] = useState(false);
  const [recentInviteLinks, setRecentInviteLinks] = useState<Array<{ email: string; link: string }>>([]);

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("ALL");
  const [busyId, setBusyId] = useState("");

  const isAdmin = currentUser?.systemRole === "ADMIN" || (currentUser as any)?.role === "admin";

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [membersRes, invitesRes] = await Promise.all([
        api.workspace.getMembers().catch(() => []),
        api.workspace.getInvites().catch(() => []),
      ]);

      const membersList = Array.isArray(membersRes)
        ? membersRes
        : (membersRes as any)?.data || [];
      const invitesList = Array.isArray(invitesRes)
        ? invitesRes
        : (invitesRes as any)?.data || [];

      setMembers(membersList);
      setInvites(invitesList);
    } catch (err: any) {
      console.error("Failed to load team data", err);
      showToast(err.message || "Failed to load team members", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived KPI metrics
  const pendingInvites = useMemo(
    () => invites.filter((inv) => inv.status === "PENDING"),
    [invites]
  );

  const adminCount = useMemo(
    () => members.filter((m) => m.systemRole === "ADMIN").length,
    [members]
  );

  const developerCount = useMemo(
    () => members.filter((m) => m.professionalRole === "DEVELOPER").length,
    [members]
  );

  const expiringSoonCount = useMemo(() => {
    return pendingInvites.filter((inv) => {
      const diff = new Date(inv.expiresAt).getTime() - Date.now();
      return diff > 0 && diff <= 48 * 60 * 60 * 1000;
    }).length;
  }, [pendingInvites]);

  // Chip management logic
  const mergeEmails = (raw: string): string[] | null => {
    const tokens = raw.split(/[\s,;]+/).map((t) => t.trim()).filter(Boolean);
    const invalid = tokens.filter((t) => !EMAIL_PATTERN.test(t));
    if (invalid.length > 0) {
      setEmailError(`Invalid email format: ${invalid.join(", ")}`);
      return null;
    }
    setEmailError("");
    const seen = new Set(inviteEmails.map((e) => e.toLowerCase()));
    const merged = [...inviteEmails];
    for (const t of tokens) {
      const lower = t.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        merged.push(t);
      }
    }
    return merged;
  };

  const commitEmails = (raw: string) => {
    const merged = mergeEmails(raw);
    if (!merged) return;
    setInviteEmails(merged);
    setEmailInput("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      commitEmails(emailInput);
    } else if (e.key === "Backspace" && !emailInput && inviteEmails.length > 0) {
      setInviteEmails((prev) => prev.slice(0, -1));
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    if (/[\s,;]/.test(text.trim())) {
      e.preventDefault();
      commitEmails(`${emailInput} ${text}`);
    }
  };

  const removeEmailChip = (email: string) => {
    setInviteEmails((prev) => prev.filter((e) => e !== email));
  };

  // Submit invitations
  const handleSendInvites = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalEmails = mergeEmails(emailInput);
    if (!finalEmails || finalEmails.length === 0) {
      if (inviteEmails.length === 0) {
        setEmailError("Please enter at least one valid work email address.");
        return;
      }
    }
    const emailsToSend = finalEmails && finalEmails.length > 0 ? finalEmails : inviteEmails;
    setInviting(true);
    setEmailError("");

    const newLinks: Array<{ email: string; link: string }> = [];
    let successCount = 0;
    const failedEmails: string[] = [];

    for (const email of emailsToSend) {
      try {
        const res = await api.workspace.createInvite({
          email,
          systemRole: inviteSystemRole,
          professionalRole: inviteProfRole,
        });
        const createdInvite = (res as any)?.data || res;
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const fullLink = `${origin}/invite/${createdInvite.token}`;
        newLinks.push({ email, link: fullLink });
        successCount++;
      } catch (err: any) {
        failedEmails.push(email);
        console.error(`Failed to invite ${email}`, err);
      }
    }

    setInviting(false);
    if (successCount > 0) {
      showToast(
        successCount === 1
          ? `Created invitation for ${newLinks[0].email}`
          : `Created ${successCount} invitations successfully!`,
        "success"
      );
      setRecentInviteLinks((prev) => [...newLinks, ...prev]);
      setInviteEmails(failedEmails);
      setEmailInput("");
      await loadData();
    } else if (failedEmails.length > 0) {
      showToast("Failed to create invitations. User might already exist.", "error");
    }
  };

  // Cancel invitation
  const handleCancelInvite = async (inviteId: string) => {
    setBusyId(inviteId);
    try {
      await api.workspace.cancelInvite(inviteId);
      showToast("Invitation cancelled successfully", "info");
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to cancel invitation", "error");
    } finally {
      setBusyId("");
    }
  };

  const copyToClipboard = async (text: string, label = "Invite link") => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`Copied ${label} to clipboard!`, "success");
    } catch {
      showToast("Failed to copy link", "error");
    }
  };

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (selectedRoleFilter !== "ALL") {
        if (selectedRoleFilter === "ADMIN" && m.systemRole !== "ADMIN") return false;
        if (selectedRoleFilter === "DEVELOPER" && m.professionalRole !== "DEVELOPER") return false;
        if (selectedRoleFilter === "PM" && m.professionalRole !== "PM") return false;
        if (selectedRoleFilter === "QA" && m.professionalRole !== "QA") return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (m.displayName || "").toLowerCase().includes(q);
        const matchesEmail = (m.email || "").toLowerCase().includes(q);
        if (!matchesName && !matchesEmail) return false;
      }
      return true;
    });
  }, [members, selectedRoleFilter, searchQuery]);

  // User avatar helper
  const getInitials = (name?: string, email?: string) => {
    const raw = (name || email || "User").trim();
    const parts = raw.split(" ").filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return raw.slice(0, 2).toUpperCase();
  };

  const getRoleBadgeStyle = (profRole: string, systemRole: string) => {
    if (systemRole === "ADMIN") {
      return "bg-rose-50 text-rose-700 border-rose-200";
    }
    switch (profRole) {
      case "PM":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "DEVELOPER":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "QA":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "INFRASTRUCTURE":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "DX":
        return "bg-cyan-50 text-cyan-700 border-cyan-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Breadcrumb & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <nav className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
              <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 hover:underline">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-slate-800">Team</span>
            </nav>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 tracking-tight">
              Team & Workspace Members
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-normal">
              Manage workspace members, assign roles, and invite new colleagues.
            </p>
          </div>
        </div>

        {/* Overview KPI Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Members */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Workspace Members
              </span>
              <div className="text-2xl font-bold font-serif text-slate-900">
                {members.length}
              </div>
              <p className="text-[11px] text-slate-500">
                {adminCount} {adminCount === 1 ? "Admin" : "Admins"} active
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 stroke-[2.2]" />
            </div>
          </div>

          {/* Card 2: Developers */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Engineers / Devs
              </span>
              <div className="text-2xl font-bold font-serif text-slate-900">
                {developerCount}
              </div>
              <p className="text-[11px] text-slate-500">
                Product developers
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Code className="w-5 h-5 stroke-[2.2]" />
            </div>
          </div>

          {/* Card 3: Pending Invites */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Pending Invites
              </span>
              <div className="text-2xl font-bold font-serif text-slate-900">
                {pendingInvites.length}
              </div>
              <p className="text-[11px] text-slate-500">
                Awaiting sign up
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5 stroke-[2.2]" />
            </div>
          </div>

          {/* Card 4: Expiring Soon */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Expiring Soon
              </span>
              <div className="text-2xl font-bold font-serif text-slate-900">
                {expiringSoonCount}
              </div>
              <p className="text-[11px] text-slate-500">
                Expiring within 48h
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 stroke-[2.2]" />
            </div>
          </div>
        </div>

        {/* Inline Invite Box (Merged Pattern from evalora-frontend) */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold font-serif text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-600" />
                <span>Invite Colleagues to Workspace</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Generate an invitation link. Colleagues set their name and password to join your workspace immediately.
              </p>
            </div>
          </div>

          <form onSubmit={handleSendInvites} className="space-y-4">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-start gap-3">
              {/* Chip Input Container */}
              <div className="flex-1">
                <div className="flex min-h-[44px] flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-1.5 transition-all focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20">
                  {inviteEmails.map((email) => (
                    <span
                      key={email}
                      className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 text-xs font-medium text-blue-800 animate-in fade-in zoom-in-95"
                    >
                      <span>{email}</span>
                      <button
                        type="button"
                        onClick={() => removeEmailChip(email)}
                        className="text-blue-500 hover:text-blue-800 transition-colors cursor-pointer"
                        title={`Remove ${email}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={emailInput}
                    onChange={(e) => {
                      setEmailInput(e.target.value);
                      if (emailError) setEmailError("");
                    }}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    onBlur={() => {
                      if (emailInput.trim()) commitEmails(emailInput);
                    }}
                    placeholder={
                      inviteEmails.length > 0
                        ? "Add another email..."
                        : "colleague@company.com (press Enter or comma)"
                    }
                    className="h-7 min-w-[200px] flex-1 bg-transparent px-1 text-xs text-slate-900 outline-none placeholder:text-slate-400"
                  />
                </div>
                <p className={`mt-1.5 text-[11px] ${emailError ? "text-rose-600 font-medium" : "text-slate-400"}`}>
                  {emailError ||
                    (inviteEmails.length > 0
                      ? `${inviteEmails.length} colleague${inviteEmails.length === 1 ? "" : "s"} ready to invite.`
                      : "Type email and press Enter, or paste comma-separated emails to invite multiple colleagues.")}
                </p>
              </div>

              {/* Role Selectors */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Professional Role */}
                <CustomDropdown
                  labelPrefix="Role"
                  value={inviteProfRole}
                  onChange={(val) => setInviteProfRole(val as any)}
                  options={INVITE_PROF_ROLE_OPTIONS}
                  menuWidth="min-w-[195px]"
                />

                {/* System Role */}
                <CustomDropdown
                  labelPrefix="Access"
                  value={inviteSystemRole}
                  onChange={(val) => setInviteSystemRole(val as any)}
                  options={INVITE_SYSTEM_ROLE_OPTIONS}
                  menuWidth="min-w-[170px]"
                />

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={inviting}
                  className="h-11 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer shrink-0"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>
                    {inviting
                      ? "Generating..."
                      : inviteEmails.length > 1
                      ? `Invite ${inviteEmails.length} Colleagues`
                      : "Send Invitation"}
                  </span>
                </button>
              </div>
            </div>

            {/* Recently generated invite links ready to copy */}
            {recentInviteLinks.length > 0 && (
              <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                  <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Invitations generated successfully:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setRecentInviteLinks([])}
                    className="text-slate-400 hover:text-slate-600 text-[11px]"
                  >
                    Clear list
                  </button>
                </div>
                <div className="space-y-1.5">
                  {recentInviteLinks.map((item) => (
                    <div
                      key={item.email}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-white border border-slate-200 text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-900">{item.email}</span>
                        <span className="text-slate-400 block truncate text-[11px]">{item.link}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(item.link, `Invite link for ${item.email}`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium text-xs transition-colors shrink-0 cursor-pointer self-start sm:self-auto"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </form>
        </section>

        {/* Filter and Members Table */}
        <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          {/* Header & Filter Toolbar */}
          <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold font-serif text-slate-900">
                Workspace Members ({members.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                All team members with access to workspace projects and resources.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Role Filter */}
              <FilterDropdown
                label="Role"
                allLabel="All roles"
                value={selectedRoleFilter}
                onChange={setSelectedRoleFilter}
                options={FILTER_ROLE_OPTIONS}
              />

              {/* Search input */}
              <div className="relative flex-1 md:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs h-9"
                />
              </div>
            </div>
          </div>

          {/* Members Table */}
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading workspace team members...</div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Users className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-800">No members match your criteria</p>
              <p className="text-xs text-slate-500">Try adjusting your search query or role filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-5 py-3">Member</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Professional Role</th>
                    <th className="px-4 py-3">System Access</th>
                    <th className="px-4 py-3">Joined Date</th>
                    <th className="px-4 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMembers.map((member) => {
                    const isSelf = member.id === currentUser?.id;
                    const initials = getInitials(member.displayName, member.email);

                    return (
                      <tr key={member.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Member Name + Avatar */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold text-[11px] flex items-center justify-center shrink-0 shadow-2xs">
                              {initials}
                            </div>
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-semibold text-slate-900 truncate">
                                {member.displayName || "Workspace Member"}
                              </span>
                              {isSelf && (
                                <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                  You
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="px-4 py-3.5 text-slate-600 font-mono text-[11px]">
                          {member.email}
                        </td>

                        {/* Professional Role Badge */}
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getRoleBadgeStyle(
                              member.professionalRole,
                              member.systemRole
                            )}`}
                          >
                            {member.professionalRole || "DEVELOPER"}
                          </span>
                        </td>

                        {/* System Role */}
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1.5 text-slate-700 font-medium">
                            <Shield
                              className={`w-3.5 h-3.5 ${
                                member.systemRole === "ADMIN" ? "text-rose-600" : "text-slate-400"
                              }`}
                            />
                            <span>{member.systemRole === "ADMIN" ? "Admin" : "Standard"}</span>
                          </span>
                        </td>

                        {/* Joined Date */}
                        <td className="px-4 py-3.5 text-slate-500">
                          {member.createdAt
                            ? new Date(member.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "-"}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5 text-right">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Active</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Pending Invitations Table */}
        <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold font-serif text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Pending Invitations ({pendingInvites.length})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Active invitation links awaiting account creation. Links expire automatically after 7 days.
              </p>
            </div>
          </div>

          {pendingInvites.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No pending invitations. Use the invite box above to invite new colleagues.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-5 py-3">Invited Email</th>
                    <th className="px-4 py-3">Assigned Role</th>
                    <th className="px-4 py-3">Invited By</th>
                    <th className="px-4 py-3">Expires At</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingInvites.map((inv) => {
                    const origin = typeof window !== "undefined" ? window.location.origin : "";
                    const fullLink = `${origin}/invite/${inv.token}`;

                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3 font-semibold text-slate-900 font-mono">
                          {inv.email}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-800">
                            {inv.professionalRole} ({inv.systemRole})
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {inv.invitedBy?.displayName || "Admin"}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {new Date(inv.expiresAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => copyToClipboard(fullLink, `Invite link for ${inv.email}`)}
                              className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium text-xs flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Copy className="w-3 h-3" />
                              <span>Copy Link</span>
                            </button>
                            <button
                              type="button"
                              disabled={busyId === inv.id}
                              onClick={() => handleCancelInvite(inv.id)}
                              className="px-2.5 py-1 rounded-md border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 font-medium text-xs flex items-center gap-1 transition-colors cursor-pointer"
                              title="Cancel invitation"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Cancel</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Roles & Permissions Reference Card */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold font-serif text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-indigo-600" />
            <span>Workspace Roles & Access Capabilities</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>System Administrator</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Full administrative access. Manages workspace configuration, invites members, assigns permissions, monitors audit trails, and archives projects.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span>Product / Engineer (Member)</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Collaborates across active workspace projects. Can author requirements, track tasks, upload documents, record decisions, and utilize AI Copilot.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>DevOps & Infrastructure</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Manages repository connections, GitHub issue sync, CI/CD integrations, deployment pipelines, and document ingestion sources.
              </p>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
