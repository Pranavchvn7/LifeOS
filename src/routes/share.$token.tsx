import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BoardView } from "@/components/lifeos/board-view";
import { BootScreen } from "@/components/lifeos/boot-screen";
import { getSharedProgress, type SharedProgress } from "@/lib/lifeos/share.functions";

export const Route = createFileRoute("/share/$token")({
  head: () => ({ meta: [{ title: "Shared progress · LifeOS" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: SharedPage,
});

function SharedPage() {
  const { token } = Route.useParams();
  const [state, setState] = useState<{ status: "loading" } | { status: "missing" } | { status: "ready"; shared: SharedProgress }>({
    status: "loading",
  });

  useEffect(() => {
    let cancel = false;
    void getSharedProgress({ data: { token } })
      .then((shared) => {
        if (!cancel) setState(shared ? { status: "ready", shared } : { status: "missing" });
      })
      .catch(() => {
        if (!cancel) setState({ status: "missing" });
      });
    return () => {
      cancel = true;
    };
  }, [token]);

  if (state.status === "loading") return <BootScreen label="Opening shared progress" />;

  if (state.status === "missing") {
    return (
      <main className="grid min-h-dvh place-items-center bg-paper px-6 text-center text-fg" data-testid="share-missing">
        <div className="max-w-sm">
          <p className="font-display text-2xl">This link isn't available</p>
          <p className="mt-2 text-sm text-muted">It may have been turned off or replaced by the person who shared it.</p>
          <Link to="/login" className="mt-4 inline-grid h-11 place-items-center rounded-md bg-accent px-4 text-sm font-medium text-accent-fg">
            Go to LifeOS
          </Link>
        </div>
      </main>
    );
  }

  const { name, data } = state.shared;
  return (
    <div className="min-h-dvh bg-paper text-fg" data-testid="share-page">
      <header className="border-b border-line bg-paper pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 md:px-8">
          <div className="min-w-0">
            <p className="truncate font-display text-xl font-medium md:text-2xl" data-testid="share-title">
              {name}'s progress
            </p>
            <p className="text-xs text-muted md:text-sm">View-only · shared with you via LifeOS</p>
          </div>
          <Link to="/login" className="grid h-11 shrink-0 place-items-center rounded-md border border-line bg-surface px-3 text-sm font-medium">
            Track your own
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-5 pb-12 md:px-8 md:py-8">
        <BoardView data={data} readOnly />
        <p className="mt-6 text-center text-xs text-subtle">
          Notes, journal text, reviews and to-dos are private and never appear on shared pages.
        </p>
      </main>
    </div>
  );
}
