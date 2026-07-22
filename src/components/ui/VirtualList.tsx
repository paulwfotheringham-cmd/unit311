"use client";

import { useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Lightweight fixed-row virtualization (no extra dependency).
 * Use for long directories / message lists where .map of hundreds stalls paint.
 */
export default function VirtualList<T>({
  items,
  itemHeight,
  height,
  overscan = 6,
  className,
  renderItem,
  getKey,
}: {
  items: readonly T[];
  itemHeight: number;
  height: number;
  overscan?: number;
  className?: string;
  renderItem: (item: T, index: number) => React.ReactNode;
  getKey: (item: T, index: number) => string | number;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const { start, end, offsetY, totalHeight } = useMemo(() => {
    const total = items.length * itemHeight;
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(height / itemHeight) + overscan * 2;
    const endIndex = Math.min(items.length, startIndex + visibleCount);
    return {
      start: startIndex,
      end: endIndex,
      offsetY: startIndex * itemHeight,
      totalHeight: total,
    };
  }, [items.length, itemHeight, height, overscan, scrollTop]);

  const slice = items.slice(start, end);

  return (
    <div
      ref={scrollerRef}
      className={cn("overflow-y-auto", className)}
      style={{ height }}
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {slice.map((item, offset) => {
            const index = start + offset;
            return (
              <div key={getKey(item, index)} style={{ height: itemHeight }}>
                {renderItem(item, index)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
