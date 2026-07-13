// Named React Query cache presets. Pick the preset that matches how often the
// underlying data actually changes, instead of polling everything on a fixed
// interval — the app runs on Supabase's free tier, so unnecessary refetches
// have a real quota cost.
export const CACHE_TIMES = {
  // Notifications benefit from feeling close to live (visit reminders, farmer
  // registration alerts) — short stale window, no server-defined interval.
  REALTIME: { staleTime: 15_000, gcTime: 2 * 60_000 },
  // Dashboards / lists that change with normal day-to-day activity.
  SHORT: { staleTime: 60_000, gcTime: 5 * 60_000 },
  // Data a user edits themselves and rarely changes elsewhere mid-session.
  MEDIUM: { staleTime: 2 * 60_000, gcTime: 10 * 60_000 },
  // Reference/catalog data set manually by admins — market rates, seed
  // catalog, warehouse capacity, reports. Changes infrequently.
  LONG: { staleTime: 5 * 60_000, gcTime: 15 * 60_000 },
};

export default CACHE_TIMES;
