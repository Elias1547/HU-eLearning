"use client";

import Link from "next/link";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

type CourseCategoryRailProps = {
  categories: string[];
  className?: string;
};

export function CourseCategoryRail({
  categories,
  className,
}: CourseCategoryRailProps) {
  const sorted = useMemo(
    () => [...new Set(categories.filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [categories]
  );

  if (sorted.length === 0) return null;

  return (
    <div id="categories" className={cn("scroll-mt-28", className)}>
      <div className="mb-3 flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Browse by category
        </h2>
        <p className="text-sm text-muted-foreground">
          Jump to courses that match a topic—uses the catalog search you already have.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {sorted.map((cat) => (
          <Link
            key={cat}
            href={`/courses?search=${encodeURIComponent(cat)}`}
            className={cn(
              "inline-flex items-center rounded-full border border-border/80 bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm",
              "transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5 hover:shadow-md"
            )}
          >
            {cat}
          </Link>
        ))}
      </div>
    </div>
  );
}
