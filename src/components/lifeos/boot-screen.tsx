export function BootScreen({ label = "Personal Growth LifeOS" }: { label?: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-paper px-6 text-center">
      <div>
        <p className="font-display text-3xl font-medium tracking-tight text-fg">LifeOS</p>
        <p className="mt-2 text-sm text-muted">{label}</p>
      </div>
    </main>
  );
}
