"use client";

import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, FileText, GitCommit, Users, Shield, Zap } from "lucide-react";

export const ParallaxTeam: React.FC = () => {
  return (
    <section className="py-24 px-4 bg-[#08090a] border-t border-white/[0.06]">
      <div className="max-w-6xl mx-auto space-y-16">
        <div className="text-center space-y-3">
          <span className="text-[11px] font-mono tracking-widest uppercase text-indigo-400">
            Engineered for High-Trust Teams
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Architecture Decisions & Traceable Execution
          </h2>
          <p className="text-zinc-400 max-w-2xl mx-auto text-xs sm:text-sm">
            Zero hallucinations. Every requirement, task, and architectural decision is verified and linked to authorized project members.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <motion.div
            whileHover={{ y: -3 }}
            className="p-6 rounded-xl border border-white/[0.08] bg-[#121318]/90 space-y-3 shadow-sm hover:border-indigo-500/30 transition-all"
          >
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-white">Project-Local Keys</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Every item has a human-readable identifier like <code className="font-mono text-indigo-300 bg-white/5 px-1 py-0.5 rounded">AIW-REQ-1</code> and <code className="font-mono text-indigo-300 bg-white/5 px-1 py-0.5 rounded">AIW-TSK-1</code> for clear cross-referencing.
            </p>
          </motion.div>

          <motion.div
            whileHover={{ y: -3 }}
            className="p-6 rounded-xl border border-white/[0.08] bg-[#121318]/90 space-y-3 shadow-sm hover:border-purple-500/30 transition-all"
          >
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <GitCommit className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-white">ADR Supersession Graph</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Formal Architecture Decision Records with cycle detection preventing circular replacements and preserving historical context.
            </p>
          </motion.div>

          <motion.div
            whileHover={{ y: -3 }}
            className="p-6 rounded-xl border border-white/[0.08] bg-[#121318]/90 space-y-3 shadow-sm hover:border-emerald-500/30 transition-all"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-white">Bangkok Timezone Tasks</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Real progress rate calculation formula <code className="font-mono text-emerald-300 bg-white/5 px-1 py-0.5 rounded">done / (total - cancelled)</code> with timezone-aware overdue counting.
            </p>
          </motion.div>

          <motion.div
            whileHover={{ y: -3 }}
            className="p-6 rounded-xl border border-white/[0.08] bg-[#121318]/90 space-y-3 shadow-sm hover:border-blue-500/30 transition-all"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-white">Meeting Transcripts</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Structured meeting agendas, attendee membership checks, and versioned transcript history integrated with AI Copilot RAG.
            </p>
          </motion.div>

          <motion.div
            whileHover={{ y: -3 }}
            className="p-6 rounded-xl border border-white/[0.08] bg-[#121318]/90 space-y-3 shadow-sm hover:border-amber-500/30 transition-all"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-white">Strict Security Scoping</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              404 Privacy Isolation for non-members, Argon2id passwords, opaque cookie sessions, and CSRF token verification.
            </p>
          </motion.div>

          <motion.div
            whileHover={{ y: -3 }}
            className="p-6 rounded-xl border border-white/[0.08] bg-[#121318]/90 space-y-3 shadow-sm hover:border-sky-500/30 transition-all"
          >
            <div className="w-9 h-9 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-white">Multi-Entity Search</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Unified full-text search across all requirements, decisions, tasks, meetings, and documents with faceted counts by type.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
