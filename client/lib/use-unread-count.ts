import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";

interface MatchData {
  unreadCount: number;
}

/**
 * Returns the total number of unread messages across all matches.
 * Reads from the shared matches query cache — no extra network request.
 */
export function useUnreadCount(): number {
  const { user } = useAuth();

  const { data: matches = [] } = useQuery<MatchData[]>({
    queryKey: ["/api/matches", user?.id],
    enabled: !!user?.id,
    // No queryFn override — reuses the global default (same cache as MatchesScreen)
  });

  return matches.reduce((sum, m) => sum + (m.unreadCount ?? 0), 0);
}
