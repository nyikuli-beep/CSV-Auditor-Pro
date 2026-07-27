export function registerServiceWorker() {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[ServiceWorker] Registered successfully with scope:', registration.scope);

          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    console.log('[ServiceWorker] New content is available; please refresh.');
                  } else {
                    console.log('[ServiceWorker] Content is cached for offline use.');
                  }
                }
              };
            }
          };
        })
        .catch((error) => {
          console.error('[ServiceWorker] Registration failed:', error);
        });
    });
  } else if ('serviceWorker' in navigator) {
    // Register in dev mode as well for local testing
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[ServiceWorker] Registered in dev environment:', registration.scope);
        })
        .catch((err) => {
          console.warn('[ServiceWorker] Dev registration info:', err);
        });
    });
  }
}
