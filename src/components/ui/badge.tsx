import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-normal transition-colors",
  {
    variants: {
      variant: {
        default: "border border-blue-200 bg-[#EDF2FF] text-codex-accent",
        secondary: "border border-slate-200 bg-slate-100 text-slate-600",
        destructive: "border border-red-200 bg-[#FEE2E2] text-codex-warning",
        outline: "border border-codex-border text-codex-text bg-white",
        success: "border border-emerald-200 bg-[#E8F5E9] text-[#2D8A60]",
        warning: "border border-amber-200 bg-[#FEF3C7] text-[#D97706]",
        ontrack: "border border-emerald-200 bg-[#E8F5E9] text-[#2D8A60]",
        atrisk: "border border-amber-200 bg-[#FEF3C7] text-[#D97706]",
        blocked: "border border-red-200 bg-[#FEE2E2] text-[#C94A29]",
        info: "border border-sky-200 bg-sky-50 text-sky-700",
        purple: "border border-purple-200 bg-purple-50 text-purple-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
