// app/layout.tsx
import '../src/styles/globals.css';

export const metadata = {
  title: 'PrivateScribe',
  description: 'Private, on-device meeting transcription & summaries',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="govuk-template">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="manifest" href="/manifest.json" />
        {/* GOV.UK CSS served from /public/govuk */}
        <link rel="stylesheet" href="/govuk/govuk-frontend.min.css" />
      </head>
      <body className="govuk-template__body">
        <a href="#main" className="govuk-skip-link">Skip to main content</a>

        {/* Header – service name only */}
        <header className="govuk-header" role="banner" data-module="govuk-header">
          <div className="govuk-header__container govuk-width-container">
            <div className="govuk-header__content">
              <a className="govuk-header__link govuk-header__service-name" href="/">PrivateScribe</a>
            </div>
          </div>
        </header>

        <div className="govuk-width-container" id="main">
          <main className="govuk-main-wrapper" id="content" role="main">
            {children}
          </main>
        </div>

        {/* Footer – your credit + attribution */}
        <footer className="govuk-footer" role="contentinfo">
          <div className="govuk-width-container">
            <div className="govuk-footer__meta">
              <div className="govuk-footer__meta-item govuk-footer__meta-item--grow">
                <p className="govuk-footer__licence-description">
                  <strong>PrivateScribe</strong> — developed by <span className="govuk-!-font-weight-bold">Bashir Abubakar</span>.
                </p>
                <p className="govuk-hint govuk-!-margin-top-1">
                  UI built with the <a className="govuk-footer__link" href="https://design-system.service.gov.uk/">GOV.UK Design System</a>. Not an official government service.
                </p>
              </div>
            </div>
          </div>
        </footer>

        {/* Service worker (don’t register in dev) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
          if ('serviceWorker' in navigator) {
            if (location.hostname !== 'localhost') {
              window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(()=>{}));
            } else {
              navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()));
              caches?.keys?.().then(keys => keys.forEach(k => caches.delete(k)));
            }
          }`,
          }}
        />
        {/* GOV.UK JS + init */}
        <script src="/govuk/govuk-frontend.min.js" defer></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
          (function(){
            var init=function(){ try { window.GOVUKFrontend && window.GOVUKFrontend.initAll(); } catch(e){} };
            if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
          })();`,
          }}
        />
      </body>
    </html>
  );
}
