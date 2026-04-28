import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "XuperStream - Ver Películas y Series Online",
  description: "Tu plataforma personal de streaming. Películas y series en español latino, HD.",
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <head>
        <style>{`
          @keyframes splash-fade-in {
            0% { opacity: 0; transform: scale(0.8); }
            50% { opacity: 1; transform: scale(1.05); }
            70% { transform: scale(0.98); }
            100% { opacity: 1; transform: scale(1); }
          }
          @keyframes splash-glow {
            0%, 100% { box-shadow: 0 0 20px rgba(220, 38, 38, 0.3), 0 0 60px rgba(220, 38, 38, 0.1); }
            50% { box-shadow: 0 0 30px rgba(220, 38, 38, 0.5), 0 0 80px rgba(220, 38, 38, 0.2); }
          }
          @keyframes splash-pulse-ring {
            0% { transform: scale(0.95); opacity: 0.5; }
            50% { transform: scale(1.1); opacity: 0; }
            100% { transform: scale(0.95); opacity: 0; }
          }
          @keyframes splash-bar {
            0% { width: 0%; }
            60% { width: 70%; }
            100% { width: 100%; }
          }
          #splash-screen {
            animation: splash-fade-in 0.8s ease-out;
          }
          #splash-logo {
            animation: splash-glow 2s ease-in-out infinite;
          }
          #splash-pulse {
            animation: splash-pulse-ring 2s ease-in-out infinite;
          }
          #splash-bar-fill {
            animation: splash-bar 1.8s ease-in-out forwards;
          }
        `}</style>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0a0a0a] text-white`}
      >
        <div id="splash-screen" style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0a',
          transition: 'opacity 0.4s ease-out',
        }}>
          {/* Pulse ring behind logo */}
          <div id="splash-pulse" style={{
            position: 'absolute',
            width: 120,
            height: 120,
            borderRadius: 24,
            border: '2px solid rgba(220, 38, 38, 0.3)',
          }} />
          {/* Logo */}
          <div id="splash-logo" style={{
            width: 80,
            height: 80,
            borderRadius: 18,
            overflow: 'hidden',
          }}>
            <img src="/logo.svg" alt="" style={{ width: '100%', height: '100%' }} />
          </div>
          {/* Brand name */}
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#fff' }}>
              Xuper<span style={{ color: '#dc2626' }}>Stream</span>
            </div>
          </div>
          {/* Loading bar */}
          <div style={{
            marginTop: 32,
            width: 160,
            height: 3,
            borderRadius: 2,
            background: 'rgba(255,255,255,0.08)',
            overflow: 'hidden',
          }}>
            <div id="splash-bar-fill" style={{
              height: '100%',
              borderRadius: 2,
              background: 'linear-gradient(90deg, #dc2626, #ef4444)',
            }} />
          </div>
        </div>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            var splash = document.getElementById('splash-screen');
            function hideSplash() {
              if (splash) {
                splash.style.opacity = '0';
                setTimeout(function() {
                  splash.style.display = 'none';
                  splash.remove();
                }, 400);
              }
            }
            // Hide after app loads
            if (document.readyState === 'complete') {
              setTimeout(hideSplash, 800);
            } else {
              window.addEventListener('load', function() {
                setTimeout(hideSplash, 800);
              });
            }
            // Safety: hide after 4s max
            setTimeout(hideSplash, 4000);
          })();
        `}} />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
