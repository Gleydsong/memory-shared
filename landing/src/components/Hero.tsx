import { ArrowUpRight } from 'lucide-react'

const VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260603_132049_036591b8-6e92-4760-b94c-a7ea6eef315c.mp4'

function HeadlinePill() {
  return (
    <span
      className="mx-1 inline-flex h-[0.95em] w-[16px] shrink-0 items-center justify-center rounded-full border-2 border-[#1a1a1a] align-middle md:w-[42px] lg:w-[62px]"
      aria-hidden
    >
      <span className="h-2 w-2 rounded-full bg-[#1a1a1a]" />
    </span>
  )
}

export default function Hero() {
  return (
    <section
      className="relative flex min-h-[110vh] w-full flex-col items-center justify-start overflow-hidden bg-[#EDEEF5] pb-24 pt-28 sm:min-h-[140vh] sm:pt-32"
    >
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <video
          className="h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden
        >
          <source src={VIDEO_URL} type="video/mp4" />
        </video>
        <div
          className="absolute inset-0 bg-gradient-to-b from-[#EDEEF5]/30 via-transparent to-[#EDEEF5]"
          aria-hidden
        />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center px-8 text-center md:px-16 lg:px-20">
        <a
          href="https://github.com/Gleydsong/memory-shared"
          target="_blank"
          rel="noopener noreferrer"
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#1a1a1a]/10 bg-white/90 px-4 py-2 text-xs font-medium text-[#1a1a1a] shadow-sm backdrop-blur-sm transition hover:border-[#9fff00] hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9fff00]"
        >
          <span className="rounded-full bg-[#9fff00] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#1a1a1a]">
            OSS
          </span>
          Licença MIT · clone e auto-hospede no GitHub
        </a>
        <h1
          className="max-w-4xl font-display text-[clamp(1.75rem,5vw,3.25rem)] font-semibold leading-[1.12] tracking-tight text-[#1a1a1a]"
        >
          <span className="block">Shared: Agent Memory oferece</span>
          <span className="block text-[#6b6b6b]">contexto e recuperação para ajudar seus</span>
          <span className="block text-[#6b6b6b]">
            agentes a manter <HeadlinePill /> memória persistente.
          </span>
        </h1>

        <div
          className="mt-10 flex w-full max-w-xl items-center gap-2 rounded-[6px] border border-black/[0.05] bg-white p-1 pl-4 shadow-[0_12px_40px_rgba(26,26,26,0.08)]"
        >
          <p className="min-w-0 flex-1 text-left text-sm text-[#6b6b6b]">Buscar memórias dos agentes...</p>
          <a
            href="#quickstart"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1a1a1a] text-white transition hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9fff00]"
            aria-label="Ir para o início rápido"
          >
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-8 left-4 z-10 font-display text-sm font-medium text-[#1a1a1a] sm:left-8">
        2026
      </div>
      <div className="pointer-events-none absolute bottom-8 right-4 z-10 hidden max-w-[220px] text-right text-xs leading-snug text-[#6b6b6b] sm:block sm:right-8 sm:text-sm">
        memória de agentes · mcp e redis
      </div>

      <div className="absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 lg:block">
        <div className="flex items-center gap-2 rounded-l-full border border-r-0 border-[#1a1a1a]/15 bg-white/90 px-4 py-2 pr-6 shadow-lg backdrop-blur-sm">
          <span className="font-display text-xs font-medium text-[#1a1a1a]">v0</span>
          <span className="text-[#6b6b6b]" aria-hidden>—</span>
          <span className="font-display text-xs font-medium text-[#6b6b6b]">iris</span>
        </div>
      </div>
    </section>
  )
}
