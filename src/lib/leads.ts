/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getGaClientId, trackLeadConversion } from './analytics';
import { getVisitorId, getSessionId, trackEvent } from './tracker';

export interface LeadPayload {
  type: string;
  name?: string;
  email: string;
  phone?: string;
  company?: string;
  website: string;
  competitor?: string;
  goal?: string;
  service?: string;
  budget?: string;
  comments?: string;
}

interface Attribution {
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string;
  utmContent: string;
  referrer: string;
  landingPage: string;
}

const ATTRIBUTION_KEY = 'oi_attribution';

/**
 * Captures first-touch marketing attribution (UTM params, referrer, landing
 * page) once per session, so a lead submitted five pages later still knows
 * which campaign brought the visitor in.
 */
function captureAttribution(): Attribution {
  const empty: Attribution = {
    utmSource: '', utmMedium: '', utmCampaign: '', utmTerm: '', utmContent: '',
    referrer: '', landingPage: '',
  };
  if (typeof window === 'undefined') return empty;

  try {
    const stored = sessionStorage.getItem(ATTRIBUTION_KEY);
    if (stored) return JSON.parse(stored);

    const params = new URLSearchParams(window.location.search);
    const attribution: Attribution = {
      utmSource: params.get('utm_source') || '',
      utmMedium: params.get('utm_medium') || '',
      utmCampaign: params.get('utm_campaign') || '',
      utmTerm: params.get('utm_term') || '',
      utmContent: params.get('utm_content') || '',
      referrer: document.referrer || '',
      landingPage: window.location.pathname + window.location.search,
    };
    sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
    return attribution;
  } catch {
    return empty;
  }
}

// Capture on first module load so the landing page/UTMs are recorded before
// the visitor navigates away from the entry URL.
if (typeof window !== 'undefined') {
  captureAttribution();
}

/**
 * Submits a lead to the backend (database + email + file backup) enriched
 * with marketing attribution, and reports a GA4 conversion event.
 * Also mirrors it into localStorage as a client-side backup.
 * Throws on network/server failure so callers can show an error state.
 */
export async function submitLead(payload: LeadPayload): Promise<void> {
  const attribution = captureAttribution();
  const enriched = {
    ...payload,
    ...attribution,
    submittedFrom: typeof window !== 'undefined'
      ? window.location.pathname + window.location.search
      : '',
    gaClientId: getGaClientId(),
    visitorId: getVisitorId(),
    sessionId: getSessionId(),
  };

  try {
    const existing = JSON.parse(localStorage.getItem('optimizeindex_leads') || '[]');
    localStorage.setItem(
      'optimizeindex_leads',
      JSON.stringify([{ id: 'lead_' + Date.now().toString(36), createdAt: new Date().toISOString(), ...enriched }, ...existing]),
    );
  } catch {
    // localStorage unavailable (private mode etc.) — server call below is the source of truth
  }

  const res = await fetch('/api/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(enriched),
  });

  if (!res.ok) {
    trackEvent('form_error', payload.type);
    throw new Error(`Lead submission failed with status ${res.status}`);
  }

  trackLeadConversion(payload.type, payload.goal, payload.service);
  trackEvent('form_submit', payload.type, { goal: payload.goal, service: payload.service });
}
