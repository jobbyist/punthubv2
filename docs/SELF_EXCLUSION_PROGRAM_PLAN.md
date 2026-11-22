# Puntr Self-Exclusion & Education Programme

**Status:** Programme design and stakeholder engagement phase; public holding page implemented in this PR  
**Public route:** `/exclusions`  
**Owner:** Gravitas Industries (Pty) Ltd, operator of Puntr  
**Positioning:** Independent education, navigation and referral programme — not a bookmaker, regulator, statutory exclusion register or counselling provider.

## 1. Executive recommendation

Build this as a **partner-led navigation and education programme**, not as a new national self-exclusion register.

Puntr should make the official process easier to understand, help people identify the correct operator or Provincial Licensing Authority, and connect them to free specialist counselling. A statutory exclusion request must continue through the prescribed regulatory/operator process. Puntr must not claim that a website form, account flag or request to Puntr creates a legally effective exclusion.

The National Gambling Board (NGB) describes a process in which a person requests exclusion through their gambling operator; the operator supplies the relevant forms to the Provincial Licensing Authority and NGB for record-keeping. The NGB also directs people to the South African Responsible Gambling Foundation (SARGF) for counselling. The NGB's current guidance describes a six-month exclusion period and says upliftment is only considered after the required counselling and proof. The exact process and applicable form must be checked against the current NGB and provincial rules before any workflow is automated.

**Current implementation:** a public /exclusions holding page now says “We’re working on it…” and links to official support/regulatory channels. It has no application form, account intake, document upload or backend exclusion record. **Recommended first milestone:** establish formal working relationships with the NGB, SARGF and selected Provincial Licensing Authorities, then pilot a referral and assisted-navigation service. Do not store identity documents or submit statutory forms until written authority, a lawful processing basis, data-sharing agreements and legal review are in place.

## 2. Legal and operating boundary

### What Puntr can do now

- Publish plain-language, accessible education about self-exclusion and gambling harm.
- Explain that formal exclusion is requested through the relevant licensed operator or Provincial Licensing Authority.
- Provide verified links and contact details for the NGB, Provincial Licensing Authorities and SARGF.
- Offer a warm referral to counselling, with the user's explicit direction and without collecting unnecessary sensitive information.
- Help users prepare questions and understand the official steps, without giving legal or clinical advice.
- Suppress Puntr's own gambling-related promotional and affiliate messaging for members who voluntarily activate a future support/break setting.

### What Puntr must not claim or do without written authority

- Claim to register a person on the national register of excluded persons.
- Promise that a Puntr account closure or preference blocks a person from gambling with licensed operators.
- Receive, certify, amend, submit or revoke statutory exclusion forms on behalf of a person.
- Decide whether an exclusion request is legally valid or whether an exclusion can be lifted.
- Represent Puntr as a regulator, bookmaker, treatment provider or official SARGF/NGB partner.
- Display regulator or partner logos, endorsements or seals without written permission.

The National Gambling Act and regulations, the prescribed NGB form, provincial rules and the legal status of any delegated submission service must be reviewed by South African gambling counsel before a statutory application workflow is built.

## 3. User journey

### A. Immediate support

1. The visitor lands on `/exclusions` from the footer, responsible-gambling notices, account settings or support pages.
2. The page prominently offers the SARGF 24-hour counselling line: **0800 006 008** and its WhatsApp channel **076 675 0710**.
3. The page links to official NGB and provincial self-exclusion guidance.
4. The visitor can leave Puntr for the official channel without creating an account or submitting personal information.

### B. Formal self-exclusion

1. The user identifies the bookmaker(s) or gambling venue(s) with which they hold accounts or participate.
2. Puntr directs them to the operator's security/responsible-gambling team or the relevant Provincial Licensing Authority.
3. The operator/regulator explains the current prescribed form, identity checks, scope, duration and submission method.
4. The operator/regulator handles the statutory request and any required submission to the relevant authorities.
5. The user is referred to SARGF for counselling and support.
6. Puntr may show a neutral checklist or referral status only if the user chooses to store it. It must never imply that the status is the official exclusion record.

### C. Family member or third-party concern

A third party should be directed to the relevant regulator, legal adviser or court process. Puntr must not accept a third-party application or disclose another person's account information. The NGB describes court-based third-party exclusion as a separate route.

### D. Returning after an exclusion period

Puntr must not provide an upliftment or eligibility decision. The user is directed back to the relevant operator/regulator and SARGF. The NGB's current public guidance describes counselling and proof of attendance as part of the upliftment process and says the six-month minimum applies; counsel must confirm the current national and provincial rules before copy is finalised.

## 4. Programme workstreams

| Workstream | Initial deliverable | Accountable party |
|---|---|---|
| Regulatory engagement | Concept note, scope statement and request for process guidance | Gravitas / Puntr |
| Counselling partnership | Referral protocol, escalation contacts and approved public wording | SARGF + Puntr |
| Operator pathways | Verified operator contact directory and standard referral templates | Operators + Provincial Licensing Authorities |
| Education | Self-exclusion explainer, warning signs, family guidance, myths and FAQs | SARGF review + Puntr |
| Digital experience | Public `/exclusions` page, accessible directory, no-form launch phase | Puntr |
| Privacy and security | POPIA impact assessment, data map, retention schedule and incident process | Information Officer + counsel |
| Monitoring | Anonymous usage and referral-completion measures | Puntr + partners |

## 5. Stakeholder engagement sequence

