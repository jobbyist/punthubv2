-- Support inbox alerts are sent once per event. The unique index lets the database settle a race between two
-- requests with the same dedupe key (the loser gets 23505 and skips the email). Regular form rows have no key.
create unique index if not exists form_submissions_dedupe_idx
  on public.form_submissions ((meta ->> 'dedupe'))
  where meta ? 'dedupe';
