/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/** Send an SPA page view to GA4 on route changes. */
export function trackPageView(pagePath: string) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', 'page_view', {
    page_path: pagePath,
    page_location: window.location.href,
    page_title: document.title,
  });
}

/** Report a captured lead as a GA4 conversion event. */
export function trackLeadConversion(leadType: string, goal?: string, service?: string) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', 'generate_lead', {
    lead_type: leadType,
    goal: goal || '',
    service: service || '',
  });
}

/** Extract the GA4 client id from the _ga cookie (format GA1.1.111111.222222). */
export function getGaClientId(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)_ga=([^;]+)/);
  if (!match) return '';
  const parts = match[1].split('.');
  return parts.length >= 4 ? `${parts[2]}.${parts[3]}` : '';
}
