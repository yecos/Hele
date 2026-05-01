import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { SplashScreen } from "@/components/SplashScreen";
import { AuthProvider } from "@/components/AuthProvider";
import { AuthSync } from "@/components/AuthSync";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#dc2626",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "XuperStream - Ver Películas y Series Online",
  description: "Tu plataforma personal de streaming. Películas, series y TV en vivo en español latino, HD.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "XuperStream",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#dc2626" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="XuperStream" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="XuperStream" />
        <meta name="msapplication-TileColor" content="#dc2626" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0a0a0a] text-white`}
      >
        <SplashScreen />
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var loc = localStorage.getItem('xs-locale');
              if (loc && ['es','en','pt'].indexOf(loc) !== -1) {
                document.documentElement.lang = loc;
              }
            } catch(e) {}
            // Also sync on storage changes (other tabs)
            window.addEventListener('storage', function(e) {
              if (e.key === 'xs-locale' && e.newValue) {
                document.documentElement.lang = e.newValue;
              }
            });
          })();
        `}} />
        <script dangerouslySetInnerHTML={{ __html: `
          // Block popups and ad windows from embed servers
          (function() {
            var origOpen = window.open;
            var blocked = 0;
            window.open = function() {
              blocked++;
              if (blocked <= 3) console.log('[AdBlocker] Blocked popup #' + blocked);
              return null;
            };
            // Block new tabs via target manipulation
            document.addEventListener('click', function(e) {
              var link = e.target.closest('a[target="_blank"], a[target="_new"]');
              if (link) {
                e.preventDefault();
                e.stopPropagation();
                return false;
              }
            }, true);
            // Block beforeunload used by ads to prevent leaving
            window.addEventListener('beforeunload', function(e) {
              // Allow normal navigation, just clean up
              var target = e.target || e.srcElement;
            });
            console.log('[AdBlocker] Popup blocker active');
          })();
        `}} />
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').then(function(reg) {
                console.log('SW registered:', reg.scope);
              }).catch(function(err) {
                console.log('SW registration failed:', err);
              });
            });
          }
        `}} />
        <AuthProvider>
          <AuthSync>
            {children}
          </AuthSync>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
