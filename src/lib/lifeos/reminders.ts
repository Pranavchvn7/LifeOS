import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

/**
 * Device-local reminders. They fire while LifeOS is open (a browser tab or the installed app running
 * in the background) — they are not server push notifications, so nothing is sent if the app is closed.
 */
export type ReminderPrefs = {
  enabled: boolean;
  /** "HH:MM", 24-hour. */
  time: string;
  /** Also nudge about the weekly review on Sundays. */
  weekly: boolean;
  lastDaily: string;
  lastWeekly: string;
};

const KEY = "lifeos-reminders";
export const DEFAULT_PREFS: ReminderPrefs = { enabled: false, time: "20:00", weekly: true, lastDaily: "", lastWeekly: "" };

function parsePrefs(raw: string): ReminderPrefs {
  try {
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<ReminderPrefs>;
    return {
      enabled: parsed.enabled === true,
      time: typeof parsed.time === "string" && /^\d{2}:\d{2}$/.test(parsed.time) ? parsed.time : DEFAULT_PREFS.time,
      weekly: parsed.weekly !== false,
      lastDaily: typeof parsed.lastDaily === "string" ? parsed.lastDaily : "",
      lastWeekly: typeof parsed.lastWeekly === "string" ? parsed.lastWeekly : "",
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

const listeners = new Set<() => void>();

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function snapshot(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

function writePrefs(prefs: ReminderPrefs) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((listener) => listener());
}

/** Has the reminder time passed today? */
export function pastReminderTime(time: string, now: Date): boolean {
  const [h, m] = time.split(":").map(Number);
  return now.getHours() * 60 + now.getMinutes() >= (h ?? 0) * 60 + (m ?? 0);
}

export type NotificationPermissionState = "granted" | "denied" | "default" | "unsupported";

export function currentPermission(): NotificationPermissionState {
  if (typeof window === "undefined" || typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

export async function showNotification(title: string, body: string): Promise<boolean> {
  if (currentPermission() !== "granted") return false;
  try {
    const registration = await navigator.serviceWorker?.getRegistration?.();
    if (registration) {
      await registration.showNotification(title, { body, icon: "/favicon.ico", tag: "lifeos-reminder" });
      return true;
    }
  } catch {
    /* fall through to the page-level API */
  }
  try {
    new Notification(title, { body, tag: "lifeos-reminder" });
    return true;
  } catch {
    return false;
  }
}

/** Reminder settings (shared between the Settings screen and the reminder engine). */
export function useReminderPrefs() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "");
  const prefs = useMemo(() => parsePrefs(raw), [raw]);
  const [permission, setPermission] = useState<NotificationPermissionState>("unsupported");
  useEffect(() => setPermission(currentPermission()), []);

  const update = useCallback((patch: Partial<ReminderPrefs>) => {
    writePrefs({ ...parsePrefs(snapshot()), ...patch });
  }, []);

  const enable = useCallback(async () => {
    let result = currentPermission();
    if (result === "default") result = await Notification.requestPermission();
    setPermission(currentPermission());
    update({ enabled: true });
    return result;
  }, [update]);

  return { prefs, permission, update, enable };
}

/** Runs once in the app shell: ticks every 30s and fires due reminders. Returns whether the banner should show. */
export function useReminderEngine(opts: {
  today: string;
  /** Today is in the program, habits exist, and nothing is logged yet. */
  needsLogToday: boolean;
  /** A weekly review is pending (Sunday, or Monday catch-up). */
  reviewPending: boolean;
  onFire?: (message: string) => void;
}): { due: boolean } {
  const { today, needsLogToday, reviewPending, onFire } = opts;
  const { prefs, update } = useReminderPrefs();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const due = prefs.enabled && needsLogToday && pastReminderTime(prefs.time, now);

  useEffect(() => {
    if (!prefs.enabled || !pastReminderTime(prefs.time, now)) return;
    if (needsLogToday && prefs.lastDaily !== today) {
      update({ lastDaily: today });
      const message = "Time to log your day in LifeOS.";
      onFire?.(message);
      void showNotification("LifeOS", message);
    } else if (prefs.weekly && reviewPending && prefs.lastWeekly !== today) {
      update({ lastWeekly: today });
      const message = "Your weekly review is ready. Take two minutes to reflect.";
      onFire?.(message);
      void showNotification("LifeOS weekly review", message);
    }
  }, [now, prefs, needsLogToday, reviewPending, today, update, onFire]);

  return { due };
}
