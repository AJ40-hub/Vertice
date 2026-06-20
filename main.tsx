import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './globals.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60, retry: 2 },
    mutations: { retry: 0 }
  }
})

const updateServiceWorker = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateServiceWorker(true)
  },
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return
    window.setInterval(() => {
      registration.update().catch(() => undefined)
    }, 30 * 60 * 1000)
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#111',
              color: '#fff',
              border: '1px solid #222',
              fontFamily: 'Syne, sans-serif',
              fontSize: '13px',
            },
            success: { iconTheme: { primary: '#00FF88', secondary: '#000' } },
            error: { iconTheme: { primary: '#FF2D2D', secondary: '#000' } },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)
