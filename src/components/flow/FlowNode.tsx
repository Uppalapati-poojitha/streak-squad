import { motion } from "motion/react";
import { type ReactNode } from "react";

type State = "pending" | "active" | "done" | "fire";

export function FlowNode({
  icon,
  title,
  subtitle,
  action,
  state = "active",
  delay = 0,
  onClick,
  children,
}: {
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  state?: State;
  delay?: number;
  onClick?: () => void;
  children?: ReactNode;
}) {
  const stateClass = {
    pending: "bg-surface/60 border-border text-muted-foreground",
    active: "bg-surface border-primary/40 text-foreground glow-primary",
    done: "bg-surface border-mint/40 text-foreground",
    fire: "bg-surface border-fire/50 text-foreground glow-fire",
  }[state];

  const iconBg = {
    pending: "bg-muted text-muted-foreground",
    active: "bg-primary/20 text-primary",
    done: "bg-mint/20 text-mint",
    fire: "bg-fire/20 text-fire",
  }[state];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
      onClick={onClick}
      className={`relative rounded-2xl border px-4 py-4 transition-all ${stateClass} ${onClick ? "cursor-pointer hover:scale-[1.01]" : ""}`}
    >
      <div className="flex items-center gap-3">
        {icon && (
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="font-semibold leading-tight">{title}</div>
          {subtitle && <div className="mt-0.5 text-sm text-muted-foreground">{subtitle}</div>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children && <div className="mt-3">{children}</div>}
    </motion.div>
  );
}
