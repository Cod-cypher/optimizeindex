/**
 * /towing-jobs/private-property-towing-contracts
 *
 * SERP note (checked 2026-09-17): "how to get private property towing
 * contracts" returns operator-facing listicles written by towing companies
 * (Freeway Towing El Cajon, Chavez Towing, B&D Towing), an insurance broker's
 * guide (Wexford), forum threads, a US Legal Forms contract template and one
 * Texas administrative rule. Intent is informational and operator-side, which
 * matches. None of the ranking pages cite the statute that governs the tow, and
 * the statute is the thing a property manager will ask about first. That is
 * the gap this page fills.
 *
 * Organising axis: JobSource — who awards the contract, how it is won, what it
 * obliges. Not the pillar's DemandIntent axis, which has a 'private-property'
 * value of its own; reusing that would produce a paraphrase of the pillar's
 * impound section and trip the similarity gate.
 *
 * Boundaries: the pillar's `impound-reviews` section owns what to do about the
 * one-star reviews this work attracts; /towing-jobs's `private-property` section
 * owns the one-paragraph summary of the channel; commercial-towing-accounts
 * owns the generic mechanics of selling on account. None of that is repeated.
 *
 * Sourcing: every state rule cited here was read from the state's own
 * published statute or code on the date in `checkedAt`. Indiana's commercial
 * private-property tow-away statute (IC 24-14-4) could not be read from
 * iga.in.gov on that date, so Indiana is named as a gap rather than
 * paraphrased from a secondary source; Georgia's rules were already recorded
 * as unconfirmed in CONTENT_GAPS. No rate, fee, volume or contract-value figure
 * appears on the page.
 */

import type { TowingJobsChild } from './index';
import type { SourceRef } from '../towing';

const CA_VC_22658: SourceRef = {
  label: 'California Legislative Information - Vehicle Code § 22658',
  url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=VEH&sectionNum=22658',
  supports:
    'Who may authorise removal from private property; the sign requirement (not less than 17 by 22 inches, lettering not less than one inch, in plain view at all entrances, naming the local traffic law enforcement agency and each towing company with an authorisation agreement); notifying the local traffic law enforcement agency within one hour of authorising the tow; the charge cap of not more than one-half of the regular towing charge when the owner returns after the vehicle is coupled but before it leaves the property; storage within a 10-mile radius unless the law enforcement agency approves otherwise; and charges being excessive if they exceed law-enforcement-agreement rates or the rate approved by the CHP for that operator.',
  checkedAt: '2026-09-17',
};

const FL_715_07: SourceRef = {
  label: 'The Florida Senate - Florida Statutes § 715.07 (vehicles or vessels parked on private property; towing)',
  url: 'https://www.flsenate.gov/Laws/Statutes/2025/715.07',
  supports:
    'The notice requirement of light-reflective lettering not less than 4 inches high on a contrasting background, the words "tow-away zone" between 3 and 6 feet above ground, and the sign maintained for not fewer than 24 hours before any vehicle is removed; the storage-site limit of 10 miles from the point of removal in a county of 500,000 or more residents and 30 miles in a smaller county; and notification of the municipal police or sheriff within 30 minutes of completing the removal, recording the name of the person notified on the trip record.',
  checkedAt: '2026-09-17',
};

const WA_RCW_46_55_070: SourceRef = {
  label: 'Washington State Legislature - RCW 46.55.070 (posting requirements; exception)',
  url: 'https://app.leg.wa.gov/rcw/default.aspx?cite=46.55.070',
  supports:
    'That no unauthorised vehicle on nonresidential private property or in a public parking facility may be impounded within its first 24 hours unless a sign posted near each entrance and in a conspicuous location states the times a vehicle may be impounded and the name, telephone number and address of the towing firm where it may be redeemed; that residential property is exempt and the person in charge may have a vehicle impounded immediately on written authorisation; and that the Department of Licensing sets the sign size, lettering, placement and number by rule.',
  checkedAt: '2026-09-17',
};

