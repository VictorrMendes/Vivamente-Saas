export function PendingContentNotice({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-warning bg-warning-bg px-4 py-3 text-body-sm text-warning"
    >
      {children}
    </div>
  );
}
