import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { AppView } from '../App'
import { LogoMark } from './Logo'

const homeLinks = [
  { href: '#architecture', label: 'arquitetura' },
  { href: '#mcp-server', label: 'servidor mcp' },
  { href: '#persistence', label: 'persistência' },
]

type NavbarProps = {
  view: AppView
  onGoHome: () => void
  onGoDocs: () => void
}

export default function Navbar({ view, onGoHome, onGoDocs }: NavbarProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const isDocs = view === 'docs'

  return (
    <header
      className="fixed top-0 left-0 z-50 w-full bg-gradient-to-b from-[#f1f1f1]/80 to-transparent py-6 backdrop-blur-[2px] md:py-10 pt-[max(1.5rem,env(safe-area-inset-top))]"
    >
      <nav className="mx-auto grid max-w-7xl grid-cols-12 items-center gap-4 px-6">
        <div className="col-span-6 flex items-center md:col-span-3">
          <button
            type="button"
            onClick={onGoHome}
            className="flex items-center gap-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9fff00]"
          >
            <LogoMark className="h-9 w-9" />
            <span className="font-display text-sm font-semibold tracking-tight text-[#1a1a1a] sm:text-base">
              shared agent memory
            </span>
          </button>
        </div>

        {isDocs ? (
          <div className="col-span-6 hidden items-center justify-center md:col-span-6 md:flex">
            <button
              type="button"
              onClick={onGoHome}
              className="inline-flex items-center gap-2 rounded-full border border-[#1a1a1a]/15 bg-white px-4 py-2.5 text-sm font-medium text-[#1a1a1a] transition hover:border-[#9fff00] hover:bg-[#9fff00]/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9fff00]"
            >
              <ArrowLeft className="h-4 w-4" />
              voltar ao início
            </button>
          </div>
        ) : (
          <ul className="col-span-6 hidden items-center justify-center gap-8 md:col-span-6 md:flex">
            {homeLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-sm lowercase text-[#8e8e8e] transition-colors hover:text-[#1a1a1a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9fff00]"
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={onGoDocs}
                className="text-sm lowercase text-[#8e8e8e] transition-colors hover:text-[#1a1a1a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9fff00]"
              >
                documentação
              </button>
            </li>
          </ul>
        )}

        <div className="col-span-6 hidden items-center justify-end gap-3 md:col-span-3 md:flex">
          {isDocs ? (
            <a
              href="https://github.com/Gleydsong/memory-shared"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#1a1a1a] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9fff00]"
            >
              ver no github
              <ArrowRight className="h-4 w-4" />
            </a>
          ) : (
            <a
              href="#quickstart"
              className="inline-flex items-center gap-2 rounded-full bg-[#1a1a1a] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9fff00]"
            >
              começar agora
              <ArrowRight className="h-4 w-4" />
            </a>
          )}
        </div>

        <button
          type="button"
          className="col-span-6 inline-flex justify-end rounded-xl p-2 text-[#1a1a1a] md:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9fff00]"
          aria-expanded={open}
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="mx-auto mt-2 max-w-7xl overflow-hidden rounded-2xl border border-white/50 bg-white/80 p-4 shadow-lg backdrop-blur-xl md:hidden"
          >
            {isDocs ? (
              <button
                type="button"
                className="flex w-full min-h-11 items-center justify-center gap-2 rounded-full border border-[#1a1a1a]/15 bg-[#9fff00]/20 px-5 py-3 text-sm font-medium text-[#1a1a1a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9fff00]"
                onClick={() => {
                  setOpen(false)
                  onGoHome()
                }}
              >
                <ArrowLeft className="h-4 w-4" />
                voltar ao início
              </button>
            ) : (
              <>
                <ul className="flex flex-col gap-1">
                  {homeLinks.map((link, i) => (
                    <motion.li
                      key={link.href}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <a
                        href={link.href}
                        className="block min-h-11 rounded-xl px-3 py-3 text-base text-[#1a1a1a]"
                        onClick={() => setOpen(false)}
                      >
                        {link.label}
                      </a>
                    </motion.li>
                  ))}
                  <motion.li
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: homeLinks.length * 0.05 }}
                  >
                    <button
                      type="button"
                      className="block min-h-11 w-full rounded-xl px-3 py-3 text-left text-base text-[#1a1a1a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9fff00]"
                      onClick={() => {
                        setOpen(false)
                        onGoDocs()
                      }}
                    >
                      documentação
                    </button>
                  </motion.li>
                </ul>
                <a
                  href="#quickstart"
                  className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#1a1a1a] px-5 py-3 text-sm font-medium text-white"
                  onClick={() => setOpen(false)}
                >
                  começar agora
                  <ArrowRight className="h-4 w-4" />
                </a>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
