'use client';

import Script from 'next/script';

/**
 * Initialization scripts that run on page load.
 * Extracted from layout.tsx to avoid dangerouslySetInnerHTML.
 * These scripts are static and contain no user-supplied data.
 */
export function InitScripts() {
  return (
    <>
      {/* Locale sync script */}
      <Script id="locale-sync" strategy="beforeInteractive">
        {`
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
        `}
      </Script>

      {/* Ad blocker / popup blocker script */}
      <Script id="ad-blocker" strategy="beforeInteractive">
        {`
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
        `}
      </Script>

      {/* Service worker registration script */}
      <Script id="service-worker" strategy="afterInteractive">
        {`
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').then(function(reg) {
                console.log('SW registered:', reg.scope);
              }).catch(function(err) {
                console.log('SW registration failed:', err);
              });
            });
          }
        `}
      </Script>
    </>
  );
}
