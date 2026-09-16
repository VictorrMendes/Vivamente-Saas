export default function ProfessionalLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16" aria-hidden="true">
      <div className="flex animate-pulse flex-col items-center gap-4 motion-reduce:animate-none sm:flex-row sm:items-start">
        <div className="h-24 w-24 rounded-pill bg-surface-sunken" />
        <div className="flex flex-1 flex-col gap-3">
          <div className="h-8 w-2/3 rounded-md bg-surface-sunken" />
          <div className="h-4 w-1/3 rounded-sm bg-surface-sunken" />
        </div>
      </div>
      <div className="mt-8 flex animate-pulse flex-col gap-2 motion-reduce:animate-none">
        <div className="h-4 w-full rounded-sm bg-surface-sunken" />
        <div className="h-4 w-5/6 rounded-sm bg-surface-sunken" />
      </div>
    </div>
  );
}
