import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import { Toaster } from '@/components/ui/sonner'
import App from './App'
import { StoreProvider, useStore } from './store'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <App />
      <Toaster position="bottom-center" />
      <ViewAnalytics />
    </StoreProvider>
  </StrictMode>,
)

function ViewAnalytics() {
  const { view } = useStore()
  const path = `/${view}`
  return <Analytics path={path} route={path} />
}
