import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Providers } from "@/components/providers/session-provider";
import { Toaster } from "@/components/ui/sonner";
import { ThemeSync } from "@/components/theme-sync";
import { PerformanceErrorBoundary } from "@/components/performance-error-boundary";
import { auth } from "@/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Daily Tasks",
  description: "Gestión de tareas tipo Jira/Notion",
};

// Script para prevenir flash de tema incorrecto
const themeScript = `
  (function() {
    function getThemePreference() {
      const savedTheme = localStorage.getItem('dailytasks-theme');
      if (savedTheme && ['dark', 'light'].includes(savedTheme)) {
        return savedTheme;
      }
      return 'dark';
    }
    const theme = getThemePreference();
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    root.style.colorScheme = theme;
  })();
`;

// Script para suprimir errores de performance.measure con timestamp negativo
const performanceErrorScript = `
  (function() {
    if (typeof window !== 'undefined' && window.performance && window.performance.measure) {
      const originalMeasure = window.performance.measure.bind(window.performance);
      window.performance.measure = function() {
        try {
          return originalMeasure.apply(this, arguments);
        } catch (e) {
          if (e && e.message && e.message.includes('cannot have a negative time stamp')) {
            console.warn('[Performance] Ignorado error de timestamp negativo');
            return;
          }
          throw e;
        }
      };
    }
  })();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: performanceErrorScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers session={session}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            storageKey="dailytasks-theme"
            disableTransitionOnChange={false}
          >
            <PerformanceErrorBoundary>
              <ThemeSync />
              {children}
              <Toaster />
            </PerformanceErrorBoundary>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
