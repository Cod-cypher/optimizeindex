/**
 * The text messaging (SMS) program.
 *
 * Everything the carriers' registry, the messaging provider and a customer
 * could hold us to lives here, once: what we text about, how often, how
 * someone opts in, and the exact wording of the confirmation, opt-out and
 * help messages. The /sms-program page, the SMS sections of the privacy
 * policy and the terms, and the campaign registered with the provider all
 * read from these constants, so they cannot drift from each other.
 *
 * Two things are load-bearing.
 *
 * The opt-in is verbal, on a phone call, and nowhere else. A phone number
 * typed into a form on this site, or given to the chat assistant, is a
 * number to call back — it is not consent to be texted. That is the promise
 * this file makes to the registry, and the reason no form on the site
 * carries an SMS checkbox. Enrolling a number without the script below
 * having been read, and the answer logged, breaks it.
 *
 * The frequency, the keywords and the three messages are what the campaign
 * was registered with. Changing any of them here means re-submitting the
 * campaign, not just redeploying the site.
 */

import { LEGAL_NAME } from './about';
import { CONTACT_EMAIL, CONTACT_PHONE_DISPLAY } from '../routes';

export const SMS_PROGRAM_PATH = '/sms-program';

/** How the program is named to a customer and to the provider. */
export const SMS_PROGRAM_NAME = 'OptimizeIndex';

/** The platform that delivers the texts. Named because the privacy policy
 *  says consent is shared with nobody else, and "nobody else" should be
 *  checkable. */
export const SMS_PROVIDER = 'Twilio';

/** Stated the same way everywhere: page, policy, terms, provider. */
export const SMS_FREQUENCY = 'Message frequency varies, up to 4 messages per month.';
export const SMS_RATES = 'Message and data rates may apply.';

export const SMS_OPT_OUT_KEYWORDS = ['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'];
export const SMS_HELP_KEYWORDS = ['HELP', 'INFO'];

/** What a customer can expect to be texted about. Plain text, one per line. */
export const SMS_MESSAGE_TYPES = [
  'Replies to an inquiry you made by phone, form or the chat on this site',
  'Quotes and proposals, and a link to read one',
  'The results of a free website or search visibility check',
  'Scheduling: confirming, reminding about or moving a call',
  'Account and support updates for active clients',
];

/**
 * The verbal opt-in script. Read aloud, in full, by a team member on a call
 * with the customer before the first text is sent. Every disclosure the
 * registry expects is in it: where the privacy policy and terms are, purpose,
 * frequency, rates, STOP, HELP, that texting is optional, and confirmation of
 * the number.
 *
 * The URLs come first and are not optional. The campaign was rejected on
 * 2026-09-17 (Twilio error 30896) because an earlier version of this script
 * asked for consent without directing the customer to the privacy policy and
 * terms. The reviewer's words: "Ensure agents verbally direct customers to
 * the exact website URL where the Privacy Policy and Terms & Conditions can
 * be reviewed prior to obtaining consent."
 */
export const SMS_OPT_IN_SCRIPT =
  'Our privacy policy is at optimizeindex.com/privacy-policy and our terms are at optimizeindex.com/terms-of-service. Would you like OptimizeIndex to text you about your inquiry, quotes, scheduling and support? Up to 4 msgs a month. Msg & data rates may apply. Reply HELP for help, STOP to opt out. Texting is not required to work with us. Is that a yes, and what mobile number should we use?';

/**
 * The consent statement, in the form reviewers expect to see it on the page:
 * what the customer is agreeing to, from whom, how often, at what cost, and
 * how to leave. This is the sentence the customer's "yes" on the call is a
 * yes to. Uses the abbreviated carrier wording ("Msg & data rates may apply")
 * on purpose, because that is the string reviewers search for.
 */
export const SMS_CONSENT_STATEMENT = `By saying yes when asked on the call, you agree to receive text messages from ${SMS_PROGRAM_NAME} (${LEGAL_NAME}) about your inquiries, quotes, service information, scheduling, appointment updates and customer support. Message frequency varies, up to 4 messages per month. Msg & data rates may apply. Reply STOP to opt out at any time, HELP for help. Consent is not a condition of purchase.`;

