import { cn } from "@/lib/utils";

export function Spinner({ className, size = 16 }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      style={{ width: size, height: size }}
      className={cn(
        "inline-block animate-spin rounded-full border-[1.5px] border-current border-r-transparent opacity-60",
        className
      )}
    />
  );
}
