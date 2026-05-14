import { AppShell } from "@/components/shell/app-shell";
import { Spinner } from "@/components/ui/spinner";

export default function Loading() {
  return (
    <AppShell mode="app">
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Spinner size={20} />
      </div>
    </AppShell>
  );
}