const PA_212_115: SourceRef = {
  label: 'Pennsylvania Code & Bulletin - 67 Pa. Code § 212.115 (posting of private parking lots)',
  url: 'https://www.pacodeandbulletin.gov/Display/pacode?file=/secure/pacode/data/067/chapter212/s212.115.html&d=reduce',
  supports:
    'The posting standard a Pennsylvania private lot must meet before a vehicle can be towed from it: signs at each entrance facing entering traffic, a primary restriction (private parking, permit only, authorised parking only) in letters at least 3 inches high, supplemental messages such as hours, days, charges and towing warnings at least 2 inches high, larger lettering as distance from the entrance grows, and a retroreflective or illuminated message where the restriction applies in darkness.',
  checkedAt: '2026-09-17',
};

const MI_AG_TOWING: SourceRef = {
  label: 'Michigan Department of Attorney General - Consumer Alert: Towing',
  url: 'https://www.michigan.gov/consumerprotection/protect-yourself/consumer-alerts/auto/towing',
  supports:
    'The posted-notice obligation before a vehicle may be towed from private property in Michigan, and the routes a motorist can use to complain about a tow: the Department of Attorney General, the local police, or the Michigan State Police Commercial Vehicle Enforcement Division.',
  checkedAt: '2026-08-28',
};

