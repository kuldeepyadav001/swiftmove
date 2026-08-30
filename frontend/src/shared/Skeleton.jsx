// src/shared/Skeleton.jsx
// Skeleton loading placeholders — show the shape of content while it loads
// instead of a blank spinner. Better perceived performance.

import React from "react";

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="h-3 w-20 bg-slate-200 rounded" />
        <div className="w-9 h-9 rounded-xl bg-slate-200" />
      </div>
      <div className="h-6 w-16 bg-slate-200 rounded mb-2" />
      <div className="h-2.5 w-24 bg-slate-100 rounded" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 animate-pulse">
      <div className="w-10 h-10 rounded-xl bg-slate-200 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-32 bg-slate-200 rounded" />
        <div className="h-2.5 w-48 bg-slate-100 rounded" />
      </div>
      <div className="w-16 h-4 bg-slate-200 rounded" />
    </div>
  );
}

export function StatGridSkeleton({ count = 4 }) {
  return (
    <div className={`grid grid-cols-2 lg:grid-cols-${count} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
