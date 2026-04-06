import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { ToastProvider } from "@/components/ui/toast";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <ToastProvider>
      <AppShell user={{ displayName: session.user.displayName, role: session.user.role }}>
        {children}
      </AppShell>
    </ToastProvider>
  );
}