export const privatePropertyContracts: TowingJobsChild = {
  slug: 'private-property-towing-contracts',
  h1: 'Getting Private Property Towing Contracts',
  title: 'Getting Private Property Towing Contracts | OptimizeIndex',
  description:
    'Who awards private property towing contracts, what a manager is buying, the posting and notice rules that make a tow lawful, and what the contract obliges.',
  lede:
    'A private property towing contract is an agreement with whoever controls a lot, a garage or a residential complex to remove vehicles that are parked there without authority. The property does not pay you; the vehicle owner does, at rates the state often caps. What the property is buying is a problem handled without becoming a bigger one, and the operator who understands the statute better than the manager does is the one who tends to get the signature.',

  sections: [
    {
      id: 'who-awards',
      question: 'Who actually awards private property towing contracts?',
      answer:
        'The person with authority over the lot, which is rarely the person who complains about the parking. Property management companies, apartment owners and their regional managers, homeowner and condominium associations, retail and office landlords, hospitals, campuses and parking operators all hold these contracts, and most of them hold several properties at once.',
      detail: [
        '**Management companies** are the most efficient target because one relationship can cover a portfolio. The on-site manager feels the problem every day, but the regional or portfolio manager usually signs the vendor agreement, so the conversation has to reach both: the first tells you what is actually going wrong on the lot, the second decides.',
        '**Associations** decide slowly and in public. An HOA or condo board votes on vendors, minutes are kept, and residents who have been towed turn up at meetings. A board that has been embarrassed by a previous operator is often the most receptive audience, and the most demanding one.',
        '**Commercial landlords and parking operators** think in liability first. A retail lot that tows a customer has lost a customer and possibly a tenant, so their appetite is narrow: overnight, abandoned vehicles, fire lanes and reserved spaces, handled quietly.',
        '**Churn is structural.** Management companies lose and win buildings, boards turn over, and the operator who held the contract under the last manager is not automatically kept by the next. That cuts both ways: it is how contracts are lost, and it is how they open up.',
      ],
    },
    {
      id: 'what-they-want',
      question: 'What is a property manager actually buying?',
      answer:
        'Fewer complaints, less exposure and no 2am phone calls. A manager is measured on occupancy, renewals and how many residents or tenants are angry with them, and a wrongful tow damages all three. They want an operator who will decline the tow that should not happen as readily as perform the one that should.',
      detail: [
        'Read their incentives before you pitch. Nobody in property management is paid for the number of vehicles removed. They are paid for a full building with quiet residents, and every tow carries some risk of a complaint, a review naming the property, a chargeback dispute or, at the extreme, a claim. The operator who understands that is selling risk reduction, not removal.',
        'What they fear most is being wrong: towing a resident with a valid permit, a guest whose pass had lapsed by an hour, or a vehicle from a lot whose signage did not meet the statute. In every one of those cases the property, not only the operator, is exposed. Your process for confirming authority before the hook goes on is therefore part of what you are selling.',
        'What they value is not having to think about it. A clear authorisation procedure, an agreed patrol or call-out arrangement, a release process that does not route through their office, and documentation they can produce if a resident disputes a tow. When those exist, the contract tends to renew by inertia.',
        'What they will check is whether anyone has complained about you. A manager evaluating two operators will search both names, and the impound side of a towing business generates the reviews they will read. The pillar page covers what to do about that in depth; here it is enough to say that it is part of the evaluation whether or not you want it to be.',
      ],
    },
    {
      id: 'lawful-tow',
      question: 'What has to be true before a vehicle can lawfully be towed from private property?',
      answer:
        'It varies by state, but the shape is common: the property must be posted with signs that meet a published standard, the removal must be authorised by someone with authority over the property, law enforcement must be told within a set window, the vehicle must be stored within a set distance, and the owner has rights at the moment of removal and at redemption.',
      detail: [
        '**Signage** is the obligation most often failed, and it is the property\'s obligation rather than yours, which is exactly why it is your opening. A lot that is posted wrongly, or not at all, cannot lawfully have vehicles removed from it in most states, however clear the parking rules are in the lease.',
        '**Authorisation** decides who can call for the tow. Some states require the sign itself to name the towing company, which ties the operator to the property in public; others require written authorisation from the person in charge, per vehicle or as a standing arrangement. A tow performed on the say-so of a resident, a security guard without delegated authority or a tenant is the kind that ends contracts.',
        '**Notification** to police or the sheriff is a timed duty, in some states counted in minutes. It exists so that a motorist who finds their vehicle gone can learn from a phone call that it was towed rather than stolen, and it is the record that protects you if the tow is later disputed.',
        '**Storage distance** is regulated because a lot an hour away is itself a penalty. States set a radius from the point of removal, sometimes varied by county population, and the release desk has to be reachable within it.',
        '**The owner\'s rights** at the scene and at the counter are where operators most often get complained about: what can be charged if the owner arrives while the vehicle is being hooked, what must be accepted as payment, and what the release hours are. Several states cap the charge when a vehicle is coupled but has not yet left the property.',
        'The rules below are the ones we could confirm from the state\'s own published statute or code. Where we could not, we say so rather than paraphrase a secondary source.',
      ],
    },
    {
      id: 'by-state',
      question: 'How do the rules differ in the states we write about?',
      answer:
        'California, Florida, Washington and Pennsylvania each publish a specific posting standard, and California and Florida also fix the storage radius and the police notification window in statute. Michigan publishes the obligations through its Attorney General. Indiana and Georgia are not summarised here because we could not read their rules from a primary source.',
      detail: [
        '**California** (Vehicle Code § 22658): the sign must be not less than 17 by 22 inches with lettering not less than one inch high, displayed in plain view at all entrances, stating that public parking is prohibited and vehicles will be removed at the owner\'s expense, and carrying the telephone number of the local traffic law enforcement agency and the name and number of each towing company that holds an authorisation agreement for the property. Whoever authorises the tow must notify that law enforcement agency within one hour. If the owner returns after the vehicle is coupled but before it leaves the property, the charge may be no more than one-half of the regular towing charge. Storage must be within a 10-mile radius of the property unless the law enforcement agency approves otherwise, and a charge is excessive if it exceeds what a law-enforcement agreement or the operator\'s CHP-approved rate would allow.',
        '**Florida** (§ 715.07): notice must be in light-reflective letters not less than 4 inches high on a contrasting background, with the words "tow-away zone" between 3 and 6 feet above the ground, and the sign must have been in place for at least 24 hours before any vehicle is removed. The storage site must be within 10 miles of the point of removal in a county of 500,000 or more residents and within 30 miles in a smaller county. The operator must notify the municipal police or, in an unincorporated area, the sheriff within 30 minutes of completing the removal, and record the name of the person notified on the trip record. Florida\'s county rate caps for non-consensual towing are covered on our Florida page and are not repeated here.',
        '**Washington** (RCW 46.55.070): on nonresidential private property and in public parking facilities, no unauthorised vehicle may be impounded within its first 24 hours unless a sign near each entrance, in a conspicuous location, states the times a vehicle may be impounded and the name, telephone number and address of the towing firm where it can be redeemed. Residential property is exempt: the person in charge may have a vehicle impounded immediately on written authorisation. The Department of Licensing sets sign size, lettering, placement and number by rule, and the operator must be a registered tow truck operator, which our Washington page covers.',
        '**Pennsylvania** (67 Pa. Code § 212.115): a private lot must be posted at each entrance with signs facing entering traffic, carrying a primary restriction such as "private parking", "parking by permit only" or "authorized parking only" in letters at least 3 inches high, with any supplemental message about hours, days, charges or towing at least 2 inches high, larger as the sign sits further from the entrance, and retroreflective or illuminated where the restriction is enforced after dark. Towing from a lot that is not posted to this standard is prohibited.',
        '**Michigan**: the Attorney General publishes the posted-notice obligation for private-property towing in a consumer alert, together with the three places a motorist can complain: the Department of Attorney General, the local police, and the State Police Commercial Vehicle Enforcement Division. A Michigan property manager can be expected to have read it, and the operator should have too.',
        '**Indiana and Georgia**: Indiana regulates commercial private-property tow-away zones in its towing services article, and Georgia regulates non-consensual towing at state and local level, but on the date this page was last reviewed we could not read either from the state\'s own published code. They are recorded in our content gaps and will be added when they can be confirmed. Rules also change; the date at the top of this page is when these were last read.',
      ],
    },
    {
      id: 'how-you-win',
      question: 'How do you actually win the contract?',
      answer:
        'By walking the lot before you talk about the work. An operator who can show a manager where their signage fails the state standard, what their authorisation process should look like and how a release will be handled has demonstrated the thing the manager most needs, and has done it without quoting a price the property will never pay anyway.',
      detail: [
        '**Start with a signage audit.** Photograph every entrance and compare what is posted against the statute for your state. Most lots fail somewhere: a missing entrance, lettering under the minimum, no law-enforcement number, an old operator\'s name still on the sign. Presenting that to a manager is a free service that proves competence and creates an immediate reason to work together.',
        '**Bring the authorisation model, not a form to sign.** Explain how removals will be authorised on this property: who at the property can call, whether there is a standing arrangement for defined categories such as fire lanes and abandoned vehicles, how permits or guest passes will be verified, and what you will decline. A manager who has been burned wants to hear what you will not tow.',
        '**Set the patrol and response terms in their language.** Some properties want scheduled patrols at fixed times; some want call-out only; residential complexes often want both with different rules by hour. Agree what response means, in minutes, for each, and write it down.',
        '**Describe the release.** Where the lot is and how far it is from the property, the hours the counter is open, what forms of payment you accept, what the owner needs to bring, and how disputes reach you rather than the manager. This is the part of the service the manager\'s residents will experience, and it is where the complaints come from.',
        '**Close with the paperwork they will need to defend a tow**: time-stamped photographs of the vehicle and the posted signs, the authorisation record, the police notification with the name of the person told, and the trip record. A manager who has been asked by a resident\'s lawyer for exactly these documents will value them more than anything else you offer.',
        'The generic mechanics of selling on account, from insurance certificates to who signs, are covered on the commercial accounts page and are the same here. What differs is the pitch, and the pitch is compliance.',
      ],
      callCta: 'Talk about how property work fits your board',
    },
    {
      id: 'what-it-obliges',
      question: 'What does the contract oblige you to do?',
      answer:
        'To perform every tow lawfully, decline the ones that are not, respond within the windows you agreed, store within the distance the state allows, release under the rules the state sets, and keep the records that prove all of it. The obligations run to the vehicle owner as much as to the property, and the vehicle owner is someone you never contracted with.',
      detail: [
        'The tows you decline are part of the service. A guard who wants a resident\'s car gone, a manager who wants a vehicle removed from an unposted section of the lot, a call to tow a car that arrived twenty minutes ago on a property whose statute requires longer: each is a request you are being paid, in effect, to refuse. Operators who cannot say no to the property end up losing it.',
        'Records are not optional. The photograph of the sign at the entrance the vehicle used, the photograph of the vehicle where it sat, the authorisation, the time you notified police and who you spoke to, and the itemised charges at release. Some of this is required by statute; all of it is what stands between you and a dispute you cannot win.',
        'Release is a customer-service job performed for an angry customer. The counter is where an entirely lawful tow turns into a complaint, a chargeback or a one-star review that names the property as well as you. Clear hours, accepted payments and a calm explanation of the statute do more for contract retention than anything on the truck.',
        'Complaints have official routes, and managers know them. Michigan lists three; other states route through the police agency you notified or a consumer-protection office. A property that sees its name in a complaint file is a property that reconsiders its vendor.',
        'And the rates are often not yours to set. Where a state caps non-consensual charges or references them to law-enforcement rates, charging above the cap is not a pricing decision but a violation, and it is one of the fastest ways to lose both the contract and your standing with the local police agency.',
      ],
    },
    {
      id: 'search-and-us',
      question: 'Where does search visibility fit, and what does OptimizeIndex do here?',
      answer:
        'Visibility does not win a property contract; a walk of the lot and a compliance conversation do. It matters twice afterwards: when the manager checks you before signing, and when every towed motorist searches your name to find the release desk. We work on those two moments. We do not broker property contracts, place operators with managers or sell this work as leads.',
      detail: [
        'The manager\'s check is a search for your business name, and what comes back is your profile, your reviews and your website. A profile with the storage lot\'s correct address and release hours, a website that states plainly how a release works, and review responses that explain the statute rather than argue with the reviewer are what a careful manager wants to see.',
        'The motorist\'s search is the other half. Someone whose car has gone will search your name and the word "impound" within minutes, and if the address, the hours and the phone number they find are wrong, the dispute starts before they reach you. Getting that right is ordinary local-search work with an unusually direct effect on how many complaints the property hears about.',
        'What we cannot do is decide whether a manager chooses you, or guarantee that any property will. We are not a broker, we do not sell shared leads or place operators on anyone\'s vendor list, and lead generation is something we are building rather than something we sell today. If it is a broker you want, we would rather say so than sell you something adjacent.',
      ],
    },
  ],

  sources: [CA_VC_22658, FL_715_07, WA_RCW_46_55_070, PA_212_115, MI_AG_TOWING],

  faqs: [
    {
      question: 'Do I need a written contract with the property, or can a manager just call me?',
      answer:
        'You need authority you can prove. States differ on the form: California requires the sign itself to name each towing company that holds an authorisation agreement for the property, and Washington lets residential property authorise an immediate impound in writing. Whatever your state requires, a tow performed on the word of someone without authority over the property is the one that ends the relationship.',
    },
    {
      question: 'Can a property manager have any car towed that they want?',
      answer:
        'No. In every state we write about, the lot has to be posted to a published standard before a vehicle can be removed, and several states add waiting periods, residential exemptions or authorisation rules on top. A manager who asks for a tow the statute does not allow is asking you to carry the exposure with them.',
    },
    {
      question: 'What happens if the owner turns up while I am hooking the vehicle?',
      answer:
        'It depends on the state. California caps the charge at no more than one-half of the regular towing charge if the owner returns after the vehicle is coupled but before it leaves the property. Other states set their own rules. Know yours before the first tow, because this is the moment most complaints are born.',
    },
    {
      question: 'How far from the property can my storage lot be?',
      answer:
        'California requires storage within a 10-mile radius unless the law enforcement agency approves otherwise. Florida allows 10 miles in a county of 500,000 or more residents and 30 miles in a smaller county. Other states set their own limits or leave it to local ordinance. A manager will ask, because a distant lot generates the complaints they hear about.',
    },
    {
      question: 'Do I have to tell the police about a private property tow?',
      answer:
        'In most states, yes, within a set window. California requires whoever authorised the tow to notify the local traffic law enforcement agency within one hour; Florida requires the operator to notify the municipal police or sheriff within 30 minutes of completing the removal and to record who was told. The notification is also the record that protects you if the tow is disputed.',
    },
    {
      question: 'Does OptimizeIndex get towing companies property contracts?',
      answer:
        'No. We do not broker property contracts, place operators with management companies or sell property work as leads. We work on how your business appears when a manager checks you and when a towed motorist searches for the release desk, and we cannot decide whether either of them chooses you.',
    },
  ],
};
