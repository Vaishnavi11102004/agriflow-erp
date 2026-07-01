import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.jsx'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,            // Data stays fresh for 5 seconds
      gcTime: 5 * 60_000,         // Cache kept in memory for 5 minutes
      refetchInterval: 5000,      // Auto-refresh every 5 seconds globally
      refetchOnWindowFocus: true, // Silently refetch when user tabs back
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
