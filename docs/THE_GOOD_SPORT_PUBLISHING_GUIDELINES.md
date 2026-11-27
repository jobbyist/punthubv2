# The Good Sport — Podcast Publishing Guidelines

**Owner:** Puntr Editorial / Podcast Producer  
**Series:** The Good Sport  
**Debut season premiere:** 5 January 2027  
**Status:** Mandatory production and publication standard

## 1. Editorial promise

The Good Sport is Puntr's audiovisual sports podcast: sharp, curious and entertaining conversations about sport, matchday culture, data, fandom and the people behind the game. The tone is confident and witty, never needlessly hostile. Challenge ideas, not private individuals. Do not present betting as a guaranteed route to income or imply that outcomes can be predicted with certainty.

Every episode must have a clear editorial question, a defined audience benefit and a reason to exist beyond promoting Puntr. Commercial or affiliate relationships must be disclosed clearly and verbally where relevant, as well as in the episode description.

## 2. Required deliverables — no exceptions

An episode is not publish-ready until all of the following are complete and approved:

1. Final master audio (lossless archive master plus a compressed distribution file) and final video/extended cut where applicable.
2. Full, verbatim written transcript, proofread against the final master. Do not publish an AI summary in place of a transcript. Identify speakers consistently; mark unintelligible audio honestly rather than guessing.
3. SEO-optimised episode page copy: unique title, concise meta description, descriptive H1/H2 headings, natural target phrases, internal links and a short excerpt. No keyword stuffing or unsupported claims.
4. Chapter timestamps for every meaningful segment. Timestamps must be checked against the final published audio/video, use the correct player time base and link to the relevant point where the platform supports chapters.
5. Five to eight key takeaways, written as concise, useful and independently understandable points. Each takeaway must be supported by the episode.
6. Episode summary, host/guest names and approved biographies, topic tags, publication date, content notes and all required credits/disclosures.
7. Cover artwork, episode thumbnail, accessible alt text and social crops. Use the approved series identity and confirm image rights.
8. Captions/subtitles for video, checked for timing, names, teams, competitions and terminology.
9. A final QA sign-off recorded by the producer and a second reviewer who did not perform the primary edit.

## 3. Production and technical QA

- Record clean isolated tracks where possible. Check for clipping, distortion, dropouts, sync drift, room noise and inconsistent loudness.
- Listen to the complete exported master from beginning to end. Spot checks are not sufficient.
- Verify the opening, closing, ad/disclosure reads, music cues and transitions. All music, footage, photographs, logos and third-party clips must be licensed, cleared or otherwise approved for the intended use.
- Confirm the audio file opens, seeks, resumes and plays on current desktop and mobile browsers. Check video on mobile and desktop, with captions enabled.
- Remove accidental private information, unreleased results, embargoed material and off-record remarks.
- Verify every name, score, statistic, quote, date, competition and factual claim against a reliable source. Correct errors before publication; add a correction note if a material error is discovered later.
- Keep the source recording, edit project, final masters, transcript, artwork and sign-off record in the episode archive.

## 4. Transcript and SEO standard

The transcript must represent the complete final episode, not a condensed rewrite. Preserve speaker meaning and conversational character while correcting obvious transcription punctuation and formatting. Do not silently alter a speaker's meaning. Use speaker labels, paragraph breaks and descriptive section headings. Add timestamps at chapter boundaries and useful search-intent moments.

Each episode page must include:

- One unique, descriptive page title and H1.
- A concise meta description that accurately describes the episode.
- A 100–200 word episode introduction written for humans first.
- The full transcript with meaningful H2/H3 structure.
- A timestamped chapter list and five to eight key takeaways.
- Relevant internal links to Puntr explainers, match/competition pages or related episodes where appropriate.
- Descriptive image alt text and accessible player labels.
- Structured data only when all required fields are accurate and supported. Never fabricate duration, guest, rating or publication metadata.

## 5. Responsible sport, legal and brand safeguards

- Include the appropriate responsible-gambling message whenever betting, bookmakers, odds or wagering are discussed. Follow Puntr's approved responsible-play language and applicable South African requirements.
- Do not target minors, glamorise chasing losses or frame betting as a solution to financial difficulty.
- Distinguish opinion, analysis, verified fact, prediction and sponsored content. Predictions must never be described as certain.
- Do not disclose confidential partner information or imply bookmaker endorsement without written approval.
- Obtain documented consent/releases from hosts, guests and contributors. Confirm permission for name, image, voice and promotional reuse.
- Escalate legal, medical, allegations, sensitive personal claims and contentious gambling topics for editorial/legal review before recording or release.

## 6. Publishing workflow and release gate

**T-7 days:** Lock the edit, fact-check, guest approvals, rights and episode metadata.  
**T-5 days:** Complete transcript, SEO page, chapter timestamps, takeaways, captions and artwork.  
**T-3 days:** Second reviewer completes full-master listen and transcript-to-audio audit. Fix and re-export defects.  
**T-1 day:** Stage the page and media; test playback, mobile layout, metadata, links, captions, consent/disclosure copy and notification signup.  
**Release day:** Publish audio/video and episode page together. Verify the live page and player from a signed-out mobile browser and desktop browser. Send only to the consented notification audience.  
**Within 24 hours:** Review analytics, broken links, listener feedback and correction requests.

The producer must block publication if any mandatory deliverable is missing, the transcript does not match the master, timestamps are inaccurate, rights are unclear, or a factual/responsible-play concern remains unresolved. Schedule pressure never overrides this gate.

## 7. Episode page template

- Episode title and season/episode number
- One-paragraph editorial hook
- Embedded audio player and extended-video link
- Host and guest credits
- Episode summary
- Chapter timestamps
- Five to eight key takeaways
- Full SEO-optimised transcript
- Sources and further reading, where relevant
- Commercial/affiliate disclosures and responsible-play notice, where relevant
- Publication date and correction history

## 8. Launch asset checklist

Before the 5 January 2027 premiere, replace the temporary cover-art treatment with approved master artwork, configure `VITE_GOOD_SPORT_COVER_ART_URL`, upload the final audio and configure `VITE_GOOD_SPORT_EPISODE_01_AUDIO_URL`, and set `VITE_PUNTR_YOUTUBE_URL` to the verified official channel URL. Apply the premiere notification table and cron migration in production, confirm `CRON_SECRET` and `RESEND_API_KEY` are configured, and verify the scheduled 09:00 SAST release notification job before collecting live opt-ins. The cron job sends one email to each consented address and retains delivery records for no more than 30 days.

**Release standard:** If it cannot be verified, it does not go live.
