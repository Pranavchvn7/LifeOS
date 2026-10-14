import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-line bg-surface p-4", className)}>
      {children}
    </section>
  );
}

export function Field({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      {...props}
      className={cn(
        "h-11 w-full rounded-md border border-line bg-paper px-3 text-base text-fg placeholder:text-subtle",
        className,
      )}
    />
  );
}

export function Area({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full rounded-md border border-line bg-paper px-3 py-2 text-base text-fg placeholder:text-subtle",
        className,
      )}
    />
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <h2 className="font-display text-2xl font-medium tracking-tight text-fg">{children}</h2>;
}
