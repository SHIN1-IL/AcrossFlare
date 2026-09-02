export function AppShellLoading() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="h-14 border-b border-border bg-surface-2/40" />
      <div className="flex flex-1">
        <aside className="hidden w-56 shrink-0 border-r border-border bg-surface-2/20 md:block" />
        <main className="flex flex-1 items-center justify-center p-6">
          <div
            className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
            aria-hidden="true"
          />
        </main>
      </div>
    </div>
  );
}
