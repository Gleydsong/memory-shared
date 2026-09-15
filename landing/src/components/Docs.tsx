import { Check, Copy } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'

const REPO_URL = 'https://github.com/Gleydsong/memory-shared'

const NAV = [
  { id: 'manifesto', label: 'Manifesto e código aberto' },
  { id: 'motivation', label: 'Por que existe' },
  { id: 'architecture', label: 'Arquitetura e protocolo' },
  { id: 'stack', label: 'Stack e engenharia' },
  { id: 'installation', label: 'Instalação e guia rápido' },
  { id: 'agents', label: 'Integração de agentes' },
  { id: 'lifecycle', label: 'Ciclo de vida' },
  { id: 'tools', label: 'Referência das ferramentas MCP' },
] as const

function DocCodeBlock({ label, code }: { label?: string; code: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-zinc-200 bg-[#1a1a1a] shadow-md">
      <div className="flex items-center justify-between gap-2 border-b border-zinc-700 px-4 py-2">
        {label ? (
          <span className="truncate font-mono text-xs text-zinc-500">{label}</span>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={copy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-[#9fff00]" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-left text-xs leading-relaxed text-zinc-100 sm:text-sm">
        <code>{code}</code>
      </pre>
    </div>
  )
}

function Callout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside className="my-6 rounded-xl border border-[#9fff00]/40 bg-white p-5 shadow-sm">
      <p className="font-display text-sm font-semibold text-[#1a1a1a]">{title}</p>
      <div className="mt-2 text-sm leading-relaxed text-zinc-700">{children}</div>
    </aside>
  )
}

export default function Docs() {
  const [activeId, setActiveId] = useState<string>(NAV[0]?.id ?? 'manifesto')

  useEffect(() => {
    const ids = NAV.map((n) => n.id)
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (a.boundingClientRect.top ?? 0) - (b.boundingClientRect.top ?? 0))
        const top = visible[0]
        if (top?.target.id) setActiveId(top.target.id)
      },
      { rootMargin: '-20% 0px -55% 0px', threshold: 0 },
    )
    ids.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  return (
    <div className="mx-auto flex max-w-6xl gap-10 px-4 pb-24 pt-28 sm:px-6 lg:pt-32">
      <aside className="hidden w-56 shrink-0 lg:block">
        <nav
          className="sticky top-28 max-h-[calc(100svh-8rem)] overflow-y-auto rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur-md"
          aria-label="Seções da documentação"
        >
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.15em] text-[#8e8e8e]">
            Nesta página
          </p>
          <ul className="flex flex-col gap-1">
            {NAV.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className={`block rounded-lg px-3 py-2 text-sm transition ${
                    activeId === item.id
                      ? 'bg-[#9fff00]/25 font-medium text-[#1a1a1a]'
                      : 'text-[#8e8e8e] hover:bg-[#EDEEF5] hover:text-[#1a1a1a]'
                  }`}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <article className="min-w-0 flex-1 prose-headings:font-display">
        <header className="mb-10 border-b border-zinc-200/80 pb-8">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#8e8e8e]">Documentação</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-[#1a1a1a] sm:text-4xl">
            Shared Agent Memory
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-700">
            Memória agnóstica de modelo e isolada por projeto para Orca, Codex, Grok e Cursor Composer —
            uma interface MCP autenticada com Redis Agent Memory atrás da costura{' '}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-sm">AgentMemoryProvider</code>.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-full bg-[#9fff00] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#1a1a1a]"
            >
              MIT · Código aberto
            </a>
            <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-3 py-1 font-mono text-xs text-[#1a1a1a]">
              github.com/Gleydsong/memory-shared
            </span>
          </div>
        </header>

        <section id="manifesto" className="scroll-mt-28 mb-14">
          <h2 className="font-display text-2xl font-semibold text-[#1a1a1a]">Manifesto e código aberto</h2>
          <Callout title="CÓDIGO FONTE &gt; MEMÓRIA">
            O repositório é a fonte da verdade. A memória compartilhada oferece conhecimento histórico e
            contextual. Se divergirem, confie no repositório atual, verifique se a memória está obsoleta e
            atualize ou substitua o registro.
          </Callout>
          <p className="mt-4 text-sm leading-relaxed text-zinc-700">
            O Shared Agent Memory é{' '}
            <strong className="font-medium text-[#1a1a1a]">100% código aberto</strong> sob a{' '}
            <strong className="font-medium text-[#1a1a1a]">licença MIT</strong>. Código, issues e
            contribuições estão no{' '}
            <a
              href={REPO_URL}
              className="text-[#1a1a1a] underline decoration-[#9fff00] underline-offset-2"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            . Regras descrevem comportamento; skills descrevem fluxos; a memória guarda conhecimento
            aprendido — nunca instruções ocultas.
          </p>
        </section>

        <section id="motivation" className="scroll-mt-28 mb-14">
          <h2 className="font-display text-2xl font-semibold text-[#1a1a1a]">Por que ele existe</h2>
          <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-relaxed text-zinc-700">
            <li>
              <strong className="text-[#1a1a1a]">Silos de agentes.</strong> Orca, Cursor, Codex, Grok e
              Antigravity rodam em runtimes separados. Sem uma camada compartilhada, decisões e contexto
              ficam presos em um único cliente.
            </li>
            <li>
              <strong className="text-[#1a1a1a]">Orçamento de contexto.</strong> Tarefas longas ultrapassam
              a janela de contexto das LLMs. É preciso recall limitado — não despejar sessões inteiras no
              prompt.
            </li>
            <li>
              <strong className="text-[#1a1a1a]">Rotatividade de sessões.</strong> Handoffs entre agentes e
              sessões perdem escolhas de arquitetura, contratos e causas de bugs se não forem gravados de
              forma deliberada e recuperados com política.
            </li>
          </ul>
        </section>

        <section id="architecture" className="scroll-mt-28 mb-14">
          <h2 className="font-display text-2xl font-semibold text-[#1a1a1a]">
            Arquitetura e protocolo
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-zinc-700">
            Um <strong className="text-[#1a1a1a]">servidor MCP Streamable HTTP</strong> escuta em{' '}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">127.0.0.1:8787/mcp</code>{' '}
            por padrão. Agentes nunca veem chaves Redis, endpoints REST V0 nem nomes de ferramentas
            específicos do provedor.
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-zinc-700">
            <li>
              <strong className="text-[#1a1a1a]">AgentMemoryProvider</strong> desacopla o MCP do Redis
              Agent Memory (servidor OSS V0 no Compose local).
            </li>
            <li>
              <strong className="text-[#1a1a1a]">Memória de trabalho</strong> — estado da sessão/agente (TTL
              via <code className="font-mono text-xs">MEMORY_WORKING_TTL_SECONDS</code>, padrão 6h).
            </li>
            <li>
              <strong className="text-[#1a1a1a]">Memória de longo prazo</strong> — registros atômicos com
              vetores semânticos de <strong className="text-[#1a1a1a]">768 dimensões</strong> (
              <code className="font-mono text-xs">nomic-embed-text</code> via Ollama).
            </li>
            <li>
              <strong className="text-[#1a1a1a]">Isolamento</strong> — cada chamada leva{' '}
              <code className="font-mono text-xs">workspaceId</code>,{' '}
              <code className="font-mono text-xs">projectId</code>,{' '}
              <code className="font-mono text-xs">namespace</code> e{' '}
              <code className="font-mono text-xs">agentId</code> autenticado. Concessões via{' '}
              <code className="font-mono text-xs">MEMORY_AGENT_GRANTS_JSON</code>; autenticação sozinha não
              libera projetos arbitrários.
            </li>
          </ul>
          <DocCodeBlock
            label="Layout recomendado de namespaces"
            code={`global/{engineering,preferences,tooling,conventions}
projects/<project>/{architecture,frontend,backend,database,security,
                    integrations,api-contracts,decisions,bugs,handoffs}`}
          />
        </section>

        <section id="stack" className="scroll-mt-28 mb-14">
          <h2 className="font-display text-2xl font-semibold text-[#1a1a1a]">Stack e engenharia</h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
            <table className="w-full min-w-[320px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-[#8e8e8e]">
                  <th className="px-4 py-3 font-medium">Superfície</th>
                  <th className="px-4 py-3 font-medium">Versão / nota</th>
                </tr>
              </thead>
              <tbody className="text-zinc-700">
                <tr className="border-b border-zinc-50">
                  <td className="px-4 py-3">Runtime</td>
                  <td className="px-4 py-3 font-mono text-xs">Node.js &gt;= 20, TypeScript estrito</td>
                </tr>
                <tr className="border-b border-zinc-50">
                  <td className="px-4 py-3">MCP SDK</td>
                  <td className="px-4 py-3 font-mono text-xs">@modelcontextprotocol/sdk 1.30.0</td>
                </tr>
                <tr className="border-b border-zinc-50">
                  <td className="px-4 py-3">OSS Agent Memory</td>
                  <td className="px-4 py-3 font-mono text-xs">0.15.2 (Docker, dev local)</td>
                </tr>
                <tr className="border-b border-zinc-50">
                  <td className="px-4 py-3">Geração Ollama</td>
                  <td className="px-4 py-3 font-mono text-xs">qwen3:8b — extração / sumarização</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Embeddings Ollama</td>
                  <td className="px-4 py-3 font-mono text-xs">nomic-embed-text — 768d, custo zero de API</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-zinc-700">
            IA local mantém a memória privada e amigável a uso offline.{' '}
            <strong className="text-[#1a1a1a]">OpenAI</strong> permanece fallback opcional explícito ao
            alterar variáveis de modelo e fornecer{' '}
            <code className="font-mono text-xs">OPENAI_API_KEY</code>.
          </p>
        </section>

        <section id="installation" className="scroll-mt-28 mb-14">
          <h2 className="font-display text-2xl font-semibold text-[#1a1a1a]">Instalação e guia rápido</h2>
          <p className="mt-4 text-sm text-zinc-700">
            Pré-requisitos: <strong className="text-[#1a1a1a]">Docker</strong>,{' '}
            <strong className="text-[#1a1a1a]">Node 20+</strong>, <code className="font-mono text-xs">jq</code>,{' '}
            <code className="font-mono text-xs">openssl</code> e{' '}
            <strong className="text-[#1a1a1a]">Ollama</strong> (o wizard baixa{' '}
            <code className="font-mono text-xs">qwen3:8b</code> e{' '}
            <code className="font-mono text-xs">nomic-embed-text</code>).
          </p>
          <h3 className="mt-6 font-display text-lg font-semibold text-[#1a1a1a]">Setup automatizado</h3>
          <DocCodeBlock
            label="raiz do repositório"
            code={`./scripts/setup-memory.sh
# Cria .env modo 0600, chaves MCP por agente, grants de escopo, sobe stack após confirmar`}
          />
          <h3 className="mt-6 font-display text-lg font-semibold text-[#1a1a1a]">Stack manual</h3>
          <DocCodeBlock
            label="terminal"
            code={`cp .env.example .env
# Substitua placeholders; chmod 600 .env
docker compose -f docker-compose.memory.yml --env-file .env up -d --build
./bin/memory health`}
          />
          <h3 className="mt-6 font-display text-lg font-semibold text-[#1a1a1a]">Ferramentas CLI do operador</h3>
          <DocCodeBlock
            label="bin/memory"
            code={`./bin/memory health
./bin/memory doctor
./bin/memory search <workspace> <project> <namespace|*> <query>
./bin/memory inspect <workspace> <project> <namespace|*> <query>`}
          />
          <Callout title="Segurança do volume">
            <code className="font-mono text-xs">docker compose down</code> preserva{' '}
            <code className="font-mono text-xs">agent-memory-redis-data</code>. Nunca automatize{' '}
            <code className="font-mono text-xs">down -v</code> — isso apaga a memória persistente.
          </Callout>
        </section>

        <section id="agents" className="scroll-mt-28 mb-14">
          <h2 className="font-display text-2xl font-semibold text-[#1a1a1a]">Integração de agentes</h2>
          <p className="mt-4 text-sm text-zinc-700">
            Todos os agentes usam o mesmo endpoint com uma{' '}
            <strong className="text-[#1a1a1a]">chave Bearer distinta</strong>. O servidor deriva{' '}
            <code className="font-mono text-xs">agentId</code> da chave e rejeita impersonação.
          </p>

          <h3 className="mt-6 font-display text-lg font-semibold text-[#1a1a1a]">Cursor / Composer</h3>
          <DocCodeBlock
            label="~/.cursor/mcp.json"
            code={`{
  "mcpServers": {
    "shared_memory": {
      "url": "http://127.0.0.1:8787/mcp",
      "headers": {
        "Authorization": "Bearer \${env:SHARED_MEMORY_COMPOSER_KEY}"
      }
    }
  }
}`}
          />

          <h3 className="mt-6 font-display text-lg font-semibold text-[#1a1a1a]">Codex</h3>
          <DocCodeBlock
            label="ambiente + CLI"
            code={`# Token de SHARED_MEMORY_CODEX_KEY (não armazenado em ~/.codex/config.toml)
codex mcp get shared_memory
# Inicie sessão nova do Codex após exportar a chave.`}
          />

          <h3 className="mt-6 font-display text-lg font-semibold text-[#1a1a1a]">Grok</h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-700">
            O link da skill global é instalado em{' '}
            <code className="font-mono text-xs">~/.grok/skills/shared-memory</code>, mas neste Mac não há
            executável <code className="font-mono text-xs">grok</code> nem schema localmente comprovado para{' '}
            <code className="font-mono text-xs">mcpBoxServers</code> em{' '}
            <code className="font-mono text-xs">~/.grokbot/settings.json</code>. Não invente esse schema.
            Instale o Grok CLI compatível com Orca, confirme o formato atual de configuração MCP e aponte para
            o mesmo endpoint com <code className="font-mono text-xs">SHARED_MEMORY_GROK_KEY</code>. Até então,
            uma sessão real do Grok é um gate explícito de aceite.
          </p>

          <h3 className="mt-6 font-display text-lg font-semibold text-[#1a1a1a]">Orca</h3>
          <p className="mt-2 text-sm text-zinc-700">
            A Orca descobre a skill universal em{' '}
            <code className="font-mono text-xs">~/.agents/skills</code>. A skill{' '}
            <code className="font-mono text-xs">shared-memory</code> faz bootstrap, recall limitado,
            gravações duráveis e handoffs no protocolo — sem alterar o SQLite da Orca nem a porta{' '}
            <code className="font-mono text-xs">6768</code>.
          </p>

          <h3 className="mt-6 font-display text-lg font-semibold text-[#1a1a1a]">Antigravity (agy)</h3>
          <p className="mt-2 text-sm text-zinc-700">
            O Antigravity integra pelo mesmo endpoint MCP e pela verdade do repositório: revisões de diff em
            tempo real mais contexto compartilhado do recall — sempre valide no Git quando o status for{' '}
            <code className="font-mono text-xs">possiblyStale</code>.
          </p>
          <DocCodeBlock
            label="Mesmo contrato MCP"
            code={`# Aponte agentes com agy para:
#   http://127.0.0.1:8787/mcp
#   Authorization: Bearer <SHARED_MEMORY_*_KEY do agente>
# Use memory_get_project_context antes de revisões grandes.`}
          />
        </section>

        <section id="lifecycle" className="scroll-mt-28 mb-14">
          <h2 className="font-display text-2xl font-semibold text-[#1a1a1a]">Ciclo de vida dos agentes</h2>
          <p className="mt-4 text-sm text-zinc-700">Fluxo típico multi-agente:</p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-zinc-700">
            <li>Bootstrap da sessão e carregamento dos grants.</li>
            <li>
              <code className="font-mono text-xs">memory_get_project_context</code> com consulta focada.
            </li>
            <li>Trabalho em worktree Git isolada; o repositório continua autoritativo.</li>
            <li>
              <code className="font-mono text-xs">memory_store_decision</code> para fatos e contratos
              duráveis.
            </li>
            <li>
              <code className="font-mono text-xs">memory_create_handoff</code> para o próximo agente.
            </li>
            <li>
              O próximo agente continua via{' '}
              <code className="font-mono text-xs">memory_get_latest_handoff</code>.
            </li>
          </ol>
          <DocCodeBlock
            label="Pipeline de recall"
            code={`provider candidates -> project/namespace/type/status filters
                    -> MEMORY_MIN_RELEVANCE
                    -> MEMORY_MAX_RESULTS
                    -> MEMORY_MAX_CONTEXT_TOKENS`}
          />
        </section>

        <section id="tools" className="scroll-mt-28 mb-14">
          <h2 className="font-display text-2xl font-semibold text-[#1a1a1a]">Referência das ferramentas MCP</h2>
          <p className="mt-4 text-sm text-zinc-700">
            Ferramentas estáveis voltadas ao agente (nível acima dos nomes V0 brutos):
          </p>
          <ul className="mt-4 space-y-4 text-sm text-zinc-700">
            <li className="rounded-lg border border-zinc-100 bg-white p-4">
              <code className="font-mono text-xs font-semibold text-[#1a1a1a]">memory_search</code> —
              Busca semântica na memória de longo prazo com filtros de metadados e limiar de relevância.
            </li>
            <li className="rounded-lg border border-zinc-100 bg-white p-4">
              <code className="font-mono text-xs font-semibold text-[#1a1a1a]">memory_context</code> —
              Pacote de contexto limitado para a tarefa atual dentro do orçamento de tokens.
            </li>
            <li className="rounded-lg border border-zinc-100 bg-white p-4">
              <code className="font-mono text-xs font-semibold text-[#1a1a1a]">memory_remember</code> —
              Persiste um fato atômico de longo prazo (varrido para segredos e injeção).
            </li>
            <li className="rounded-lg border border-zinc-100 bg-white p-4">
              <code className="font-mono text-xs font-semibold text-[#1a1a1a]">memory_store_decision</code>{' '}
              — Registra decisão de engenharia ligada ao escopo do projeto.
            </li>
            <li className="rounded-lg border border-zinc-100 bg-white p-4">
              <code className="font-mono text-xs font-semibold text-[#1a1a1a]">memory_create_handoff</code>{' '}
              — Handoff estruturado para o próximo agente ou sessão.
            </li>
            <li className="rounded-lg border border-zinc-100 bg-white p-4">
              <code className="font-mono text-xs font-semibold text-[#1a1a1a]">memory_health</code> —
              Sinal de saúde do MCP e do provedor (use com{' '}
              <code className="font-mono text-xs">./bin/memory doctor</code> para sondas de embedding).
            </li>
          </ul>
          <p className="mt-6 text-xs text-[#8e8e8e]">
            Também disponíveis: <code className="font-mono">memory_get_project_context</code>, ferramentas de
            memória de trabalho, <code className="font-mono">memory_update</code> /{' '}
            <code className="font-mono">memory_forget</code>,{' '}
            <code className="font-mono">memory_search_decisions</code>,{' '}
            <code className="font-mono">memory_get_latest_handoff</code>. Veja o{' '}
            <a href={REPO_URL} className="underline underline-offset-2" target="_blank" rel="noopener noreferrer">
              README do repositório
            </a>{' '}
            para a lista completa.
          </p>
        </section>
      </article>
    </div>
  )
}
