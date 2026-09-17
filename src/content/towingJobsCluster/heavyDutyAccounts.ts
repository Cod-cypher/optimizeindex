/**
 * /towing-jobs/heavy-duty-towing-accounts
 *
 * SERP note (checked 2026-09-17): "how to get heavy duty towing accounts"
 * returns towing companies' own heavy-duty and fleet-account service pages
 * (Smith Towing, Geyers, Mortons, Twin Cities Transport & Recovery), a
 * payments vendor (RoadSync), start-a-tow-business guides (UpFlip, Indeed) and
 * Tow Academy's general marketing post. The intent is mixed, as it was for
 * commercial accounts: half local-commercial, half thin operator-informational.
 * Nothing ranking explains who actually buys heavy recovery, or that state
 * DOTs run certified quick-clearance programs with published equipment,
 * training, response and payment specifications. That is the gap.
 *
 * Organising axis: JobSource — who buys heavy recovery and what each buyer
 * qualifies on. The general mechanics of selling on account (who signs,
 * insurance certificates, billing terms) belong to commercial-towing-accounts
 * and are linked, not repeated. The pillar's heavy-duty section owns the
 * corridor-page argument and is linked, not repeated.
 *
 * Sourcing: every program figure on this page — response windows, equipment
 * minimums, incentive amounts — was read from the program's own specification
 * or handbook on the date in `checkedAt`. Where a program page could not be
 * read (FDOT's RISC page returned 403), the page says what the readable
 * first-party summary says and no more; the gap is in CONTENT_GAPS. No rate a
 * carrier or insurer pays for recovery appears anywhere here, because no
 * primary source publishes one.
 */

import type { TowingJobsChild } from './index';
import type { SourceRef } from '../towing';

const FHWA_TIM: SourceRef = {
  label: 'Federal Highway Administration - Traffic Incident Management',
  url: 'https://ops.fhwa.dot.gov/tim/',
  supports:
    'The definition of Traffic Incident Management as "a planned and coordinated multi-disciplinary process to detect, respond to, and clear traffic incidents so that traffic flow may be restored as safely and quickly as possible", and its stated effects on incident duration, responder safety and secondary crashes.',
  checkedAt: '2026-09-17',
};

const GA_TRIP_PAGE: SourceRef = {
  label: 'Georgia TIME Task Force / GDOT - Towing and Recovery Incentive Program (TRIP)',
  url: 'https://timetaskforce.com/time-initiatives/trip/',
  supports:
    'That TRIP is a GDOT program, running since 2008, that pays performance incentives to TRIP-certified towing and recovery companies for clearing large commercial-vehicle incidents within established clearance goals, and that zone availability and application periods are posted on this site.',
  checkedAt: '2026-09-17',
};

const GA_TRIP_SPECS: SourceRef = {
  label: 'GDOT - Georgia TRIP Specifications (updated May 14, 2025)',
  url: 'https://timetaskforce.com/wp-content/uploads/2025/09/GDOT-TRIP-Specifications-5-14-25.pdf',
  supports:
    'Company requirements (at least three years in heavy-duty towing and recovery, approved on the Georgia Department of Public Safety wrecker rotation list, insurance evidence); staff requirements (a certified supervisor plus at least two certified operators, CDLs, and the training list including 16-hour hands-on TRIP Level I, hazardous-materials awareness, NIMS 700 and the National TIM Responder Training); response windows (supervisor within 30 or 45 minutes, two certified heavy-duty recovery wreckers and a support truck within 45 or 60 minutes depending on time of day); equipment minimums (one 50-ton recovery truck, or one 40-ton rotator plus one 30-ton heavy-duty wrecker); the incentive amounts of $1,200 for mobilization, $4,000 for a full activation cleared within 90 minutes of the notice to proceed, and $1,800 for a stall activation; and that companies bill vehicle owners or insurers exclusively, with repeated billing complaints grounds for removal.',
  checkedAt: '2026-09-17',
};

const WA_MIT_HANDBOOK: SourceRef = {
  label: 'WSDOT / Washington State Patrol - Major Incident Tow (MIT) Program Handbook, biennium 2025-2027',
  url: 'https://wsdot.wa.gov/sites/default/files/2024-09/WSDOT-MIT-Handbook-with-Attachments.pdf',
  supports:
    'The joint WSDOT/WSP 90-minute clearance goal; that MIT-authorised registered tow truck operators must hold a WSP letter of appointment; the response requirement of being en route with two heavy-recovery wreckers within 15 minutes in business hours and 30 minutes after hours; the equipment requirement of two Class C wreckers or one Class C and an S1; the $2,500 emergency response and mobilization fee when all travel lanes are reopened within 90 minutes of the notice to proceed, and the $600 cancellation fee when recovery is stood down; the incident file of activation form, invoice, chronology and five digital photographs; and that recovery charges are billed to the vehicle owner or insurer only, with sustained overcharging grounds for removal from the rotation.',
  checkedAt: '2026-09-17',
};

