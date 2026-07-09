const TIER_LABELS: Record<string, string> = {
  beginner: "Beginner",
  skilled: "Skilled Tailor",
  expert: "Expert Tailor",
  master: "Master Tailor",
};

const TIER_STYLES: Record<string, string> = {
  beginner:
    "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400",
  skilled: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  expert:
    "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  master:
    "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
};

export function SkillBadge({ tier }: { tier: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${TIER_STYLES[tier] ?? TIER_STYLES.beginner}`}
    >
      {TIER_LABELS[tier] ?? tier}
    </span>
  );
}
