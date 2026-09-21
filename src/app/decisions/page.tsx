"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { AppLayout } from "@/components/app-layout";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Clock,
  AlertCircle,
  GitPullRequest,
  Search,
  CheckCircle2,
  Copy,
  Lightbulb,
  Sparkles,
  CheckSquare,
  Bot,
  FileCheck2,
  GitCommit,
  ArrowRight,
  GitMerge,
  History,
  X,
  Layers,
  ShieldCheck,
} from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";

export default function DecisionsPage() {
  const { currentProject } = useAuth();
  const { showToast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "graph">("cards");

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  // Form state
  const [title, setTitle] = useState("");
  const [decisionText, setDecisionText] = useState("");
  const [rationale, setRationale] = useState("");
  const [requirementId, setRequirementId] = useState("");
  const [supersedesDecisionId, setSupersedesDecisionId] = useState("");
  const [requirements, setRequirements] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Revisions Modal state
  const [revisionsModalDec, setRevisionsModalDec] = useState<any | null>(null);
  const [revisionsList, setRevisionsList] = useState<any[]>([]);
  const [loadingRevisions, setLoadingRevisions] = useState(false);

  const openRevisions = async (dec: any) => {
    if (!currentProject) return;
    setRevisionsModalDec(dec);
    setLoadingRevisions(true);
    try {
      const revs = await api.decisions.listRevisions(currentProject.id, dec.id);
      setRevisionsList(revs || []);
    } catch (err: any) {
      showToast(err.message || "Failed to load decision revisions", "error");
    } finally {
      setLoadingRevisions(false);
    }
  };

  const loadData = async () => {
    if (!currentProject) return;
    setLoading(true);
    try {
      const [data, reqs] = await Promise.all([
        api.decisions.list(currentProject.id),
        api.requirements.list(currentProject.id).catch(() => []),
      ]);
      setItems(data || []);
      setRequirements(reqs || []);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to load decisions", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("create") === "true") {
        setShowCreate(true);
      }
      const q = params.get("search");
      if (q) {
        setSearchQuery(q);
      }
      const rId = params.get("reqId");
      if (rId) {
        setRequirementId(rId);
        setShowCreate(true);
      }
      const t = params.get("title");
      if (t) {
        setTitle(t);
      }
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Copied ${label} to clipboard!`, "info");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject || !title.trim() || !decisionText.trim()) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const created = await api.decisions.create(currentProject.id, {
        title: title.trim(),
        decisionText: decisionText.trim(),
        rationale: rationale.trim() || undefined,
        requirementId: requirementId ? requirementId : undefined,
        supersedesDecisionId: supersedesDecisionId ? supersedesDecisionId : undefined,
      });
      setTitle("");
      setDecisionText("");
      setRationale("");
      setRequirementId("");
      setSupersedesDecisionId("");
      setShowCreate(false);
      showToast(`Created ${created.displayKey || "decision"} successfully!`, "success");
      await loadData();
    } catch (err: any) {
      const rawMsg = err.message || "Failed to create decision";
      const isCycle =
        rawMsg.toLowerCase().includes("cycle") ||
        rawMsg.toLowerCase().includes("supersede itself") ||
        rawMsg.includes("SUPERSESSION_CYCLE");
      const friendlyMsg = isCycle
        ? "Circular supersession detected! A decision cannot supersede itself or form an indirect loop."
        : rawMsg;
      setErrorMsg(friendlyMsg);
      showToast(friendlyMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (dec: any, newStatus: string) => {
    if (!currentProject) return;
    try {
      await api.decisions.update(currentProject.id, dec.id, {
        version: dec.version,
        status: newStatus,
      });
      showToast(`${dec.displayKey} updated to ${newStatus}`, "success");
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to update decision status", "error");
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        q === "" ||
        item.id.toLowerCase() === q ||
        item.title.toLowerCase().includes(q) ||
        (item.displayKey && item.displayKey.toLowerCase().includes(q)) ||
        (item.decisionText && item.decisionText.toLowerCase().includes(q)) ||
        (item.rationale && item.rationale.toLowerCase().includes(q));

      const matchesStatus =
        selectedStatus === "ALL" || item.status === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [items, searchQuery, selectedStatus]);

  // Supersession Graph computation
  const graphData = useMemo(() => {
    const map = new Map<string, any>();
    items.forEach((item) => map.set(item.id, item));

    const supersededByMap = new Map<string, any[]>();
    items.forEach((item) => {
      if (item.supersedesDecisionId) {
        const list = supersededByMap.get(item.supersedesDecisionId) || [];
        list.push(item);
        supersededByMap.set(item.supersedesDecisionId, list);
      }
    });

    const chainRoots: any[] = [];
    items.forEach((item) => {
      const isRoot = !item.supersedesDecisionId || !map.has(item.supersedesDecisionId);
      const hasChildren = (supersededByMap.get(item.id) || []).length > 0;
      if (isRoot && hasChildren) {
        chainRoots.push(item);
      }
    });

    const chains: any[][] = [];
    chainRoots.forEach((root) => {
      const buildPaths = (curr: any): any[][] => {
        const children = supersededByMap.get(curr.id) || [];
        if (children.length === 0) {
          return [[curr]];
        }
        const paths: any[][] = [];
        children.forEach((child) => {
          const subPaths = buildPaths(child);
          subPaths.forEach((sp) => paths.push([curr, ...sp]));
        });
        return paths;
      };
      chains.push(...buildPaths(root));
    });

    const standalone = items.filter(
      (item) => !item.supersedesDecisionId && (supersededByMap.get(item.id) || []).length === 0
    );

    return { chains, standalone, supersededByMap };
  }, [items]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACCEPTED":
        return <Badge variant="ontrack" className="text-[10px]">ACCEPTED</Badge>;
      case "SUPERSEDED":
        return <Badge className="bg-slate-100 text-slate-500 border border-slate-200 line-through text-[10px]">SUPERSEDED</Badge>;
      default:
        return <Badge className="bg-blue-50 text-codex-accent border border-blue-100 text-[10px]">PROPOSED</Badge>;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto pb-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-codex-border pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-codex-accent flex items-center justify-center border border-blue-100">
                <GitPullRequest className="w-4 h-4" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-codex-text font-serif">
                Decisions (ADR)
              </h1>
            </div>
            <p className="text-xs text-codex-muted mt-1">
              Document critical technical decisions, context, and rationale to maintain architectural integrity.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Link href="/requirements">
              <Button size="sm" variant="outline" className="h-9 text-xs gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5 text-codex-accent" />
                <span>Requirements</span>
              </Button>
            </Link>
            <Button
              size="sm"
              onClick={() => setShowCreate(!showCreate)}
              className="gap-1.5 text-xs bg-codex-accent hover:bg-codex-hover text-white shadow-sm h-9"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showCreate ? "Close Form" : "Log Decision"}</span>
            </Button>
          </div>
        </div>

        {/* Create ADR Card */}
        {showCreate && (
          <Card className="border-codex-accent/30 shadow-xl animate-in fade-in slide-in-from-top-2">
            <CardHeader className="pb-3 border-b border-codex-border">
              <CardTitle className="text-sm font-bold text-codex-text flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-codex-accent" />
                <span>Log New Architectural Decision Record (ADR)</span>
              </CardTitle>
            </CardHeader>
            <form onSubmit={handleCreate}>
              <div className="p-5 space-y-4">
                {errorMsg && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-codex-warning text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Decision Title *</label>
                  <Input
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Adopt Argon2id for User Password Hashing"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">Link Scope Requirement (Optional)</label>
                    <span className="text-[10px] text-slate-400">Connect to product requirements</span>
                  </div>
                  <select
                    value={requirementId}
                    onChange={(e) => setRequirementId(e.target.value)}
                    className="w-full rounded-lg bg-white border border-codex-border p-2 text-xs text-codex-text shadow-sm focus:outline-none focus:ring-2 focus:ring-codex-accent cursor-pointer"
                  >
                    <option value="">-- None (Standalone Architecture Decision) --</option>
                    {requirements.map((req) => (
                      <option key={req.id} value={req.id}>
                        {req.displayKey ? `[${req.displayKey}] ` : ""}{req.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">Supersedes Existing Decision (Optional)</label>
                    <span className="text-[10px] text-amber-600 font-medium">Replaces previous architecture ADR</span>
                  </div>
                  <select
                    value={supersedesDecisionId}
                    onChange={(e) => setSupersedesDecisionId(e.target.value)}
                    className="w-full rounded-lg bg-white border border-codex-border p-2 text-xs text-codex-text shadow-sm focus:outline-none focus:ring-2 focus:ring-codex-accent cursor-pointer"
                  >
                    <option value="">-- None (Initial or independent baseline) --</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.displayKey ? `[${item.displayKey}] ` : ""}{item.title} ({item.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">Decision Outcome *</label>
                    <span className="text-[10px] text-slate-400">What is the technical choice being made?</span>
                  </div>
                  <textarea
                    required
                    rows={3}
                    value={decisionText}
                    onChange={(e) => setDecisionText(e.target.value)}
                    placeholder="e.g., All user passwords will be hashed using Argon2id with memory cost 64MB and 3 iterations, stored securely in PostgreSQL."
                    className="w-full rounded-lg bg-white border border-codex-border p-2.5 text-xs text-codex-text shadow-sm focus:outline-none focus:ring-2 focus:ring-codex-accent"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">Rationale & Context</label>
                    <span className="text-[10px] text-slate-400">Why was this option chosen over alternatives?</span>
                  </div>
                  <textarea
                    rows={3}
                    value={rationale}
                    onChange={(e) => setRationale(e.target.value)}
                    placeholder="e.g., Argon2id won the Password Hashing Competition and provides superior resistance against GPU/ASIC attacks compared to bcrypt and scrypt."
                    className="w-full rounded-lg bg-white border border-codex-border p-2.5 text-xs text-codex-text shadow-sm focus:outline-none focus:ring-2 focus:ring-codex-accent"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-codex-border flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="bg-codex-accent hover:bg-codex-hover text-white text-xs px-4"
                >
                  {submitting ? "Saving..." : "Save Decision"}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* View Mode Toggle & Filter Tabs */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center p-1 bg-white border border-slate-200 rounded-xl shadow-xs gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedStatus("ALL")}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    selectedStatus === "ALL"
                      ? "bg-[#161927] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  All ({items.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatus("PROPOSED")}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    selectedStatus === "PROPOSED"
                      ? "bg-[#161927] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Proposed ({items.filter((i) => i.status === "PROPOSED").length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatus("ACCEPTED")}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    selectedStatus === "ACCEPTED"
                      ? "bg-[#161927] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Accepted ({items.filter((i) => i.status === "ACCEPTED").length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatus("SUPERSEDED")}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    selectedStatus === "SUPERSEDED"
                      ? "bg-[#161927] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Superseded ({items.filter((i) => i.status === "SUPERSEDED").length})
                </button>
              </div>

              {/* View Mode Toggle */}
              <div className="inline-flex items-center p-1 bg-slate-100/90 border border-slate-200 rounded-xl shadow-xs gap-1">
                <button
                  type="button"
                  onClick={() => setViewMode("cards")}
                  className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                    viewMode === "cards"
                      ? "bg-white text-slate-900 shadow-xs font-semibold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Card View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("graph")}
                  className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                    viewMode === "graph"
                      ? "bg-[#161927] text-white shadow-xs font-semibold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <GitMerge className="w-3.5 h-3.5" />
                  <span>Supersession Graph</span>
                </button>
              </div>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search decisions by title or key..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-codex-accent focus:border-codex-accent shadow-xs"
              />
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="space-y-3">
            <div className="h-28 rounded-2xl bg-white animate-pulse border border-slate-200" />
            <div className="h-28 rounded-2xl bg-white animate-pulse border border-slate-200" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16 p-8 rounded-2xl border border-dashed border-slate-200 bg-white space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-codex-accent flex items-center justify-center mx-auto border border-blue-100">
              <GitPullRequest className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 font-serif">
              {items.length === 0 ? "No Decisions Documented Yet" : "No Matching Decisions Found"}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {items.length === 0
                ? "Keep track of foundational architectural decisions so your team stays aligned."
                : "Try adjusting your search keywords or switching status tabs."}
            </p>
            {items.length === 0 ? (
              <Button size="sm" onClick={() => setShowCreate(true)} className="text-xs bg-codex-accent hover:bg-codex-hover text-white">
                <Plus className="w-3.5 h-3.5 mr-1" /> Log First Decision
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedStatus("ALL");
                }}
                className="text-xs"
              >
                Clear Filters
              </Button>
            )}
          </div>
        ) : viewMode === "graph" ? (
          /* Visual Supersession DAG Graph View */
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* DAG Explainer Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-slate-50 border border-blue-100/80 flex items-start gap-3.5 shadow-xs">
              <div className="w-8 h-8 rounded-xl bg-codex-accent text-white flex items-center justify-center shrink-0 shadow-xs">
                <GitMerge className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-900 font-serif">
                    Architectural Supersession DAG (Directed Acyclic Graph)
                  </h3>
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px]">
                    <ShieldCheck className="w-3 h-3 mr-1 inline" /> Kahn&apos;s Cycle Verified
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  Decisions evolve over time. When an architecture changes, new ADRs supersede older ones, retiring previous choices while maintaining an immutable historical chain.
                </p>
              </div>
            </div>

            {/* Evolution Lineages */}
            {graphData.chains.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <GitCommit className="w-4 h-4 text-codex-accent" />
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                    Supersession Evolution Chains ({graphData.chains.length})
                  </h3>
                </div>

                <div className="space-y-4">
                  {graphData.chains.map((chain, cIdx) => (
                    <Card key={cIdx} className="bg-white border-slate-200 shadow-xs overflow-hidden">
                      <div className="bg-slate-50/80 px-4 py-2 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
                        <span className="font-semibold text-slate-700">Evolution Path #{cIdx + 1}</span>
                        <span>{chain.length} Decision Generations</span>
                      </div>
                      <div className="p-5 overflow-x-auto">
                        <div className="flex items-center gap-3 min-w-max">
                          {chain.map((stepNode: any, sIdx: number) => {
                            const isLatest = sIdx === chain.length - 1;
                            return (
                              <React.Fragment key={stepNode.id}>
                                <div
                                  className={`w-72 p-4 rounded-xl border transition-all ${
                                    isLatest
                                      ? "bg-blue-50/40 border-codex-accent/60 shadow-sm ring-1 ring-codex-accent/20"
                                      : "bg-slate-50/70 border-slate-200 opacity-80 hover:opacity-100"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-200/60">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono text-xs font-bold text-codex-accent">
                                        {stepNode.displayKey}
                                      </span>
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        v{stepNode.version}
                                      </span>
                                    </div>
                                    {getStatusBadge(stepNode.status)}
                                  </div>

                                  <h4 className="text-xs font-bold text-slate-900 font-serif line-clamp-1 mb-1.5" title={stepNode.title}>
                                    {stepNode.title}
                                  </h4>
                                  <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed bg-white p-2 rounded border border-slate-100 mb-3">
                                    {stepNode.decisionText}
                                  </p>

                                  <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                                    <span>{formatDate(stepNode.createdAt)}</span>
                                    <button
                                      type="button"
                                      onClick={() => openRevisions(stepNode)}
                                      className="text-codex-accent hover:underline flex items-center gap-1 font-mono font-medium"
                                    >
                                      <History className="w-3 h-3" /> Revisions
                                    </button>
                                  </div>
                                </div>

                                {!isLatest && (
                                  <div className="flex flex-col items-center justify-center px-1 text-slate-400">
                                    <ArrowRight className="w-5 h-5 text-codex-accent" />
                                    <span className="text-[9px] font-mono text-slate-400 uppercase tracking-tighter">
                                      superseded by
                                    </span>
                                  </div>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Baseline Standalone Architectures */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-500" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                  Baseline Architecture Standards (Independent • {graphData.standalone.length})
                </h3>
              </div>

              {graphData.standalone.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 text-center">
                  All recorded decisions currently participate in evolution chains.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {graphData.standalone.map((item: any) => (
                    <Card key={item.id} className="bg-white border-slate-200 shadow-xs p-4 space-y-2 hover:shadow-sm transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-codex-accent bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                            {item.displayKey}
                          </span>
                          {getStatusBadge(item.status)}
                          <span className="text-[10px] text-slate-400 font-mono">v{item.version}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => openRevisions(item)}
                          className="text-slate-400 hover:text-slate-700 p-1 rounded"
                          title="View Revisions"
                        >
                          <History className="w-3.5 h-3.5 text-codex-accent" />
                        </button>
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 font-serif">{item.title}</h4>
                      <p className="text-[11px] text-slate-600 line-clamp-2 bg-slate-50 p-2 rounded border border-slate-100">
                        {item.decisionText}
                      </p>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-400">
                        <span>Logged {formatDate(item.createdAt)}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSupersedesDecisionId(item.id);
                            setShowCreate(true);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="text-codex-accent hover:underline font-medium font-mono"
                        >
                          + Supersede this ADR
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Cards View */
          <div className="space-y-4">
            {filteredItems.map((dec) => {
              const isSearchMatch =
                searchQuery.trim() !== "" &&
                (dec.displayKey?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  dec.title?.toLowerCase().includes(searchQuery.toLowerCase()));

              const linkedReq = dec.requirement || requirements.find((r) => r.id === dec.requirementId);
              const predecessor = items.find((i) => i.id === dec.supersedesDecisionId);
              const successor = items.find((i) => i.supersedesDecisionId === dec.id);

              return (
                <Card
                  key={dec.id}
                  className={`bg-white border transition-all duration-150 shadow-xs hover:shadow-md ${
                    isSearchMatch ? "border-codex-accent ring-1 ring-codex-accent/40" : "border-slate-200"
                  }`}
                >
                  <CardHeader className="p-5 pb-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => copyToClipboard(dec.displayKey || dec.id, "decision key")}
                          className="flex items-center gap-1 font-mono text-xs font-bold text-codex-accent bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-100 transition-all group"
                          title="Click to copy key"
                        >
                          <span>{dec.displayKey || dec.id.substring(0, 8)}</span>
                          <Copy className="w-3 h-3 text-codex-accent/60 group-hover:text-codex-accent" />
                        </button>
                        {getStatusBadge(dec.status)}
                        <span className="text-[10px] text-slate-400 font-mono">Rev: v{dec.version}</span>
                        {predecessor && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded"
                            title={`Supersedes previous decision ${predecessor.displayKey}: ${predecessor.title}`}
                          >
                            <GitMerge className="w-3 h-3 text-amber-600" />
                            <span>Supersedes: {predecessor.displayKey}</span>
                          </span>
                        )}
                        {linkedReq && (
                          <Link
                            href={`/requirements?search=${encodeURIComponent(linkedReq.displayKey || linkedReq.id)}`}
                            className="inline-flex items-center gap-1 text-[10px] font-mono text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded hover:bg-blue-100 transition-all"
                            title="View linked requirement"
                          >
                            <FileCheck2 className="w-3 h-3 text-blue-600" />
                            <span>Req: {linkedReq.displayKey || linkedReq.title}</span>
                          </Link>
                        )}
                      </div>

                      {/* Status switcher */}
                      <div className="flex items-center gap-1.5 self-start sm:self-auto">
                        <span className="text-[11px] text-slate-400 font-medium">Status:</span>
                        <select
                          value={dec.status}
                          onChange={(e) => updateStatus(dec, e.target.value)}
                          className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-codex-accent cursor-pointer shadow-2xs"
                        >
                          <option value="PROPOSED">PROPOSED</option>
                          <option value="ACCEPTED">ACCEPTED</option>
                          <option value="SUPERSEDED">SUPERSEDED</option>
                        </select>
                      </div>
                    </div>

                    <CardTitle className="text-base font-bold text-slate-900 font-serif pt-2 leading-snug">
                      {dec.title}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="p-5 pt-1 space-y-3">
                    {/* Superseded Warning Banner if replaced by another ADR */}
                    {successor && (
                      <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>
                            This architecture has been superseded by <strong>{successor.displayKey}</strong>: {successor.title}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSearchQuery(successor.displayKey || successor.id)}
                          className="text-[11px] underline font-medium text-amber-800 hover:text-amber-950 shrink-0"
                        >
                          View replacement
                        </button>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#2D8A60]" /> Decision Outcome
                      </div>
                      <p className="text-xs text-slate-800 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                        {dec.decisionText}
                      </p>
                    </div>

                    {dec.rationale && (
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> Context & Rationale
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
                          {dec.rationale}
                        </p>
                      </div>
                    )}

                    {/* Cross-Workflow Navigation Hub */}
                    <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        {/* Create Action Task */}
                        <Link
                          href={`/tasks?create=true&title=${encodeURIComponent(`Implement ADR [${dec.displayKey}]: ${dec.title}`)}&priority=HIGH`}
                        >
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] border-slate-200 text-slate-700 hover:bg-slate-50 gap-1 px-2.5 font-medium shadow-2xs"
                            title="Create a task to implement this architectural decision"
                          >
                            <CheckSquare className="w-3 h-3 text-codex-accent" />
                            <span>Create Action Task</span>
                          </Button>
                        </Link>

                        {/* Revisions History Button */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openRevisions(dec)}
                          className="h-7 text-[11px] border-slate-200 text-slate-600 hover:bg-slate-50 gap-1 px-2.5 font-medium shadow-2xs"
                          title="View revision snapshot history"
                        >
                          <History className="w-3 h-3 text-codex-accent" />
                          <span>Revisions (v{dec.version})</span>
                        </Button>

                        {/* Discuss with Copilot */}
                        <Link
                          href={`/assistant?prompt=${encodeURIComponent(`Review architectural decision [${dec.displayKey}]: "${dec.title}". Outcome: "${dec.decisionText}". Rationale: "${dec.rationale || ''}". What are the key implementation requirements and trade-offs?`)}&mode=DEVELOPER`}
                        >
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-[11px] text-slate-500 hover:text-slate-800 gap-1 px-2"
                            title="Analyze this ADR with AI Copilot"
                          >
                            <Bot className="w-3 h-3 text-codex-accent" />
                            <span className="hidden sm:inline">Discuss with Copilot</span>
                          </Button>
                        </Link>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                        <span>Documented {formatDate(dec.createdAt)}</span>
                        {dec.createdBy && (
                          <span className="hidden sm:inline">
                            Author: {dec.createdBy.displayName || dec.createdBy.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Revisions History Modal */}
        {revisionsModalDec && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-codex-accent bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      {revisionsModalDec.displayKey || revisionsModalDec.id.substring(0, 8)}
                    </span>
                    <h2 className="text-base font-bold text-slate-900 font-serif">
                      Revision History
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                    {revisionsModalDec.title}
                  </p>
                </div>
                <button
                  onClick={() => setRevisionsModalDec(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                {loadingRevisions ? (
                  <div className="py-12 text-center text-xs text-slate-400">Loading revision audit trail...</div>
                ) : revisionsList.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl p-4 border border-dashed border-slate-200">
                    No historical revisions recorded yet. This decision is currently at baseline version (v{revisionsModalDec.version}).
                  </div>
                ) : (
                  <div className="space-y-4">
                    {revisionsList.map((rev: any, idx: number) => (
                      <div
                        key={rev.id || idx}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 relative"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-[#161927] text-white text-[10px] font-mono">
                              v{rev.version}
                            </Badge>
                            {getStatusBadge(rev.status)}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {formatDateTime(rev.createdAt)}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-800 font-serif">{rev.title}</h4>
                        <div className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-100">
                          {rev.decisionText}
                        </div>
                        {rev.rationale && (
                          <div className="text-[11px] text-slate-500 bg-white/60 p-2 rounded-lg border border-slate-100 italic">
                            <span className="font-semibold not-italic text-slate-600">Rationale: </span>
                            {rev.rationale}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 pt-1">
                          Snapshot captured by: {rev.changedBy || "System"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRevisionsModalDec(null)}
                  className="text-xs"
                >
                  Close History
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Workflow Progression Banner */}
        <div className="mt-8 p-5 rounded-2xl border border-slate-200 bg-white shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-codex-accent flex items-center justify-center shrink-0 border border-blue-100">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 font-serif">Next in Workflow: Implementation Tasks</p>
              <p className="text-[11px] text-slate-500">Convert accepted architectural decisions into actionable development tasks and assign them to team members.</p>
            </div>
          </div>
          <Link href="/tasks">
            <Button size="sm" className="text-xs bg-codex-accent hover:bg-codex-hover text-white shadow-xs shrink-0">
              Go to Tasks →
            </Button>
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
