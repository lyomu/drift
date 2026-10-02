"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Wraps a fixed-dimension "staged Pen composition" (see
 * `landing-page.module.css`) and scales it down to fit one viewport with no
 * scrollbar, instead of letting it overflow on shorter desktop screens.
 * Below `breakpoint` it renders children unscaled so the component's own
 * responsive (stacked, scrollable) layout takes over.
 */
export function ScaledCanvas({
  children,
  width,
  height,
  breakpoint = 900,
}: {
  children: ReactNode;
  width: number;
  height: number;
  breakpoint?: number;
}) {
  const [scale, setScale] = useState<number | null>(null);

  useEffect(() => {
    const update = () => {
      if (window.innerWidth <= breakpoint) {
        setScale(null);
        return;
      }
      setScale(Math.min(window.innerWidth / width, window.innerHeight / height, 1));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [width, height, breakpoint]);

  if (scale === null) return <>{children}</>;

  return (
    <div style={{ height: "100dvh", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width, height, transform: `scale(${scale})`, flexShrink: 0 }}>{children}</div>
    </div>
  );
}
