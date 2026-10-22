import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { cn, formatCompact } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: ReactNode;
  hint?: string;
  tone?: "primary" | "success" | "warning" | "danger" | "accent";
  index?: number;
  to?: string;
}

const TONES: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  accent: "bg-accent/10 text-accent",
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-destructive/10 text-destructive",
};

export function StatCard({
  label,
  value,
  icon,
  hint,
  tone = "primary",
  index = 0,
  to,
}: StatCardProps) {
  const CardContent = (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      whileHover={{ y: -3 }}
      className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-pop"
    >
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/5 opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
            {typeof value === "number" ? formatCompact(value) : value}
          </p>
          {hint && (
            <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
          )}
        </div>
        <div
          className={cn(
            "grid h-11 w-11 place-items-center rounded-xl [&_svg]:size-5",
            TONES[tone]
          )}
        >
          {icon}
        </div>
      </div>
    </motion.div>
  );

  if (to) {
    return (
      <Link to={to} className="block">
        {CardContent}
      </Link>
    );
  }

  return CardContent;
}
