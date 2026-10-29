import type { CompetitionKey } from "./competitions";
import type { NormalisedFixture } from "./types";

export interface ListOptions {
  /** Limit the call to these competitions (saves quota). Defaults to all with a configured league ID. */
  only?: CompetitionKey[];
}

export interface ListResult {
  fixtures: NormalisedFixture[];
  /** Provider calls made. The free plans have a daily quota, so this is logged on every run. */
  calls: number;
  /** Competitions skipped, with the reason (for example no league ID configured). */
  skipped: { key: CompetitionKey; reason: string }[];
}

export interface SportsProvider {
  readonly name: string;
  /** Fixtures with kick-off between from and to (inclusive), one call per competition. */
  listFixtures(from: Date, to: Date, opts?: ListOptions): Promise<ListResult>;
  /** The same window, keeping only fixtures that have started, so scores and final statuses can be applied. */
  listResults(from: Date, to: Date, opts?: ListOptions): Promise<ListResult>;
}
