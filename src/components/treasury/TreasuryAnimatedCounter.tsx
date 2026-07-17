"use client";

import { useEffect, useState } from "react";

export default function TreasuryAnimatedCounter({
  value,
  formatter,
  className,
}: {
  value: number;
  formatter?: (value: number) => string;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const start = display;
    const end = value;
    const duration = 600;
    const startTime = performance.now();

    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(start + (end - start) * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const formatted = formatter ? formatter(display) : display.toFixed(2);
  return <span className={className}>{formatted}</span>;
}
