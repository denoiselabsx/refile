import { cn } from "@/lib/utils";

export function Kbd({ className, children, ...props }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-[5px] border border-border bg-muted px-1 font-mono text-[10.5px] font-medium text-muted-foreground",
        className
      )}
      {...props}
    >
      {children}
    </kbd>
  );
}
