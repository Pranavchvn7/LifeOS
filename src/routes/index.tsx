import { createFileRoute } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { BootScreen } from "@/components/lifeos/boot-screen";
import { LifeApp } from "@/components/lifeos/life-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return <BootScreen label="Checking your session" />;
  if (!user) return <RedirectToSignIn />;
  return <LifeApp userId={user.id} />;
}
