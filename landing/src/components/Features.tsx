import { Layers, RefreshCw, Zap } from 'lucide-react'

const features = [
  {
    title: 'Isolamento por Projeto',
    description:
      'Namespaces com escopo rigoroso mantêm a memória de cada repositório separada. Agentes só recuperam o que pertence ao projeto atual.',
    icon: Layers,
  },
  {
    title: 'Sincronização Multi-Agente',
    description:
      'Orca, Cursor Composer, Codex, Grok e Antigravity compartilham handoffs, decisões e estado de trabalho através de um único endpoint Streamable HTTP MCP.',
    icon: RefreshCw,
  },
  {
    title: 'Busca Vetorial Rápida',
    description:
      'Busca semântica sobre o contexto armazenado retorna as memórias certas em milissegundos — prontas para a próxima chamada de ferramenta.',
    icon: Zap,
  },
]

export default function Features() {
  return (
    <section className="px-4 py-16 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
        {features.map((feature) => (
          <article
            key={feature.title}
            className="rounded-3xl border border-zinc-200/80 bg-white p-8 shadow-[0_12px_40px_rgba(26,26,26,0.04)]"
          >
            <div className="mb-5 inline-flex rounded-xl bg-[#9fff00]/25 p-3">
              <feature.icon className="h-6 w-6 text-[#1a1a1a]" strokeWidth={1.5} />
            </div>
            <h3 className="font-display text-xl font-semibold text-[#1a1a1a]">{feature.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#6b6b6b]">{feature.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
