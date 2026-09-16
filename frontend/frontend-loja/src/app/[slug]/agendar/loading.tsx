export default function AgendarLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16" aria-hidden="true">
      <div className="flex animate-pulse flex-col gap-3 motion-reduce:animate-none">
        <div className="h-8 w-2/3 rounded-md bg-surface-sunken" />
        <div className="h-4 w-full rounded-sm bg-surface-sunken" />
      </div>
      <div className="mt-8 flex animate-pulse flex-col gap-4 motion-reduce:animate-none">
        <div className="h-12 w-full rounded-md bg-surface-sunken" />
        <div className="h-12 w-full rounded-md bg-surface-sunken" />
        <div className="h-12 w-full rounded-md bg-surface-sunken" />
      </div>
    </div>
  );
}
