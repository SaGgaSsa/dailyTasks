import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { auth } from "@/auth";
import { IncidenceTitleProvider } from "@/components/providers/incidence-title-provider";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const userId = session?.user?.id;

  return (
    <IncidenceTitleProvider>
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        {/* Sidebar */}
        <Sidebar userId={userId} />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Navbar */}
          <Navbar />

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto p-2 relative">
            {children}
          </main>
        </div>
      </div>
    </IncidenceTitleProvider>
  );
}