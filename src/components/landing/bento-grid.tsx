"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  CheckCircle2,
  FileText,
  Search,
  ShieldCheck,
  GitCommit,
  ExternalLink,
  ChevronRight,
  Database,
  ArrowUpRight,
  Lock,
  Cpu,
  Layers,
  Clock,
  UserCheck,
} from "lucide-react";

export const BentoGrid: React.FC = () => {
  const [activeSearchTab, setActiveSearchTab] = useState<"all" | "req" | "dec" | "tsk">("all");
  const [taskApproved, setTaskApproved] = useState(false);
  const [activeCitation, setActiveCitation] = useState<string | null>("ADR-001");

  return (
    <section id="features" className="relative py-24 px-4 sm:px-6 lg:px-8 bg-[#08090a] text-zinc-200 overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-indigo-600/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-16">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-3 max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/10 text-xs font-mono text-indigo-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>CORE CAPABILITIES</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
            Engineered for Grounded Execution
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
            Every feature is designed around strict project boundaries, verifiable citations, and zero-hallucination engineering workflows.
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1 (Span 2): Sourced AI Copilot */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
            whileHover={{ y: -3 }}
            className="md:col-span-2 rounded-2xl border border-white/[0.08] bg-[#0d0e13]/90 p-6 sm:p-7 relative overflow-hidden group shadow-xl hover:border-indigo-500/30 transition-all"
          >
            <div className="absolute -right-12 -top-12 w-56 h-56 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/20 transition-all" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-5 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-md">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-base">Grounded AI Copilot & Sourced Citations</h3>
                  <p className="text-xs text-zinc-400">Deterministic RAG citations linked to real project artifacts</p>
                </div>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 w-fit">
                Zero Hallucinations
              </span>
            </div>

            {/* Simulated Chat Interface */}
            <div className="mt-5 space-y-4">
              {/* User Prompt */}
              <div className="flex items-start gap-3 justify-end">
                <div className="bg-indigo-600/20 border border-indigo-500/30 rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-lg text-xs text-zinc-200">
                  Why did we choose PostgreSQL with pgvector over dedicated vector cloud DBs?
                </div>
              </div>

              {/* AI Copilot Answer */}
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#1a1b24] border border-white/10 flex items-center justify-center text-cyan-400 flex-shrink-0 mt-0.5">
                  <Cpu className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-2.5 flex-1">
                  <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl rounded-tl-sm p-4 text-xs text-zinc-300 leading-relaxed space-y-2">
                    <p>
                      Per{" "}
                      <button
                        onClick={() => setActiveCitation("ADR-001")}
                        className="inline-flex items-center gap-1 font-mono text-[11px] text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 px-1.5 py-0.5 rounded border border-cyan-500/30 transition-colors mx-0.5"
                      >
                        [ADR-001 §2]
                      </button>{" "}
                      and security requirement{" "}
                      <button
                        onClick={() => setActiveCitation("AIW-REQ-03")}
                        className="inline-flex items-center gap-1 font-mono text-[11px] text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-1.5 py-0.5 rounded border border-indigo-500/30 transition-colors mx-0.5"
                      >
                        [AIW-REQ-03 §4]
                      </button>
                      , PostgreSQL with pgvector keeps high-dimensional vector embeddings co-located with relational tables in a single ACID boundary. This eliminates out-of-band sync drift and third-party data egress.
                    </p>
                  </div>

                  {/* Active Source Inspector */}
                  <div className="p-3 rounded-xl bg-[#090a0f] border border-white/[0.06] text-[11px] font-mono text-zinc-400 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-zinc-200">
                        {activeCitation === "ADR-001"
                          ? "ADR-001: Vector Storage Engine Architecture (ACCEPTED)"
                          : "AIW-REQ-03: Data Sovereignty & Isolation Specs (APPROVED)"}
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Verified 100% Match
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card 2 (Span 1): Automated Task Extraction */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: 0.2 }}
            whileHover={{ y: -3 }}
            className="rounded-2xl border border-white/[0.08] bg-[#0d0e13]/90 p-6 relative overflow-hidden group shadow-xl hover:border-emerald-500/30 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono text-zinc-500">HUMAN-IN-THE-LOOP</span>
              </div>

              <h3 className="font-semibold text-white text-base mt-4">Meeting to Task Extraction</h3>
              <p className="text-xs text-zinc-400 mt-1">
                AI extracts actionable action items from transcripts, requiring explicit human approval.
              </p>

              {/* Transcript Snippet */}
              <div className="mt-4 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] text-xs space-y-1.5">
                <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
                  <Clock className="w-3 h-3" /> Sprint Sync Transcript · 14:22
                </div>
                <p className="text-zinc-300 italic text-[11px] leading-relaxed">
                  &ldquo;Alice: We need to ensure TypeORM migrations run idempotently before deploying to staging.&rdquo;
                </p>
              </div>

              {/* Extracted Draft Task */}
              <div className="mt-3 p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-emerald-400">AIW-TSK-42 (Draft)</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-mono">
                    High Conf 98%
                  </span>
                </div>
                <div className="text-xs font-medium text-zinc-200">
                  Verify idempotent database migration execution
                </div>
                <div className="text-[10px] text-zinc-400">Assignee: Alice (Admin) • Due: Next Sprint</div>
              </div>
            </div>

            {/* Interactive Approval Button */}
            <button
              onClick={() => setTaskApproved(!taskApproved)}
              className={`mt-4 w-full py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                taskApproved
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
                  : "bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 border border-white/10"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{taskApproved ? "Task Approved & Synced" : "Click to Approve Draft Task"}</span>
            </button>
          </motion.div>

          {/* Card 3 (Span 1): ADR Graph & Cycle Prevention */}
          <motion.div
            id="architecture"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
            whileHover={{ y: -3 }}
            className="rounded-2xl border border-white/[0.08] bg-[#0d0e13]/90 p-6 relative overflow-hidden group shadow-xl hover:border-purple-500/30 transition-all flex flex-col justify-between scroll-mt-24"
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                  <GitCommit className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">
                  DAG Engine
                </span>
              </div>

              <h3 className="font-semibold text-white text-base mt-4">ADR Supersession Graph</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Architectural decisions form a directed acyclic graph preventing circular references.
              </p>

              {/* Visual DAG Chain */}
              <div className="mt-5 space-y-2.5">
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs">
                  <div>
                    <div className="font-mono text-[10px] text-zinc-500">ADR-001 (SUPERSEDED)</div>
                    <div className="font-medium text-zinc-400 line-through">MongoDB Document Store</div>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">Deprecated</span>
                </div>

                <div className="flex justify-center">
                  <div className="w-px h-4 bg-gradient-to-b from-zinc-600 to-purple-400" />
                </div>

                <div className="p-3 rounded-lg bg-purple-950/20 border border-purple-500/40 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-mono text-[10px] text-purple-400">ADR-003 (ACCEPTED)</div>
                    <div className="font-medium text-white">PostgreSQL & pgvector Hybrid</div>
                  </div>
                  <span className="text-[10px] text-purple-300 font-mono bg-purple-500/20 px-1.5 py-0.5 rounded">
                    Active
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-zinc-400 font-mono">
              <span>0 Cyclic Cycles</span>
              <span className="text-purple-400">Kahn&apos;s Algorithm</span>
            </div>
          </motion.div>

          {/* Card 4 (Span 2): pgvector & Multi-Entity Instant Search */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: 0.2 }}
            whileHover={{ y: -3 }}
            className="md:col-span-2 rounded-2xl border border-white/[0.08] bg-[#0d0e13]/90 p-6 sm:p-7 relative overflow-hidden group shadow-xl hover:border-cyan-500/30 transition-all"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Search className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-base">pgvector Multi-Entity Instant Search</h3>
                  <p className="text-xs text-zinc-400">Full-text & vector hybrid search across all workspace entities</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-400 bg-white/[0.04] px-2.5 py-1 rounded-full border border-white/[0.06]">
                <Database className="w-3 h-3 text-cyan-400" /> PostgreSQL pgvector
              </div>
            </div>

            {/* Interactive Search Simulation */}
            <div className="mt-5 space-y-3.5">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  readOnly
                  value="database migration safety"
                  className="w-full bg-[#08090a] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-200 font-mono focus:outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-zinc-500 bg-white/5 px-2 py-0.5 rounded">
                  24ms
                </span>
              </div>

              {/* Facet filter tabs */}
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                {(
                  [
                    { id: "all", label: "All Results (6)" },
                    { id: "req", label: "Requirements (2)" },
                    { id: "dec", label: "Decisions (1)" },
                    { id: "tsk", label: "Tasks (3)" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSearchTab(tab.id)}
                    className={`px-3 py-1 rounded-lg font-medium transition-all ${
                      activeSearchTab === tab.id
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                        : "bg-white/[0.02] text-zinc-400 hover:text-zinc-200 border border-white/[0.04]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search Result Items */}
              <div className="space-y-2">
                {(activeSearchTab === "all" || activeSearchTab === "req") && (
                  <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:border-white/10 transition-colors flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        AIW-REQ-04
                      </span>
                      <span className="text-xs text-zinc-200">Zero-downtime database migration schema rules</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono">Similarity: 0.94</span>
                  </div>
                )}

                {(activeSearchTab === "all" || activeSearchTab === "dec") && (
                  <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:border-white/10 transition-colors flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        AIW-DEC-03
                      </span>
                      <span className="text-xs text-zinc-200">Explicit release-time migration runner strategy</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono">Similarity: 0.91</span>
                  </div>
                )}

                {(activeSearchTab === "all" || activeSearchTab === "tsk") && (
                  <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:border-white/10 transition-colors flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        AIW-TSK-18
                      </span>
                      <span className="text-xs text-zinc-200">Execute TypeORM migration scripts on isolated DB</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono">Similarity: 0.89</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
