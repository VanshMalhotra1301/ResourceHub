/**
 * BU Resource Hub - Main Application Entry Point
 * Global error boundary, performance timing, and environment diagnostics
 */

(function () {
    // ── Global Error Boundary ──────────────────────
    window.addEventListener('error', (event) => {
        console.error('[BU Hub Error]', event.message, '|', event.filename, ':', event.lineno);
    });

    window.addEventListener('unhandledrejection', (event) => {
        console.error('[BU Hub Unhandled Promise]', event.reason);
    });

    // ── Performance Timing ─────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
        const loadTime = performance.now();
        console.log(`⚡ BU Resource Hub 2026 initialized in ${loadTime.toFixed(0)}ms`);

        // Log performance metrics after full page load
        window.addEventListener('load', () => {
            const timing = performance.getEntriesByType('navigation')[0];
            if (timing) {
                console.log(`📊 Page Performance:`, {
                    dns: `${(timing.domainLookupEnd - timing.domainLookupStart).toFixed(0)}ms`,
                    connection: `${(timing.connectEnd - timing.connectStart).toFixed(0)}ms`,
                    ttfb: `${(timing.responseStart - timing.requestStart).toFixed(0)}ms`,
                    domReady: `${(timing.domContentLoadedEventEnd - timing.fetchStart).toFixed(0)}ms`,
                    fullLoad: `${(timing.loadEventEnd - timing.fetchStart).toFixed(0)}ms`
                });
            }
        });
    });
})();
