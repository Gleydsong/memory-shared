import { cva } from 'class-variance-authority'
import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../lib/utils'

type TabId = 'cursor' | 'docker' | 'codex'

const tabs: { id: TabId; label: string; fileLabel: string; body: string }[] = [
  {
    id: 'cursor',
    label: 'Cursor',
    fileLabel: '~/.cursor/mcp.json',
    body: `{
  "mcpServers": {
    "shared_memory": {
      "url": "http://127.0.0.1:8787/mcp",
      "headers": {
        "Authorization": "Bearer \${env:SHARED_MEMORY_COMPOSER_KEY}"
      }
    }
  }
}`,
  },
  {
    id: 'docker',
    label: 'Docker / CLI',
    fileLabel: 'terminal',
    body: `# Repositório privado — clone primeiro, depois na raiz do repo:
docker compose -f docker-compose.memory.yml --env-file .env up -d --build
./bin/memory health

# Ou: ./bin/memory up
# MCP (Streamable HTTP): http://127.0.0.1:8787/mcp
# Chaves: SHARED_MEMORY_COMPOSER_KEY, SHARED_MEMORY_CODEX_KEY, SHARED_MEMORY_GROK_KEY`,
  },
  {
    id: 'codex',
    label: 'Codex',
    fileLabel: 'Codex MCP (shared_memory)',
    body: `# Mesmo endpoint Streamable HTTP; token via env (não vai no config):
# SHARED_MEMORY_CODEX_KEY

codex mcp get shared_memory

# Entrada esperada:
#   url: http://127.0.0.1:8787/mcp
#   Authorization: Bearer <SHARED_MEMORY_CODEX_KEY>
# Inicie uma sessão nova do Codex após exportar a chave.`,
  },
]

const tabButton = cva(
  'rounded-full px-4 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9fff00]',
  {
    variants: {
      active: {
        true: 'bg-[#9fff00] font-medium text-[#1a1a1a]',
        false: 'text-zinc-400 hover:text-white',
      },
    },
    defaultVariants: { active: false },
  },
)

export default function Quickstart() {
  const [active, setActive] = useState<TabId>('cursor')
  const [copied, setCopied] = useState(false)

  const defaultTab = tabs[0]
  if (!defaultTab) {
    throw new Error('As abas do início rápido não podem estar vazias')
  }
  const current = tabs.find((t) => t.id === active) ?? defaultTab

  async function copy() {
    try {
      await navigator.clipboard.writeText(current.body)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section id="quickstart" className="scroll-mt-24 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#8e8e8e]">Início rápido</p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-[#1a1a1a]">
            Streamable HTTP MCP
          </h2>
          <p className="mt-3 text-sm text-[#6b6b6b]">
            Stack privada do repositório em{' '}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs text-[#1a1a1a]">
              127.0.0.1:8787/mcp
            </code>
            . Chaves Bearer por agente — sem pacote npm público.
          </p>
        </div>

        <div
          className="relative mt-10 overflow-hidden rounded-2xl border border-zinc-200 bg-[#1a1a1a] shadow-xl"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-700 px-4 py-3">
            <div className="flex flex-wrap gap-1" role="tablist" aria-label="Configuração do início rápido">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active === tab.id}
                  className={cn(tabButton({ active: active === tab.id }))}
                  onClick={() => {
                    setActive(tab.id)
                    setCopied(false)
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={copy}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-[#9fff00]" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <div className="border-b border-zinc-800 px-4 py-1.5">
            <span className="font-mono text-xs text-zinc-500">{current.fileLabel}</span>
          </div>
          <pre className="overflow-x-auto p-5 text-left text-xs leading-relaxed text-zinc-100 sm:text-sm">
            <code>{current.body}</code>
          </pre>
        </div>
      </div>
    </section>
  )
}
