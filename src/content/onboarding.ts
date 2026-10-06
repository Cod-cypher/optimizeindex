/**
 * /towing-onboarding — the setup form a towing client fills in after paying.
 *
 * Transcribed from OptimizeIndex_Towing_Client_Onboarding.pdf, the paper
 * version of the same form, section for section and option for option. Three
 * wordings differ from the PDF, each on purpose:
 *
 *   - The PDF says the answers configure "your lead-generation system". Lead
 *     generation is on the roadmap, not the price list (ABOUT_ROADMAP in
 *     about.ts, and the Positioning section of CLAUDE.md), so the intro says
 *     the answers set up the account instead.
 *   - "Which jobs would you most like to receive?" reads as though we send the
 *     jobs. It asks which jobs they most want more of, which is how
 *     TowingJobsLeadForm already puts the same question.
 *   - The truck-count options in the PDF were "1 truck" and then "1–3", which
 *     overlap. The second is "2–3".
 *
 * Every word a client reads is here. Layout is in
 * src/pages/TowingOnboardingPage.tsx and behaviour in
 * src/components/towing/TowingOnboardingForm.tsx, which renders whatever this
 * file lists — a new question is one entry below and no change there.
 *
 * The server reads it too. server/onboarding/routes.ts validates submissions
 * against these definitions and server/onboarding/email.ts lays out the team's
 * email from them. Each field id is also a column name in the TowingOnboarding
 * table (prisma/schema.prisma), and required questions are NOT NULL there — so
 * adding a question, renaming an id or making one optional needs a migration
 * as well, or the database write fails over to leads.json.
 *
 * A phone number given here is a number to call back, not consent to text.
 * Do not add an SMS checkbox; see the SMS section of CLAUDE.md.
 */

import { CONTACT_PHONE_DISPLAY } from '../routes';

export type OnboardingFieldKind = 'text' | 'email' | 'tel' | 'url' | 'textarea' | 'single' | 'multi';

export interface OnboardingField {
  id: string;
  /** The question as the client reads it. */
  label: string;
  /** The label in the notification email, where the full question would bury the answer. */
  short: string;
  kind: OnboardingFieldKind;
  required?: boolean;
  /** For `single` and `multi`. */
  options?: readonly string[];
  /** Shown beneath the question. */
  hint?: string;
  placeholder?: string;
  /** Enforced by the input and again by the server, which clamps to it. */
  maxLength?: number;
  autoComplete?: string;
}

export interface OnboardingSection {
  id: string;
  title: string;
  fields: OnboardingField[];
}

const SELECT_ALL = 'Select all that apply.';

