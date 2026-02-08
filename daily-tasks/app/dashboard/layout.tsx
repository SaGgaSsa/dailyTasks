import { Navbar } from "@/components/navbar";
import { SessionProvider } from "next-auth/react";
import { Sidebar } from "@/components/sidebar";
import { auth } from "@/auth";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const userId = session?.user?.id;

  return (
    <SessionProvider>
      <div className="flex min-h-screen bg-background text-foreground">
        {/* Sidebar */}
        <Sidebar userId={userId} />

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Navbar */}
          <Navbar />

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto p-2 relative">
            {children}
          </main>
        </div>
      </div>
    </SessionProvider>
  );
}