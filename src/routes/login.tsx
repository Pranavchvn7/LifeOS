import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Navigate, useRouter } from "@tanstack/react-router";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { BootScreen } from "@/components/lifeos/boot-screen";

export const Route = createFileRoute("/login")({ component: LoginPage });

function friendlyAuthError(message: string, mode: "in" | "up"): string {
  const text = message.toLowerCase();
  if (text.includes("already") || text.includes("exists")) {
    return "An account with that email already exists. Sign in instead.";
  }
  if (text.includes("invalid email or password") || text.includes("invalid password")) {
    return "Email or password doesn't match.";
  }
  if (text.includes("password")) return "Use at least 8 characters for the password.";
  if (text.includes("invalid origin")) {
    return "Sign-in was blocked because this site's address isn't trusted by the server yet. The site owner needs to set BETTER_AUTH_URL to this site's URL.";
  }
  if (text.includes("secret") || text.includes("database") || text.includes("relation")) {
    return "The server isn't fully configured yet (database or secret missing). Please contact the site owner.";
  }
  const base = mode === "up" ? "Could not create the account." : "Could not sign in.";
  return message ? `${base} Server said: ${message}` : `${base} Check the details and try again.`;
}

function LoginPage() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return <BootScreen label="Checking your session" />;
  if (user) return <Navigate to="/" />;
  return <LoginCard />;
}

// Grok broker sign-in (Google/X) only works on Grok-hosted domains. On Vercel or
// any other public host, only email + password is offered.
function brokerSignInAvailable(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host.endsWith(".grok-sandbox.com") || host.endsWith(".grok.me");
}

function LoginCard() {
  const router = useRouter();
  const [showBroker, setShowBroker] = useState(false);
  useEffect(() => setShowBroker(brokerSignInAvailable()), []);
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setError("Email and password are required.");
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters for the password.");
      return;
    }
    if (mode === "up" && !name.trim()) {
      setError("Add your name so the log knows who it belongs to.");
      return;
    }
    setPending(true);
    try {
      const result =
        mode === "up"
          ? await authClient.signUp.email({
              name: name.trim(),
              email: cleanEmail,
              password,
              callbackURL: "/",
            })
          : await authClient.signIn.email({
              email: cleanEmail,
              password,
              callbackURL: "/",
            });
      if (result.error) {
        const status = result.error.status ? ` (${result.error.status})` : "";
        setError(friendlyAuthError(`${result.error.message ?? ""}${status}`, mode));
        setPending(false);
        return;
      }
      await router.invalidate();
      await router.navigate({ to: "/" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(friendlyAuthError(message, mode));
      setPending(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-paper px-4 py-10">
      <div className="w-full max-w-md">
        <p className="font-display text-4xl font-medium tracking-tight text-fg">LifeOS</p>
        <h1 className="mt-2 font-display text-xl text-fg">Personal growth, kept per person</h1>
        <p className="mt-2 text-sm text-muted">
          Daily do's, don'ts, journal, and goals. Create an account and the log stays with you on any device.
        </p>

        <div className="mt-6 rounded-xl border border-line bg-surface p-4">
          {authEnabled ? (
            <>
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-inset p-1">
                <button
                  type="button"
                  className={
                    mode === "in"
                      ? "h-11 rounded-md bg-surface text-sm font-medium text-fg"
                      : "h-11 rounded-md text-sm font-medium text-muted"
                  }
                  onClick={() => {
                    setMode("in");
                    setError("");
                  }}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  className={
                    mode === "up"
                      ? "h-11 rounded-md bg-surface text-sm font-medium text-fg"
                      : "h-11 rounded-md text-sm font-medium text-muted"
                  }
                  onClick={() => {
                    setMode("up");
                    setError("");
                  }}
                >
                  Create account
                </button>
              </div>

              <form className="mt-4 space-y-3" onSubmit={onSubmit}>
                {mode === "up" ? (
                  <label className="block text-sm font-medium text-fg">
                    Name
                    <input
                      className="mt-1 h-11 w-full rounded-md border border-line bg-paper px-3 text-base font-normal"
                      autoComplete="name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                    />
                  </label>
                ) : null}
                <label className="block text-sm font-medium text-fg">
                  Email
                  <input
                    type="email"
                    className="mt-1 h-11 w-full rounded-md border border-line bg-paper px-3 text-base font-normal"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </label>
                <label className="block text-sm font-medium text-fg">
                  Password
                  <input
                    type="password"
                    className="mt-1 h-11 w-full rounded-md border border-line bg-paper px-3 text-base font-normal"
                    autoComplete={mode === "up" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </label>
                {error ? <p className="text-sm text-bad">{error}</p> : null}
                <button
                  type="submit"
                  disabled={pending}
                  className="h-11 w-full rounded-md bg-accent text-sm font-medium text-accent-fg disabled:opacity-60"
                >
                  {pending ? "Please wait…" : mode === "up" ? "Create account" : "Sign in"}
                </button>
              </form>

              {showBroker ? (
                <>
              <div className="my-4 flex items-center gap-3 text-xs uppercase tracking-wide text-subtle">
                <span className="h-px flex-1 bg-line" />
                or
                <span className="h-px flex-1 bg-line" />
              </div>
              <div className="space-y-2">
                {GROK_PROVIDERS.map((provider) => (
                  <button
                    key={provider.providerId}
                    type="button"
                    className="h-11 w-full rounded-md border border-line bg-paper text-sm font-medium text-fg"
                    onClick={() => signIn(provider.providerId, { callbackURL: "/" })}
                  >
                    Continue with {provider.label}
                  </button>
                ))}
              </div>
                </>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted">Sign-in is disabled.</p>
          )}
        </div>
      </div>
    </main>
  );
}
