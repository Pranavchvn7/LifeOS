import { useMemo } from "react";
import { BookOpen, Calendar, Check, Flame, Footprints, Star, Target, Trophy, type LucideIcon } from "lucide-react";
import { computeBadges, type BadgeIcon } from "@/lib/lifeos/badges";
import { formatPretty, todayISO, type LifeData } from "@/lib/lifeos/model";
import { cn } from "@/lib/utils";
import { Panel } from "./ui";

const ICONS: Record<BadgeIcon, LucideIcon> = {
  flame: Flame,
  star: Star,
  footprints: Footprints,
  book: BookOpen,
  check: Check,
  target: Target,
  trophy: Trophy,
  calendar: Calendar,
};

export function BadgesPanel({ data }: { data: LifeData }) {
  const today = todayISO();
  const badges = useMemo(() => computeBadges(data, today), [data, today]);
  const earned = badges.filter((b) => b.earned).length;

  return (
    <Panel>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl font-medium">Badges</h2>
        <p className="text-sm text-muted" data-testid="badges-count">
          {earned} of {badges.length} earned
        </p>
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4" data-testid="badges-list">
        {badges.map((badge) => {
          const Icon = ICONS[badge.icon];
          return (
            <li
              key={badge.id}
              data-testid="badge"
              data-badge-id={badge.id}
              data-earned={badge.earned}
              className={cn(
                "rounded-lg border p-3",
                badge.earned ? "border-good bg-good-soft" : "border-line bg-paper opacity-80",
              )}
            >
              <div className="flex items-center gap-2">
                <Icon className={cn("size-5 shrink-0", badge.earned ? "text-good" : "text-subtle")} />
                <p className="text-sm font-medium leading-tight">{badge.title}</p>
              </div>
              <p className="mt-1 text-xs text-muted">{badge.description}</p>
              {badge.earned ? (
                <p className="mt-1 text-xs font-medium text-good">
                  Earned{badge.earnedOn ? ` · ${formatPretty(badge.earnedOn)}` : ""}
                </p>
              ) : (
                <div className="mt-2">
                  <div className="h-1.5 overflow-hidden rounded-full bg-inset">
                    <div className="h-full rounded-full bg-heat-3" style={{ width: `${Math.round(badge.progress * 100)}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-subtle">{badge.progressLabel}</p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
