export function CheckoutLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <div
        className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
        aria-hidden="true"
      />
    </div>
  );
}
