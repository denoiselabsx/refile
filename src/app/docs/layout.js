import { AppShell } from "@/components/shell/app-shell";
import { DocsShell } from "@/components/docs/docs-shell";

export default function DocsLayout({ children }) {
  return (
    <AppShell mode="marketing">
      <DocsShell>{children}</DocsShell>
    </AppShell>
  );
}