const FL_RISC: SourceRef = {
  label: "Florida's Turnpike (FDOT) - Rapid Incident Scene Clearance (RISC)",
  url: 'https://floridasturnpike.com/traveler-resources/safety-and-assistance/risc/',
  supports:
    'That RISC is the Turnpike\'s heavy-duty towing and recovery program, part of Florida\'s Traffic Incident Management Enhancement effort, that it pays monetary bonuses to qualified participating tow companies for meeting pre-determined quick-clearance goals in support of the Open Roads Policy goal of clearing large-vehicle crashes in 90 minutes or less, and that the Turnpike\'s traffic management center is the official timekeeper. Bonus amounts and equipment requirements are not stated on this page and are not claimed here.',
  checkedAt: '2026-09-17',
};

export const heavyDutyAccounts: TowingJobsChild = {
  slug: 'heavy-duty-towing-accounts',
  h1: 'How to Get Heavy-Duty Towing Accounts',
  title: 'How to Get Heavy-Duty Towing Accounts | OptimizeIndex',
  description:
    "Who buys heavy recovery, why equipment is the entry ticket, and how Georgia's TRIP, Florida's RISC and Washington's MIT certify and pay operators.",
  lede:
    'Heavy-duty towing accounts are won by being qualified before the incident: the motor carrier, the insurer and the state quick-clearance program each decide who they will call while nothing is wrong, and the decision turns on equipment class, trained people, response you can prove and an invoice that survives an adjuster. Almost none of it is a search problem, and the part that is comes last.',

  sections: [
    {
      id: 'who-buys',
      question: 'Who actually buys heavy-duty towing and recovery?',
      answer:
        'Four buyers, with different questions. Motor carriers and their dispatch want a truck moving again. Insurers and their adjusters pay the invoice and decide whether you are called next time. State transportation departments run quick-clearance programs that pay certified operators for opening lanes fast. And other towing companies hire you when a scene is beyond their roster.',
      detail: [
        '**Motor carriers** are the account most operators picture: a fleet running your corridor whose dispatch calls you when a tractor drops a driveshaft or a trailer goes over. The fleet manager cares about downtime, load protection and not being surprised by the bill. Owner-operators behave differently: the call often comes through their insurer or a breakdown service rather than from them.',
        '**Insurers and adjusters** are the buyer operators most underestimate. On a crash recovery the carrier\'s insurer usually pays, an adjuster reviews every line, and adjusters talk to each other. An operator whose invoices are clean and documented becomes one an adjuster is comfortable seeing; one whose invoices get challenged is quietly steered away from, whatever the fleet thinks.',
        '**State DOT quick-clearance programs** are the buyer that publishes its requirements. Georgia\'s TRIP, Florida\'s RISC and Washington\'s Major Incident Tow program each pay certified heavy-recovery companies an incentive for clearing a commercial-vehicle incident within a set time, and each sets out in writing what a company needs in order to be on the list. They are covered in detail below.',
        '**Other operators** matter more in heavy work than anywhere else. A rotator is expensive to own and most scenes do not need one, so mutual aid, subcontracting and second-truck arrangements are how much of this work actually moves. Georgia\'s program formally allows approved mutual-aid agreements between certified companies; informally, the same thing happens in every market.',
        'Police and state-patrol heavy rotation lists are a fifth source, and they are the route into several of the programs above, but rotation is its own subject and is covered on the towing jobs overview and the state pages rather than here.',
      ],
    },
    {
      id: 'entry-ticket',
      question: 'Why is equipment class the entry ticket rather than the pitch?',
      answer:
        'Because every serious buyer checks the roster before anything else, and the state programs publish the minimum in numbers. Georgia\'s TRIP requires either a 50-ton recovery truck or a 40-ton rotator together with a 30-ton heavy-duty wrecker. Washington\'s MIT requires two Class C wreckers, or one Class C and an S1. Below the minimum there is no conversation to have.',
      detail: [
        'The specifications go further than tonnage. Georgia\'s lists boom structural ratings, winch counts, wire-rope lengths and boom reach and working height for each truck class, plus a support truck with its own required tools and traffic-control equipment. A fleet manager or adjuster will not quote those numbers back to you, but they are the same things they are judging when they ask what you would bring to a loaded rollover on a bridge.',
        'People are the second half of the ticket. Georgia requires a certified supervisor and at least two certified operators on scene, all holding commercial licences, and a training list that includes a 16-hour hands-on recovery course, hazardous-materials awareness, NIMS 700 and the National Traffic Incident Management Responder Training. Washington requires the training and experience documentation to be on file with the State Patrol before an operator can respond. Buyers outside the programs increasingly ask for the same certificates, because the programs have taught them to.',
        'Response you can prove is the third. Georgia\'s program will not accept an answering service, pager or voicemail on the contact line; it wants a live company representative on a direct number around the clock. Whether or not you ever join a program, that is the standard a dispatcher at 3am is measuring you against.',
        'None of this is marketing. It is the price of being considered, and the operator who treats the roster and the training file as sales collateral, kept current and ready to send, is already ahead of most of the market.',
      ],
    },
    {
      id: 'dot-programs',
      question: 'How do state quick-clearance programs work, and what do they pay for?',
      answer:
        'They pay a certified heavy-recovery company an incentive for arriving with specified equipment inside a response window and reopening every travel lane inside a clearance window, usually 90 minutes from the notice to proceed. The vehicle owner or insurer still pays for the recovery itself. The programs exist because the Federal Highway Administration and every state DOT measure the cost of a blocked interstate in secondary crashes and lost hours.',
      detail: [
        'The framework behind all of them is Traffic Incident Management, which the Federal Highway Administration defines as "a planned and coordinated multi-disciplinary process to detect, respond to, and clear traffic incidents so that traffic flow may be restored as safely and quickly as possible." Heavy recovery is the slowest part of that process, so it is the part the states decided to pay for.',
        '**Georgia\'s TRIP**, run by GDOT with the TIME Task Force since 2008, assigns certified companies to recovery zones. Its May 2025 specifications require a company to have been in heavy-duty towing and recovery for at least three years and to be an approved tower on the Department of Public Safety\'s wrecker rotation list. On activation, a certified supervisor must respond within 30 minutes in weekday daytime hours and 45 minutes otherwise, and two certified heavy-duty recovery wreckers plus a support truck must arrive within 45 or 60 minutes on the same split. A full activation that reopens all travel lanes within 90 minutes of the notice to proceed pays a $4,000 incentive; a mobilization that is stood down pays $1,200; a stall activation with a 40-ton rotator or larger pays $1,800. The company bills the vehicle owner or insurer for the recovery itself, never GDOT, and repeated billing complaints are grounds for removal. Zones open for application on the TIME Task Force website.',
        '**Washington\'s Major Incident Tow program**, run jointly by WSDOT and the State Patrol against a 90-minute clearance goal the two agencies set in 2002, works from a State Patrol letter of appointment. The MIT-authorised operator must be en route with two heavy-recovery wreckers within 15 minutes in business hours and 30 minutes after hours. Reopening all lanes within 90 minutes of the notice to proceed earns a $2,500 emergency response and mobilization fee; a stand-down after a compliant mobilization earns a $600 cancellation fee; miss the 90 minutes without a documented hold and the fee is forfeited. Payment requires an incident file of the activation form, an invoice, a chronology and five digital photographs. The recovery charge goes to the vehicle owner or insurer only, and a sustained overcharging allegation removes the operator from the rotation.',
        '**Florida\'s RISC** is the Turnpike\'s heavy-duty towing and recovery program within Florida\'s Traffic Incident Management Enhancement effort. The Turnpike describes it as paying monetary bonuses to qualified participating tow companies for meeting pre-determined quick-clearance goals, in support of the Open Roads Policy goal of clearing large-vehicle crashes in 90 minutes or less, with its traffic management center as the official timekeeper. The bonus amounts and equipment requirements are set out in contract documents we could not read from FDOT\'s own site when this page was last reviewed, so they are not stated here.',
        'Pennsylvania, Indiana, Michigan and California are not summarised because we could not confirm a comparable published program from a primary source on the review date; the California page covers the CHP rotation program, which is a different thing. If your state runs one, its specification will look like Georgia\'s or Washington\'s, and reading it is the single most useful hour you can spend on this channel.',
      ],
    },
    {
      id: 'what-buyers-check',
      question: 'What does a fleet manager or an adjuster check before there is an incident?',
      answer:
        'The same things the programs write down, minus the incentive: what you can lift and reach, which corridors you cover and how fast, whether a person answers, what your people are certified in, how your invoices read, and who else has used you. They are qualifying a vendor for an emergency they hope never happens, which is why the conversation is calm and the standard is high.',
      detail: [
        '**Roster and capacity, in writing.** A one-page equipment sheet with each truck\'s class, rated capacity, boom and winch specification and what it is suited for. If you rely on a partner for the rotator, say so and name them; buyers would rather know than discover it at the scene.',
        '**Corridor coverage and honest response.** Which interstates and which exits, from which yard, at what time of day. A response estimate a dispatcher can believe is worth more than a fast one they cannot, because the first time it is wrong they will remember.',
        '**A live answer.** Fleet dispatch and adjusters both work through the night. If your after-hours line rolls to voicemail, the account will go to the operator whose line does not, whatever your equipment.',
        '**People and certificates.** Commercial licences, recovery training, hazardous-materials awareness, traffic incident management. Keep copies ready; the request will come from a safety manager or a claims desk, and answering it the same day is itself a signal.',
        '**Scene competence.** Load protection, cargo handling, spill awareness, working under unified command with fire and police. An adjuster who has seen a load destroyed by a careless recovery asks about this directly.',
        '**Invoicing and documentation**, which gets its own section below because it is where heavy accounts are actually kept or lost.',
        'The general mechanics of landing an account, from who signs to certificates of insurance and billing terms, are the same as for any commercial account and are covered on that page rather than here.',
      ],
      callCta: 'Talk about how heavy work fits your board',
    },
    {
      id: 'the-invoice',
      question: 'Why does the invoice decide whether the account renews?',
      answer:
        'Because a heavy recovery invoice is large, itemised and reviewed by someone whose job is to challenge it. An adjuster who can match every line to a photograph, a time and a piece of equipment approves it and remembers you; one who cannot disputes it, and the dispute becomes the fleet\'s memory of the job. The programs know this, which is why they specify the paperwork.',
      detail: [
        'Look at what the programs require in order to be paid. Washington wants an activation form, an original invoice identifying the date, time and location, a written chronology of the incident and five digital photographs of the recovery, submitted within days. Georgia requires its own approved invoice format, retains the right to review incident details before paying, and treats multiple billing complaints as grounds for removal. Both direct the company to bill the vehicle owner or insurer, and both treat overcharging as the offence that ends participation.',
        'That is the standard the private market has learned to expect. An invoice for heavy recovery should read as a record of the job: each truck and its hours, each piece of ancillary equipment and why it was needed, labour by role, cargo handling, clean-up, storage, with the chronology and the photographs alongside. The adjuster is not your adversary; they are the person deciding whether the next call comes to you, and clear paperwork makes their decision easy.',
        'The reputational side is specific to heavy work. Consumer towing gets one-star reviews from motorists; heavy recovery gets its reputation among a small number of adjusters and fleet safety managers who compare notes. There is no review platform for it and no way to reply. The only response available is an invoice that never needs defending.',
        'None of this requires a system more elaborate than a camera, a clock and a template used the same way every time. It does require doing it at 3am on a bridge, which is why the operators who do are the ones who hold the accounts.',
      ],
    },
    {
      id: 'how-to-approach',
      question: 'How do you approach carriers, adjusters and the programs?',
      answer:
        'Programs publish an application period and a specification: meet the specification, watch for the period, apply. Carriers are approached through dispatch and safety managers for the fleets that actually run your corridors. Adjusters are not approached so much as earned, one clean file at a time, and then reminded that you exist.',
      detail: [
        '**Programs.** Read the specification before anything else, because most of it is a checklist you either meet or do not. Georgia posts zone availability and application details on the TIME Task Force website and routes questions and mutual-aid requests through a program email; Washington works from a State Patrol letter of appointment. Neither is a relationship sale. The specification is the sale, and the certified roster and training file are the proposal.',
        '**Carriers.** Identify the fleets whose trucks are on your interstates by watching the corridor for a week rather than by buying a list. The person to reach is the dispatch or maintenance manager who feels a breakdown, and the person who signs is usually a safety or operations manager one level up. Bring the equipment sheet and the corridor map, ask what happened the last time they needed heavy recovery on your stretch, and listen.',
        '**Insurers.** There is rarely a door to knock on. Adjusters remember operators from files, so the first clean job for a carrier they insure is the introduction. Afterwards, a short note with the equipment sheet to the claims contact you dealt with is reasonable and rare; most operators never send one.',
        '**Other operators.** The rotator owner two counties over is a buyer, a supplier and a competitor at once. Formal mutual-aid arrangements, where a program allows them, and informal second-truck agreements are how most operators enter heavy work before the roster justifies the full investment.',
      ],
    },
    {
      id: 'search-and-us',
      question: 'Where does search fit, and what does OptimizeIndex do here?',
      answer:
        'Search matters at the moment a dispatcher who does not already have a name for your corridor types one, and when a fleet manager checks you out before signing. We work on that: whether an operator with the equipment is findable and credible for the routes it covers. We do not place operators on program lists, decide DOT applications, broker accounts or sell heavy work as leads.',
      detail: [
        'The dispatcher\'s search is real and specific: a corridor, an exit or a city, and the words heavy duty or rotator. Pages that state what you can lift, which interstates you cover from which yard and how to reach a person, organised by route rather than by town, are what match it. The pillar covers how those pages are built and why fleet buyers think in corridors, and we will not repeat it here.',
        'The fleet manager\'s check is a search for your business name. What comes back should agree with the equipment sheet you handed them: the same trucks, the same coverage, the same phone number, and reviews from the consumer side of the business that do not contradict the professionalism you are selling to the fleet.',
        'What we cannot do is qualify you. No agency can put a rotator on your yard, get your people certified, or decide whether GDOT or the State Patrol adds you to a list, and none can promise that a carrier will call. Lead generation is something we are building and not something we sell today. If a broker or a program application consultant is what you need, we would rather say so than sell you something next to it.',
      ],
    },
  ],

  sources: [FHWA_TIM, GA_TRIP_PAGE, GA_TRIP_SPECS, WA_MIT_HANDBOOK, FL_RISC],

  faqs: [
    {
      question: 'What equipment do you need to get heavy-duty towing accounts?',
      answer:
        'The state programs publish the floor. Georgia\'s TRIP requires either a 50-ton recovery truck or a 40-ton rotator together with a 30-ton heavy-duty wrecker, plus a support truck with specified tools and traffic-control equipment. Washington\'s MIT requires two Class C wreckers or one Class C and an S1. Private buyers rarely quote numbers, but they are judging the same roster.',
    },
    {
      question: 'What is TRIP in Georgia, and how do you get on it?',
      answer:
        'GDOT\'s Towing and Recovery Incentive Program pays certified heavy-recovery companies for clearing large commercial-vehicle incidents inside its time goals: $4,000 for a full activation cleared within 90 minutes of the notice to proceed under the May 2025 specifications. A company needs at least three years in heavy-duty recovery, a place on the Department of Public Safety rotation list, the specified trucks and trained staff, and a successful application when a recovery zone opens, which is announced on the TIME Task Force website.',
    },
    {
      question: 'Who pays for a heavy-duty recovery on a state quick-clearance program?',
      answer:
        'The vehicle owner or their insurer pays for the recovery itself; the state pays only the incentive for meeting the clearance goal. Georgia\'s and Washington\'s documents both say so explicitly, and both treat overcharging the vehicle owner as grounds for removal from the program.',
    },
    {
      question: 'Do you need TIM training for heavy-duty accounts?',
      answer:
        'For the state programs, yes: Georgia lists the National Traffic Incident Management Responder Training among its required courses, alongside hands-on recovery training, hazardous-materials awareness and NIMS 700, and Washington requires training and experience documentation to be on file with the State Patrol. Carriers and adjusters increasingly ask for the same certificates because the programs have set the expectation.',
    },
    {
      question: 'How is winning heavy-duty accounts different from winning commercial towing accounts?',
      answer:
        'The buyers are more specialised and the entry requirements are written down. A light-duty commercial account can be won on responsiveness and price; a heavy account starts with equipment class and certified people, is judged largely by adjusters on the quality of the invoice, and in several states runs through a DOT program with a published specification. The general sales mechanics are the same and are covered on the commercial accounts page.',
    },
    {
      question: 'Can OptimizeIndex get us onto TRIP, RISC or MIT, or find us fleet accounts?',
      answer:
        'No. We do not place operators on program lists, prepare or influence DOT applications, broker accounts or sell heavy work as leads. We work on whether an operator that already has the equipment is findable and credible for the corridors it covers, and no agency can promise that a program or a carrier will choose you.',
    },
  ],
};
