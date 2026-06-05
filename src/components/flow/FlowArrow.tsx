import { motion } from "motion/react";

export function FlowArrow({ delay = 0, active = true }: { delay?: number; active?: boolean }) {
  return (
    <div className="flex justify-center" aria-hidden>
      <svg width="24" height="44" viewBox="0 0 24 44" className="my-1">
        <motion.line
          x1="12" y1="2" x2="12" y2="34"
          stroke={active ? "var(--mint)" : "var(--border)"}
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay, ease: "easeOut" }}
        />
        <motion.path
          d="M6 30 L12 40 L18 30"
          fill="none"
          stroke={active ? "var(--mint)" : "var(--border)"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.3, delay: delay + 0.4 }}
        />
      </svg>
    </div>
  );
}