export const ONBOARDING_SECTIONS: OnboardingSection[] = [
  {
    id: 'business',
    title: 'Business information',
    fields: [
      {
        id: 'businessName',
        label: 'Business name',
        short: 'Business name',
        kind: 'text',
        required: true,
        maxLength: 200,
        autoComplete: 'organization',
      },
      {
        id: 'businessAddress',
        label: 'Business address',
        short: 'Business address',
        kind: 'text',
        required: true,
        placeholder: 'Street, city, state, ZIP code',
        maxLength: 250,
        autoComplete: 'street-address',
      },
      {
        id: 'website',
        label: 'Website',
        short: 'Website',
        kind: 'url',
        hint: 'If you have one.',
        placeholder: 'yourcompany.com',
        maxLength: 300,
        autoComplete: 'url',
      },
      {
        id: 'contactName',
        label: 'Primary contact name',
        short: 'Primary contact',
        kind: 'text',
        required: true,
        maxLength: 200,
        autoComplete: 'name',
      },
      {
        id: 'phone',
        label: 'Business phone number',
        short: 'Business phone',
        kind: 'tel',
        required: true,
        maxLength: 50,
        autoComplete: 'tel',
      },
      {
        id: 'email',
        label: 'Email address',
        short: 'Email',
        kind: 'email',
        required: true,
        placeholder: 'you@company.com',
        maxLength: 320,
        autoComplete: 'email',
      },
    ],
  },
  {
    id: 'fleet',
    title: 'Fleet and towing capabilities',
    fields: [
      {
        id: 'truckCount',
        label: 'How many trucks do you currently operate?',
        short: 'Trucks operated',
        kind: 'single',
        required: true,
        options: ['1 truck', '2–3', '4–6', '7–10', '11–20', 'More than 20'],
      },
      {
        id: 'services',
        label: 'What types of towing services do you offer?',
        short: 'Services offered',
        kind: 'multi',
        required: true,
        hint: SELECT_ALL,
        options: [
          'Light-duty towing',
          'Medium-duty towing',
          'Heavy-duty towing',
          'Flatbed towing',
          'Wheel-lift towing',
          'Motorcycle towing',
          'Accident recovery',
          'Roadside assistance',
          'Long-distance towing',
          'Private property / impound towing',
          'Vehicle recovery / winching',
        ],
      },
      {
        id: 'truckTypes',
        label: 'What types of trucks do you have?',
        short: 'Truck types',
        kind: 'multi',
        hint: SELECT_ALL,
        options: [
          'Flatbed / rollback',
          'Wheel-lift',
          'Integrated / heavy wrecker',
          'Rotator',
          'Medium-duty wrecker',
          'Service / roadside assistance vehicle',
          'Other',
        ],
      },
      {
        id: 'cannotHandle',
        label: 'Are there any vehicles or jobs you cannot handle?',
        short: 'Cannot handle',
        kind: 'textarea',
        hint: 'For example a maximum vehicle weight, heavy recovery, or underground garages.',
        maxLength: 1000,
      },
    ],
  },
  {
    id: 'area',
    title: 'Service area and ZIP codes',
    fields: [
      {
        id: 'zipListStatus',
        label: 'Do you have a list of ZIP codes you service?',
        short: 'ZIP code list',
        kind: 'single',
        required: true,
        options: ['Yes, I have a list', 'No, I need help creating one', 'I work within a service radius'],
      },
      {
        id: 'zipCodes',
        label: 'Your ZIP codes, target cities or counties',
        short: 'ZIP codes / areas',
        kind: 'textarea',
        hint: 'Paste them here, or tell us how you will share the list.',
        placeholder: '32801, 32803, 32804 — or the cities and counties you cover',
        maxLength: 5000,
      },
      {
        id: 'radius',
        label: 'Preferred service radius',
        short: 'Service radius',
        kind: 'single',
        hint: 'If it applies to how you work.',
        options: [
          'Under 10 miles',
          '10–20 miles',
          '21–30 miles',
          '31–50 miles',
          'More than 50 miles',
          'Varies by job',
        ],
      },
      {
        id: 'excludedAreas',
        label: 'Any ZIP codes, cities or areas you do not want jobs from?',
        short: 'Excluded areas',
        kind: 'textarea',
        maxLength: 1000,
      },
    ],
  },
  {
    id: 'dispatch',
    title: 'Availability and dispatch',
    fields: [
      {
        id: 'hours',
        label: 'What are your operating hours?',
        short: 'Operating hours',
        kind: 'single',
        required: true,
        options: ['24/7', 'Business hours only', 'Extended hours', 'Varies by day'],
      },
      {
        id: 'afterHours',
        label: 'Can you accept jobs after normal business hours?',
        short: 'After-hours jobs',
        kind: 'single',
        options: ['Yes', 'No', 'Sometimes, depending on availability'],
      },
      {
        id: 'callAnswerer',
        label: 'Who currently answers incoming calls?',
        short: 'Answers calls',
        kind: 'single',
        required: true,
        options: [
          'Owner',
          'Dedicated dispatcher',
          'Office staff',
          'Drivers',
          'Third-party answering service',
          'Automated / AI system',
          'Multiple people',
        ],
      },
      {
        id: 'callRouting',
        label: 'How should new job calls be handled or routed?',
        short: 'Call routing',
        kind: 'textarea',
        maxLength: 1000,
      },
    ],
  },
  {
    id: 'jobs',
    title: 'Job preferences and Google Business Profile',
    fields: [
      {
        id: 'wantedJobs',
        label: 'Which jobs do you most want more of?',
        short: 'Jobs wanted',
        kind: 'multi',
        required: true,
        hint: SELECT_ALL,
        options: [
          'Breakdown towing',
          'Accident towing / recovery',
          'Flatbed jobs',
          'Jump starts',
          'Lockouts',
          'Tire changes',
          'Fuel delivery',
          'Battery assistance',
          'Winching / vehicle recovery',
          'Long-distance towing',
          'Commercial / fleet accounts',
          'Dealer or repair-shop transports',
        ],
      },
      {
        id: 'hasProfile',
        label: 'Do you have a Google Business Profile (Google Business listing)?',
        short: 'Has a Google Business Profile',
        kind: 'single',
        options: ['Yes', 'No', 'Not sure'],
      },
      {
        id: 'profileLink',
        label: 'Google Business Profile or Google Maps link',
        short: 'Profile link',
        kind: 'url',
        hint: 'If you have one.',
        placeholder: 'Paste the link to your listing',
        maxLength: 300,
      },
      {
        id: 'profileAccess',
        label: 'Have you shared your Google Business Profile access with OptimizeIndex?',
        short: 'Profile access shared',
        kind: 'single',
        required: true,
        hint: 'If you have not shared access yet, our team will provide instructions for granting access securely. Do not write your Google password on this form.',
        options: ['Yes', 'No'],
      },
      {
        id: 'notes',
        label: 'Anything else we should know about your towing operations?',
        short: 'Anything else',
        kind: 'textarea',
        maxLength: 2000,
      },
    ],
  },
];

export const ONBOARDING_INTRO = {
  eyebrow: 'Client onboarding · Towing',
  /** Rendered as one h1; the accent half carries the highlight. */
  h1Lead: 'Towing Business',
  h1Accent: 'Setup Form',
  lede: 'Please provide the details below so we can set up your account around your fleet, your service area and the jobs your company can handle.',
  facts: [
    `${ONBOARDING_SECTIONS.length + 1} sections`,
    'Required unless marked optional',
    'Never asks for a password',
  ],
};

export const ONBOARDING_CONFIRMATION = {
  title: 'Final confirmation',
  statement:
    'I confirm that the information provided is accurate and that the service areas and job types listed reflect the work my towing company can accept.',
};

export const ONBOARDING_SECURITY_NOTE =
  'For your security, share account access through platform invitations or an approved secure method — not by entering passwords in this form.';

export const ONBOARDING_SUBMIT = {
  idle: 'Submit setup details',
  busy: 'Sending…',
  /** Followed by the phone and email links. */
  help: 'Not sure how to answer something? Ask us:',
};

export const ONBOARDING_SUCCESS = {
  title: 'Thank you. We have your details.',
  body: 'Thank you for choosing OptimizeIndex. Our team will review your details and follow up if anything else is needed to begin setup.',
};

export const ONBOARDING_ERRORS = {
  required: 'Please answer this one.',
  pickOne: 'Please pick one.',
  pickSome: 'Please pick at least one.',
  email: 'That email address does not look right.',
  confirm: 'Please confirm before you submit.',
  summary: (count: number) =>
    count === 1
      ? 'One question still needs an answer.'
      : `${count} questions still need an answer.`,
  failed: `That did not send. Please try again, or call us on ${CONTACT_PHONE_DISPLAY}.`,
};
