export default function Loading() {
  return (
    <div className="space-y-6 motion-safe:animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="h-4 w-32 rounded bg-sand" />
      <div className="h-12 w-2/3 rounded-xl bg-sand" />
      <div className="h-52 rounded-3xl bg-emerald-soft" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[1, 2, 3, 4].map(i => <div key={i} className="atelier-panel h-40 p-5"><div className="size-10 rounded-xl bg-sand" /><div className="mt-5 h-6 w-1/2 rounded bg-sand" /></div>)}</div>
      <div className="atelier-panel h-48" />
    </div>
  );
}
