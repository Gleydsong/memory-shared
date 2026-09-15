import { LogoMark } from './Logo'

const REPO_URL = 'https://github.com/Gleydsong/memory-shared'

type FooterProps = {
  onGoDocs: () => void
}

export default function Footer({ onGoDocs }: FooterProps) {
  return (
    <footer className="border-t border-zinc-200/80 px-4 py-12 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8">
        <div className="flex w-full flex-col items-center gap-6 sm:flex-row sm:justify-between sm:gap-4">
          <div className="flex items-center gap-2">
            <LogoMark className="h-7 w-7" />
            <span className="font-display text-sm font-semibold text-[#1a1a1a]">
              shared agent memory
            </span>
          </div>
          <nav aria-label="Rodapé" className="flex flex-wrap items-center justify-center gap-6">
            <button
              type="button"
              onClick={onGoDocs}
              className="text-sm text-[#1a1a1a] underline-offset-4 hover:underline"
            >
              Documentação
            </button>
            <a
              href="#quickstart"
              className="text-sm text-[#1a1a1a] underline-offset-4 hover:underline"
            >
              Início Rápido
            </a>
            <a
              href="#architecture"
              className="text-sm text-[#1a1a1a] underline-offset-4 hover:underline"
            >
              Arquitetura
            </a>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#1a1a1a] underline-offset-4 hover:underline"
            >
              Repositório
            </a>
          </nav>
        </div>
        <p className="text-center text-xs text-[#6b6b6b] sm:text-sm">
          <span className="font-medium text-[#1a1a1a]">100% código aberto (MIT)</span> · Camada de
          memória aberta para MCP · Baseado em Redis · Criado para orquestração de agentes
        </p>
      </div>
    </footer>
  )
}
