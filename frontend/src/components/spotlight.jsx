"use client";

import { useCallback } from "react";
import { cn } from "@/lib/utils";

/**
 * Wraps content with a cursor-following spotlight. Pairs with the
 * `.spotlight` class in globals.css. Pure CSS variables — no rerenders.
 */
export function Spotlight({ as: Tag = "div", className, children, ...props }) {
  const onMouseMove = useCallback((e) => {
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    target.style.setProperty("--spotlight-x", `${e.clientX - rect.left}px`);
    target.style.setProperty("--spotlight-y", `${e.clientY - rect.top}px`);
  }, []);

  return (
    <Tag
      onMouseMove={onMouseMove}
      className={cn("spotlight", className)}
      {...props}
    >
      {children}
    </Tag>
  );
}
