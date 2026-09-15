import { Bot, Box, Cpu, Database, Rocket, Sparkles, Terminal } from 'lucide-react'
import { cn } from '../lib/utils'

const agents = [
  { name: 'Orca', icon: Cpu },
  { name: 'Cursor Composer', icon: Box, compact: true },
  { name: 'Grok', icon: Sparkles },
  { name: 'Antigravity', icon: Rocket },
  { name: 'Codex', icon: Terminal },
]

export default function Architecture() {
  return (
    <section id="architecture" className="scroll-mt-24 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#8e8e8e]">
            Arquitetura
          </p>
          <h2
            id="mcp-server"
            className="mt-2 font-display text-3xl font-semibold tracking-tight text-[#1a1a1a] sm:text-4xl"
          >
            Um único MCP, todos os agentes
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-[#6b6b6b] sm:text-base">
            Orca, Cursor Composer, Grok, Antigravity e Codex compartilham o mesmo servidor MCP. As
            memórias persistem no Redis com isolamento estrito por projeto.
          </p>
        </div>

        <div
          className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-[0_20px_60px_rgba(26,26,26,0.06)] sm:p-10"
        >
          <div className="flex flex-col items-stretch gap-8 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-1 flex-wrap justify-center gap-3 sm:gap-4">
              {agents.map((agent) => (
                <div
                  key={agent.name}
                  className={cn(
                    'flex min-w-[100px] flex-col items-center gap-3 rounded-2xl border border-zinc-100 bg-[#EDEEF5]/50 px-4 py-4 sm:min-w-[112px] sm:px-5 sm:py-5',
                    agent.compact && 'sm:min-w-[128px]',
                  )}
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm sm:h-12 sm:w-12">
                    <agent.icon className="h-5 w-5 text-[#1a1a1a] sm:h-6 sm:w-6" strokeWidth={1.5} />
                  </div>
                  <span
                    className={cn(
                      'text-center font-display text-xs font-semibold leading-tight text-[#1a1a1a] sm:text-sm',
                      agent.compact && 'max-w-[7rem]',
                    )}
                  >
                    {agent.name}
                  </span>
                </div>
              ))}
            </div>

            <div className="hidden flex-col items-center gap-2 px-2 xl:flex" aria-hidden>
              <div className="flex flex-col items-center gap-1">
                {[0, 1, 2, 3, 4].map((d) => (
                  <span key={d} className="h-1.5 w-1.5 rounded-full bg-[#9fff00]" />
                ))}
              </div>
              <span className="text-[10px] uppercase tracking-widest text-[#8e8e8e]">ferramentas MCP</span>
              <Bot className="h-4 w-4 text-[#8e8e8e]" />
            </div>

            <div className="flex flex-col items-center gap-4 xl:flex-1 xl:max-w-xs">
              <div className="relative w-full max-w-xs rounded-2xl border-2 border-[#1a1a1a] bg-[#1a1a1a] px-6 py-5 text-center text-white">
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-[#9fff00] px-2 py-0.5 text-[10px] font-bold uppercase text-[#1a1a1a]">
                  Servidor MCP
                </span>
                <p className="mt-1 font-mono text-xs text-zinc-300">
                  memory_search · remember · context
                </p>
              </div>
              <div className="flex h-10 items-center justify-center sm:h-12" aria-hidden>
                <div className="h-full w-px bg-gradient-to-b from-[#1a1a1a] to-[#8e8e8e]" />
              </div>
              <div
                id="persistence"
                className="flex w-full max-w-xs items-center gap-4 rounded-2xl border border-zinc-200 bg-white px-6 py-5 shadow-sm"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#9fff00]/30">
                  <Database className="h-6 w-6 text-[#1a1a1a]" />
                </div>
                <div className="text-left">
                  <p className="font-display font-semibold text-[#1a1a1a]">Redis</p>
                  <p className="text-xs text-[#6b6b6b]">vetores · handoffs · decisões</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-center gap-2 xl:hidden" aria-hidden>
            <span className="text-[#8e8e8e]">↓</span>
            <span className="text-[#8e8e8e]">MCP</span>
            <span className="text-[#8e8e8e]">↓</span>
            <span className="text-[#8e8e8e]">Redis</span>
          </div>
        </div>
      </div>
    </section>
  )
}
