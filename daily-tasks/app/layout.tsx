import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Providers } from "@/components/providers/session-provider";
import { Toaster } from "@/components/ui/sonner";
import { ThemeSync } from "@/components/theme-sync";
import { PerformanceErrorBoundary } from "@/components/performance-error-boundary";
import { auth } from "@/auth";
import { cookies } from "next/headers";
import { I18nProvider } from "@/components/providers/i18n-provider";
import { NavbarBreadcrumbProvider } from "@/components/providers/navbar-breadcrumb-provider"
import { SidebarProvider } from "@/components/providers/sidebar-provider";
import { SettingsDialogProvider } from "@/components/providers/settings-dialog-provider";

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
    function getCookie(name) {
      var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
      return match ? decodeURIComponent(match[2]) : null;
    }
    function setCookie(name, value) {
      var expires = new Date();
      expires.setFullYear(expires.getFullYear() + 1);
      document.cookie = name + '=' + encodeURIComponent(value) + ';expires=' + expires.toUTCString() + ';path=/;SameSite=Lax';
    }
    function getThemePreference() {
      var cookie = getCookie('dailytasks-theme');
      if (cookie && ['dark', 'light'].indexOf(cookie) !== -1) {
        return cookie;
      }
      var stored = localStorage.getItem('dailytasks-theme');
      if (stored && ['dark', 'light'].indexOf(stored) !== -1) {
        setCookie('dailytasks-theme', stored);
        return stored;
      }
      return 'dark';
    }
    var theme = getThemePreference();
    var root = document.documentElement;
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
  const cookieStore = await cookies();
  const sidebarCookie = cookieStore.get('dailytasks-sidebar-open')?.value;
  const defaultSidebarOpen = sidebarCookie !== undefined ? sidebarCookie === 'true' : true;

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
          <I18nProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="dark"
              enableSystem={false}
              storageKey="dailytasks-theme"
              disableTransitionOnChange={false}
            >
              <NavbarBreadcrumbProvider>
                <SidebarProvider defaultOpen={defaultSidebarOpen}>
                  <SettingsDialogProvider>
                    <PerformanceErrorBoundary>
                      <ThemeSync />
                      {children}
                      <Toaster />
                    </PerformanceErrorBoundary>
                  </SettingsDialogProvider>
                </SidebarProvider>
              </NavbarBreadcrumbProvider>
            </ThemeProvider>
          </I18nProvider>
        </Providers>
      </body>
    </html>
  );
}
