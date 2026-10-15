import { useMemo } from "react";
import type { LifeData } from "./model";
import { useLife } from "./store";

/** The user's whole log as one memoized object (selected field-by-field so Zustand stays stable). */
export function useLifeData(): LifeData {
  const dos = useLife((s) => s.dos);
  const donts = useLife((s) => s.donts);
  const doChecks = useLife((s) => s.doChecks);
  const dontChecks = useLife((s) => s.dontChecks);
  const journals = useLife((s) => s.journals);
  const oneLines = useLife((s) => s.oneLines);
  const goals = useLife((s) => s.goals);
  const reflections = useLife((s) => s.reflections);
  const todos = useLife((s) => s.todos);
  const weeklyReviews = useLife((s) => s.weeklyReviews);
  const programStart = useLife((s) => s.programStart);
  const programDays = useLife((s) => s.programDays);
  const pastPrograms = useLife((s) => s.pastPrograms);
  return useMemo(
    () => ({
      dos, donts, doChecks, dontChecks, journals, oneLines, goals, reflections,
      todos, weeklyReviews, programStart, programDays, pastPrograms,
    }),
    [dos, donts, doChecks, dontChecks, journals, oneLines, goals, reflections, todos, weeklyReviews, programStart, programDays, pastPrograms],
  );
}
