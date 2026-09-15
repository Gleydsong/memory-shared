import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { useCallback, useEffect, useState } from 'react'
import Architecture from './components/Architecture'
import Docs from './components/Docs'
import Features from './components/Features'
import Footer from './components/Footer'
import Hero from './components/Hero'
import Navbar from './components/Navbar'
import Quickstart from './components/Quickstart'

export type AppView = 'home' | 'docs'

function readViewFromHash(): AppView {
  return window.location.hash === '#docs' ? 'docs' : 'home'
}

export default function App() {
  const [view, setView] = useState<AppView>(() =>
    typeof window !== 'undefined' ? readViewFromHash() : 'home',
  )

  useEffect(() => {
    const onHashChange = () => setView(readViewFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const goHome = useCallback(() => {
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
    setView('home')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const goDocs = useCallback(() => {
    window.location.hash = 'docs'
    setView('docs')
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  return (
    <div className="min-h-svh bg-[#EDEEF5] text-zinc-900">
      <Navbar view={view} onGoHome={goHome} onGoDocs={goDocs} />
      {view === 'docs' ? (
        <main>
          <Docs />
        </main>
      ) : (
        <main>
          <Hero />
          <Architecture />
          <Features />
          <Quickstart />
        </main>
      )}
      <Footer onGoDocs={goDocs} />
      <Analytics />
      <SpeedInsights />
    </div>
  )
}
