import { mondayOf, shiftDate, weekdayOf, type LifeData, type WeeklyReview } from "./model";
import { rangeStats, scoreDays, type RangeStats } from "./score";

/** A review counts as done once the user has written anything or given a rating. */
export function isReviewDone(review: WeeklyReview | undefined): boolean {
  if (!review) return false;
  return Boolean(review.wins || review.struggles || review.lesson || review.focus || review.rating);
}

/**
 * Which Mon–Sun week should the Today page nudge about?
 * Sunday → this week. Monday → last week (catch-up). Other days → none.
 * Returns the Monday (YYYY-MM-DD) of that week.
 */
export function reviewWeekFor(today: string): string | null {
  const weekday = weekdayOf(today);
  if (weekday === 0) return mondayOf(today);
  if (weekday === 1) return shiftDate(mondayOf(today), -7);
  return null;
}

export function weekDates(monday: string): string[] {
  return Array.from({ length: 7 }, (_, i) => shiftDate(monday, i));
}

/** Stats for the Mon–Sun week starting `monday` (works across program boundaries). */
export function weekStats(data: LifeData, monday: string, today: string): RangeStats {
  const dates = weekDates(monday);
  return rangeStats(scoreDays(data, dates, today), monday, shiftDate(monday, 6), today);
}
