import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.jsx'
import './index.css'

// Sensible, cost-conscious defaults for the Supabase free plan: no blanket
// polling (every query used to refetch every 5s regardless of whether the
// data ever changes), a real staleTime so repeat navigations reuse cached
// data instead of re-hitting Supabase, and a longer gcTime so switching
// tabs/pages doesn't immediately evict what was just fetched. Individual
// queries that genuinely need fresher data (e.g. notifications) set their
// own shorter staleTime/refetchInterval at the call site.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,          // Data considered fresh for 1 minute
      gcTime: 10 * 60_000,        // Cache kept in memory for 10 minutes
      refetchInterval: false,     // No global background polling
      refetchOnWindowFocus: true, // Refetch when user tabs back (cheap, only if stale)
      retry: 1,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
)
