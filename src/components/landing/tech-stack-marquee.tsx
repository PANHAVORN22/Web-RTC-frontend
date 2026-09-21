"use client";

import React from "react";
import { motion } from "framer-motion";
import { Database, Shield, Server, Terminal, Lock, Cpu, Globe, CheckCircle2 } from "lucide-react";

export const TechStackMarquee: React.FC = () => {
  const stack = [
    { name: "PostgreSQL 16", tag: "Relational ACID Core", icon: Database },
    { name: "pgvector", tag: "Embedded Vector Engine", icon: Cpu },
    { name: "NestJS 10", tag: "Strict Modular Backend", icon: Server },
    { name: "Next.js 14", tag: "App Router & SSR", icon: Globe },
    { name: "Argon2id", tag: "OWASP Password Hashing", icon: Lock },
    { name: "404 Isolation", tag: "Multi-Tenant Privacy", icon: Shield },
    { name: "Bangkok TZ Sync", tag: "Timezone-Aware Tasks", icon: CheckCircle2 },
    { name: "TypeORM Migrations", tag: "Zero synchronize: true", icon: Terminal },
  ];

  return (
    <section className="py-12 px-4 bg-[#08090a] border-y border-white/[0.06] overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-center mb-6"
        >
          <span className="text-[10px] font-mono tracking-widest uppercase text-zinc-500">
            Engineered with Zero Placeholders • Production-Ready Stack
          </span>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {stack.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: idx * 0.05 }}
                className="p-3 rounded-xl border border-white/[0.06] bg-[#0c0d12] hover:border-white/20 transition-all flex flex-col items-center text-center gap-1.5 group"
              >
                <div className="w-7 h-7 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-zinc-400 group-hover:text-cyan-400 group-hover:scale-110 transition-all">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="text-xs font-semibold text-zinc-200">{item.name}</div>
                <div className="text-[9px] text-zinc-500 font-mono leading-tight">{item.tag}</div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
