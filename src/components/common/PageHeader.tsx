import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: ReactNode;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  icon,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="flex items-start gap-3.5">
        {icon && (
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl brand-gradient text-primary-foreground shadow-glow [&_svg]:size-5">
            {icon}
          </div>
        )}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2">{actions}</div>
      )}
    </motion.div>
  );
}
