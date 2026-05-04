export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-3 py-12 text-center"
      aria-busy="true"
      aria-live="polite"
    >
      <span
        className="inline-block size-10 rounded-full border-2 border-emerald-200 border-t-emerald-600 animate-spin"
        aria-hidden
      />
      <p className="text-sm font-medium text-slate-600">{label}</p>
    </div>
  );
}
