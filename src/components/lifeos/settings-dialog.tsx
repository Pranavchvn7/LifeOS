import { useState } from "react";
import { UserButton } from "@/lib/auth/gates";
import { DangerSection, ExportSection, HabitEditor, ProgramSection, ReminderSection, Section, ShareSection } from "./settings-sections";

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const [error, setError] = useState("");

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-fg/40 p-0 sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        data-testid="settings-dialog"
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-xl bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="settings-title" className="font-display text-2xl font-medium">
              Account &amp; settings
            </h2>
            <p className="mt-1 text-sm text-muted">Saved to your account, so it follows you when you sign in again.</p>
          </div>
          <button type="button" data-testid="settings-close" onClick={onClose} className="h-11 rounded-md border border-line px-3 text-sm">
            Close
          </button>
        </div>

        <div className="account-chip mt-4 rounded-lg border border-line p-3">
          <UserButton />
        </div>
        {error ? <p className="mt-2 text-sm text-bad">{error}</p> : null}

        <Section id="habits" title="Habits" hint="Your do's and don'ts, and which days they apply" defaultOpen>
          <HabitEditor kind="dos" title="Do's" />
          <HabitEditor kind="donts" title="Don'ts" />
          <p className="mt-3 text-xs text-subtle">
            Adding or removing a habit changes past percentages, because each day is scored against the current list.
          </p>
        </Section>

        <Section id="reminders" title="Reminders" hint="Daily nudge and Sunday weekly review">
          <ReminderSection />
        </Section>

        <Section id="program" title="Program" hint="Your current window, or start a new one">
          <ProgramSection onDone={onClose} />
        </Section>

        <Section id="share" title="Share my progress" hint="View-only link for a friend or mentor">
          <ShareSection />
        </Section>

        <Section id="export" title="Export & backup" hint="Excel, CSV and full backup">
          <ExportSection onImportError={setError} onImported={onClose} />
        </Section>

        <Section id="danger" title="Danger zone" hint="Start over or delete your account">
          <DangerSection onDone={onClose} />
        </Section>
      </div>
    </div>
  );
}