/** What gets logged when the customer says yes. */
export const SMS_CONSENT_RECORD = [
  'The mobile number, as confirmed on the call',
  'The date and time of the call',
  'The name of the team member who read the script',
  'That the customer said yes',
];

/** Sent once, immediately after consent. Registered with the provider. */
export const SMS_OPT_IN_MESSAGE = `${SMS_PROGRAM_NAME}: Thanks for agreeing to receive texts from us about your inquiry, quotes, scheduling and support. Msg frequency varies, up to 4 msgs/month. Msg & data rates may apply. Reply HELP for help, STOP to opt out.`;

/** Sent once in reply to any opt-out keyword, then nothing further. */
export const SMS_OPT_OUT_MESSAGE = `${SMS_PROGRAM_NAME}: You are unsubscribed and will receive no further texts from us. Questions? Email ${CONTACT_EMAIL} or call ${CONTACT_PHONE_DISPLAY}.`;

/** Sent in reply to any help keyword. */
export const SMS_HELP_MESSAGE = `${SMS_PROGRAM_NAME}: For help, email ${CONTACT_EMAIL} or call ${CONTACT_PHONE_DISPLAY}. Msg frequency varies, up to 4 msgs/month. Msg & data rates may apply. Reply STOP to opt out.`;

/**
 * The sentence the registry looks for, worded the way the CTIA guidance
 * words it. Do not paraphrase it; reviewers search for it.
 */
export const SMS_NO_SHARING =
  'Mobile information, including SMS opt-in data and consent, will not be shared with third parties or affiliates for their own marketing or promotional purposes.';

/**
 * Twilio's own required sentence for the privacy policy it links from the
 * campaign, quoted from the campaign form. It sits beside the CTIA one above
 * because each reviewer searches for their own wording. Verbatim, always.
 */
export const SMS_TWILIO_STATEMENT =
  'We do not sell or share your SMS opt-in data or personal information with third parties for marketing purposes.';

/**
 * The sentence Twilio's error 30908 documentation says the privacy policy
 * "must include". A third wording of the same promise, kept verbatim for the
 * same reason as the two above: a reviewer checking a rejection against that
 * page searches for this string.
 */
export const SMS_PRIVACY_REQUIRED_SENTENCE =
  'We do not share, sell, or provide your mobile phone number or messaging consent data to third parties or affiliates for marketing or promotional purposes.';

/**
 * Stated on every surface because it decides which kind of consent is valid.
 * Twilio's vetting guidance: verbal consent is not sufficient for marketing
 * content, which needs written consent. This campaign is registered as
 * conversational and customer-care traffic on the strength of this sentence,
 * so a promotional text sent under it is a compliance breach, not a judgment
 * call.
 */
export const SMS_NO_MARKETING = `${SMS_PROGRAM_NAME} does not send marketing or promotional text messages. Every text replies to a conversation you started with us.`;

/** How the number itself is obtained, which the registry asks to be stated. */
export const SMS_NUMBER_COLLECTION =
  'Your mobile number is collected on that call: the team member confirms the number you are calling from, or the number you gave us when you asked for a call back, before anything is sent to it.';

export const SMS_PROVIDER_SHARING = `Text messaging opt-in data and consent are not shared with any third party other than ${SMS_PROVIDER}, the messaging provider that delivers ${SMS_PROGRAM_NAME}'s texts on our behalf.`;

export const SMS_CARRIER_LIABILITY = 'Mobile carriers are not liable for delayed or undelivered messages.';

/**
 * The brand name exactly as it appears on the Twilio brand registration
 * (BN5a1ab020eb3d2e7276535e09d6420b81), which is spelled with a space. The
 * registry requires the privacy policy and terms to name the registered
 * brand, so this spelling has to appear on those pages even though the site
 * writes the name as one word everywhere else. If the brand is ever renamed
 * in Twilio, change this to match, character for character.
 */
export const SMS_BRAND_DISPLAY = 'Optimize Index';

/** One line for the page intro and the top of both policy sections. */
export const SMS_PROGRAM_SUMMARY = `${SMS_PROGRAM_NAME} (registered with mobile carriers as ${SMS_BRAND_DISPLAY}), a trade name of ${LEGAL_NAME}, sends text messages to customers and prospective customers who have asked, on a phone call with us, to hear from us by text.`;
