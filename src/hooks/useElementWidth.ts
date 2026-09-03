"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Measures a container so charts can be drawn at real pixel sizes.
 *
 * Scaling an SVG with `preserveAspectRatio="none"` would be less code, but it
 * distorts stroke widths and text — a 2px line becomes 3.4px on a wide screen.
 * Measuring and re-rendering keeps every mark at its specified thickness.
 */
export function useElementWidth<T extends HTMLElement>(): [
  React.RefObject<T | null>,
  number,
] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    setWidth(element.clientWidth);

    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width ?? 0;
      setWidth(Math.round(next));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, width];
}
