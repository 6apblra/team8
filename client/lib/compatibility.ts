/**
 * Calculates a compatibility score (0–100) between the current user and a candidate.
 *
 * Weights:
 *   - Common games   : 40 pts  (shared / max of both arrays)
 *   - Same region    : 20 pts  (exact match)
 *   - Common languages: 20 pts (shared / max)
 *   - Schedule days  : 20 pts  (shared day-of-week slots / 7)
 */

interface GameEntry {
  gameId: string;
  playstyle?: string | null;
}

interface AvailDay {
  dayOfWeek: number;
}

interface MyProfile {
  region: string;
  languages?: string[];
}

interface CandidateData {
  region: string;
  languages?: string[];
  userGames: GameEntry[];
  availability: AvailDay[];
}

export function calcCompatibility(
  myProfile: MyProfile,
  myGames: GameEntry[],
  myAvailability: AvailDay[],
  candidate: CandidateData,
): number {
  // ── Games (40 pts) ───────────────────────────────────────────────────────
  const myGameIds  = new Set(myGames.map((g) => g.gameId));
  const candGameIds = new Set(candidate.userGames.map((g) => g.gameId));
  const sharedGames = [...myGameIds].filter((id) => candGameIds.has(id)).length;
  const maxGames = Math.max(myGameIds.size, candGameIds.size, 1);
  const gamesScore = (sharedGames / maxGames) * 40;

  // ── Region (20 pts) ──────────────────────────────────────────────────────
  const regionScore = myProfile.region === candidate.region ? 20 : 0;

  // ── Languages (20 pts) ───────────────────────────────────────────────────
  const myLangs   = new Set(myProfile.languages ?? []);
  const candLangs = new Set(candidate.languages ?? []);
  const sharedLangs = [...myLangs].filter((l) => candLangs.has(l)).length;
  const maxLangs = Math.max(myLangs.size, candLangs.size, 1);
  const langScore = (sharedLangs / maxLangs) * 20;

  // ── Schedule overlap (20 pts) ────────────────────────────────────────────
  const myDays   = new Set(myAvailability.map((a) => a.dayOfWeek));
  const candDays = new Set(candidate.availability.map((a) => a.dayOfWeek));
  const sharedDays = [...myDays].filter((d) => candDays.has(d)).length;
  // Normalise against 7 days; if neither has schedule data, treat as neutral (10 pts)
  const schedScore =
    myDays.size === 0 && candDays.size === 0
      ? 10
      : (sharedDays / 7) * 20;

  return Math.round(gamesScore + regionScore + langScore + schedScore);
}

/** Returns a colour string for the badge based on score. */
export function compatibilityColor(score: number): string {
  if (score >= 70) return "#00FF88"; // green
  if (score >= 40) return "#FFB800"; // amber
  return "#A0A8B8";                  // grey
}
