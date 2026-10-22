import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({
  title = "Nothing here yet",
  description = "There's no data to display right now.",
  icon,
  action,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center px-6 py-16 text-center"
    >
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-secondary text-accent [&_svg]:size-7">
        {icon ?? <Inbox />}
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}