1. **NGB:** request a technical meeting to confirm the current statutory process, prescribed forms, national register workflow, approved terminology, provincial hand-offs and what a non-operator platform may lawfully do.
2. **SARGF / NRGP:** request a referral protocol, current counselling contact channels, approved educational material and guidance on warm referrals.
3. **Provincial Licensing Authorities:** confirm province-specific forms, contacts, submission methods and differences in operator obligations. Start with Gauteng because of the initial South African pilot, then extend to all provinces.
4. **Licensed operators / South African Bookmakers Association:** request a current responsible-gambling contact for each operator, the exact self-exclusion application path, and confirmation of how the operator removes marketing/loyalty communications and handles accounts during an exclusion.
5. **Legal and privacy review:** obtain a written opinion on statutory authority, POPIA roles, cross-operator data sharing, electronic signatures, identity verification, retention, and the boundaries of referral assistance.

Approach these organisations for guidance and collaboration, not for assumed endorsement. Any endorsement, co-branding, data-sharing or logo use requires explicit written permission.

## 6. Privacy and safeguarding architecture

**Launch phase — no application intake.** The current landing page must not collect names, ID numbers, identity documents, photographs, health information, bookmaker account details or reasons for exclusion.

If a partner-approved digital workflow is later authorised:

- Complete a POPIA impact assessment and identify the responsible party/operator for each processing purpose.
- Prefer direct collection by the licensed operator or regulator. Puntr should not become a central repository of statutory identity documents.
- Collect only fields explicitly required by the prescribed process and the approved referral protocol.
- Separate referral/contact records from ordinary Puntr profiles, picks, wallet, affiliate and analytics data.
- Use a dedicated restricted schema/storage boundary, encryption, least-privilege staff access, audit trails, access logging and a documented deletion/retention schedule.
- Never send identity, health, counselling, exclusion or account data to Parallel, Gemini, analytics, marketing, affiliate partners or general support inboxes.
- Do not use exclusion information for ranking, advertising, bookmaker recommendations, promotions or user profiling.
- Provide a clear privacy notice, data-subject request process, breach-response process and named Information Officer before intake begins.
- Do not use a checkbox or account preference as a substitute for the statutory application or the operator/regulator's verification process.

A future Puntr voluntary break setting may suppress Puntr notifications, bookmaker promotions and affiliate content. It must be labelled as a **Puntr-only product setting**, not a legal self-exclusion order.

## 7. Education content roadmap

- What self-exclusion is — and what it is not.
- How the South African operator / Provincial Licensing Authority / NGB process works.
- How to contact SARGF for free, confidential support.
- What family members can do and where third-party applications belong.
- What to expect during the exclusion period.
- How counselling and any later upliftment request are handled by the relevant authorities.
- Blocking tools, bank/payment controls and practical ways to reduce access to gambling.
- How to recognise gambling harm and how to ask for help without stigma.

All clinical, legal and regulatory content must be reviewed by the appropriate partner or qualified adviser before publication.

## 8. Launch gates

The application workflow must remain disabled until every gate is met:

- [ ] Written NGB guidance confirming the permitted role of Puntr and the correct statutory pathway.
- [ ] SARGF referral protocol and approval of helpline/counselling copy.
- [ ] Provincial Licensing Authority process map and current contact directory.
- [ ] At least one licensed operator's written process confirmation for a pilot.
- [ ] South African legal opinion on the National Gambling Act, current prescribed forms, provincial requirements and any agency/authorisation arrangement.
- [ ] POPIA impact assessment, privacy notice, data-sharing agreements and retention policy.
- [ ] Security review and restricted-access workflow test.
- [ ] Clear distinction between statutory exclusion and Puntr-only break/suppression settings.
- [ ] Partner sign-off on the user-facing journey and escalation process.

## 9. Measures of success

Use aggregated, privacy-preserving measures only:

- visits to the education and support pages;
- clicks to official operator/regulator pathways;
- clicks/calls to SARGF support;
- referral completion feedback where voluntarily provided and approved;
- time taken to update incorrect contact information;
- user comprehension and accessibility feedback.

Do not measure success by betting activity, reactivation, deposits, affiliate conversion or any other gambling revenue metric.

## 10. Immediate actions

1. Keep the public `/exclusions` page as an honest "We're working on it…" holding page with live support links.
2. Send the NGB and SARGF a concise concept note requesting guidance and a working session.
3. Build a verified provincial/operator contact directory with source URLs and review dates.
4. Prepare a one-page partner briefing and a draft referral protocol.
5. Commission a South African gambling-law and POPIA review before any intake or statutory submission feature is built.

## 11. Reference sources

- National Gambling Board — National Responsible Gambling Programme and self-exclusion guidance: https://www.ngb.org.za/stakeholder-information/national-responsible-gambling-programme/
- National Gambling Board — FAQ / exclusion process: https://www.ngb.org.za/faqs/
- National Gambling Board — verified operators directory: https://www.ngb.org.za/verified-operators/
- South African Responsible Gambling Foundation — counselling and support: https://responsiblegambling.org.za/counselling/
- SARGF — contact and 24-hour counselling line: https://responsiblegambling.org.za/conta-us-nrgp/
- Gauteng Gambling Board — self-exclusion: https://www.ggb.org.za/self-exclusion/
- Government Gazette, 10 February 2026 — prescribed NGB Form 1/1: https://www.gov.za/sites/default/files/gcis_document/202602/54106rg11943gon7113.pdf

**Review note:** This is an operational product plan, not legal advice. Public regulator guidance and prescribed forms can change; verify the current version with the NGB, relevant Provincial Licensing Authority and South African counsel before launch.
