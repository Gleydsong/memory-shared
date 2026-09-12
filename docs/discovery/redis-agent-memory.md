# Redis Agent Memory — discovery oficial

Data da verificação: **2026-08-25**

Escopo: documentação, releases, pacotes e código-fonte oficiais da Redis. Este
documento não valida o ambiente local nem substitui uma prova executável.

## Conclusão executiva

Há duas linhas de produto diferentes e elas não devem ser tratadas como se
fossem a mesma API:

1. **Redis Agent Memory em Redis Iris** é o caminho suportado atual. Está
   disponível como serviço gerenciado no Redis Cloud e como distribuição
   self-managed para Kubernetes em private preview. Sua Data Plane API é
   store-scoped e está na versão OpenAPI `1.0.0`.
2. **`redis/agent-memory-server` V0** é a implementação open-source original.
   A própria Redis agora a classifica como research foundation, sem manutenção
   ativa e fora do caminho suportado de produção. A última release publicada é
   `agent-memory-server 0.15.2`.

Fontes: [README atual do repositório](https://github.com/redis/agent-memory-server),
[V0 README](https://github.com/redis/agent-memory-server/tree/main/V0),
[Redis Iris Agent Memory](https://redis.io/docs/latest/operate/iris/agent-memory/),
[API gerenciada 1.0.0](https://redis.io/docs/latest/develop/ai/context-engine/agent-memory/api-reference/).

**Recomendação:** para este projeto local, implementar a porta
`AgentMemoryProvider` e um MCP próprio, estável e de alto nível. Usar o V0
`0.15.2` como adapter de desenvolvimento, pinado e isolado. Preparar um segundo
adapter para a Data Plane `1.0.0` do Iris. Não expor aos agentes diretamente nem
os paths V0 nem os paths Iris.

## Estado e versões confirmadas

| Superfície | Versão atual confirmada | Estado | Observação |
|---|---:|---|---|
| Redis Agent Memory Data Plane | OpenAPI `1.0.0` | caminho atual | API compartilhada por Cloud e self-managed Iris |
| Python SDK do Iris | `redis-agent-memory 0.2.1` | beta | Python `>=3.10`; pin obrigatório por risco declarado de breaking changes |
| OSS Agent Memory Server | `agent-memory-server 0.15.2` | V0 / research foundation | Python `>=3.12,<3.13`; não suportado para produção |
| OSS Python client | `agent-memory-client 0.14.0` | beta legado | Python `>=3.10`; não está versionado em lockstep com server 0.15.2 |
| OSS TypeScript client | docs indicam `0.3.2+` | legado | Node.js `>=20`; confirmar no registry antes de instalar |

Evidência:

- O OpenAPI atual identifica `MemoryDataPlaneServer (1.0.0)`:
  [API reference](https://redis.io/docs/latest/develop/ai/context-engine/agent-memory/api-reference/).
- O SDK atual instala com `pip install redis-agent-memory`; a release mais
  recente encontrada é `0.2.1`, de 2026-08-06, e o próprio pacote se declara
  beta: [PyPI redis-agent-memory](https://pypi.org/project/redis-agent-memory/).
- O V0 mais recente é `0.15.2`, release assinada/tag
  `server/v0.15.2`, commit `fbf9464`:
  [releases](https://github.com/redis/agent-memory-server/releases),
  [PyPI agent-memory-server](https://pypi.org/project/agent-memory-server/).
- O client legado mais recente é `0.14.0`:
  [PyPI agent-memory-client](https://pypi.org/project/agent-memory-client/).
- O client TypeScript é documentado como `0.3.2+`, Node 20+:
  [TypeScript SDK](https://redis.github.io/agent-memory-server/typescript-sdk/).

## Produto atual: Redis Iris Agent Memory

### Componentes de runtime

No Redis Cloud, o serviço é gerenciado: a aplicação recebe endpoint, Store ID e
API key; não há servidor local para instalar.

No Iris self-managed, uma implantação padrão contém:

- Data Plane, serviço padrão `redis-agent-memory:9000`;
- worker para promotion, summarization e forgetting;
- Control Plane opcional, `redis-agent-memory-controlplane:9100`;
- Store Redis para sessões, long-term memory, índices e TTL;
- Job Redis para trabalho assíncrono;
- Metadata Redis quando Control Plane e agent keys são usados.

O self-managed atual requer Kubernetes e license key e está em **private
preview**. Isso não é equivalente a um Docker Compose local open-source.

Fonte: [Self-managed Redis Agent Memory](https://redis.io/docs/latest/operate/iris/agent-memory/self-managed/).

### REST API atual

Todas as operações de dados são delimitadas por store:

```text
/v1/stores/{storeId}/session-memory
/v1/stores/{storeId}/long-term-memory
```

Operações principais confirmadas:

| Operação | Endpoint |
|---|---|
| health | `GET /health` |
| listar sessões | `GET /v1/stores/{storeId}/session-memory` |
| adicionar evento | `POST /v1/stores/{storeId}/session-memory/events` |
| obter sessão | `GET /v1/stores/{storeId}/session-memory/{sessionId}` |
| apagar sessão | `DELETE /v1/stores/{storeId}/session-memory/{sessionId}` |
| criar long-term em lote | `POST /v1/stores/{storeId}/long-term-memory` |
| buscar long-term | `POST /v1/stores/{storeId}/long-term-memory/search` |
| obter por ID | `GET /v1/stores/{storeId}/long-term-memory/{memoryId}` |
| atualizar por ID | `PATCH /v1/stores/{storeId}/long-term-memory/{memoryId}` |
| apagar em lote | `DELETE /v1/stores/{storeId}/long-term-memory` |

Um evento de sessão tem `sessionId`, `actorId`, `role`, `content[]`,
`createdAt` e `metadata`. Um long-term record expõe `id`, `text`,
`memoryType`, `sessionId`, `ownerId`, `namespace`, `topics`, `createdAt` e
`updatedAt`.

Fonte: [API reference 1.0.0](https://redis.io/docs/latest/develop/ai/context-engine/agent-memory/api-reference/)
e [API/SDK examples](https://redis.io/docs/latest/develop/ai/context-engine/agent-memory/api-examples/).

### Python SDK atual

```bash
pip install redis-agent-memory==0.2.1
```

```python
from redis_agent_memory import AgentMemory

client = AgentMemory(
    "https://agent-memory-endpoint.example",
    store_id="store-id",
    api_key="secret-from-secret-manager",
)
```

O client oferece variantes síncronas e assíncronas, incluindo operações como
`add_session_event`, `get_session_memory`, criação, busca, leitura, atualização
e exclusão de long-term memory. O pacote é gerado e beta; a documentação manda
fixar uma versão porque mudanças incompatíveis podem ocorrer antes de `1.0`.

Fonte: [PyPI redis-agent-memory 0.2.1](https://pypi.org/project/redis-agent-memory/).

### Autenticação e isolamento

- Redis Cloud exige `Authorization: Bearer <store-api-key>` e `storeId` no
  path.
- Na distribuição self-managed, a Data Plane suporta configuração de auth e o
  Control Plane pode administrar agent keys e grants por store.
- **Store é a fronteira lógica primária de isolamento.** `namespace`,
  `ownerId` e `sessionId` são filtros internos adicionais, não substitutos para
  autorização por store.
- A documentação alerta para nunca expor uma Data Plane com auth desabilitada a
  callers não confiáveis; nesse modo, isolamento deve ser imposto por rede.

Fontes: [API/SDK authentication](https://redis.io/docs/latest/develop/ai/context-engine/agent-memory/api-examples/),
[self-managed architecture e warning](https://redis.io/docs/latest/operate/iris/agent-memory/self-managed/).

### Session/working memory, TTL, extraction e summarization

- O nome atual no Iris é **session memory**; o V0 usa **working memory**.
- Eventos são ordenados e um POST cria a sessão se ela ainda não existir.
- A configuração do serviço suporta short-term TTL (default `1 hour`) e
  long-term TTL (default `365 days`).
- Extraction cadence default é `5 minutes`, configurável entre `60` e `600`
  segundos.
- Automatic summarization comprime mensagens antigas após um threshold e
  preserva um número configurado de mensagens recentes completas.
- O pipeline promove informações relevantes de sessão para long-term memory de
  forma assíncrona.

Fonte: [Create an Agent Memory service](https://redis.io/docs/latest/operate/iris/agent-memory/create-service/)
e [API/SDK examples](https://redis.io/docs/latest/develop/ai/context-engine/agent-memory/api-examples/).

### Long-term memory, tipos e search atual

No Data Plane atual, `memoryType` é aberto; built-ins documentados incluem
`semantic`, `episodic`, `message` e `session_summary_view`. O create público
usa `semantic`, `episodic` e `message` como enum na API atual; tipos customizados
podem ser configurados no serviço.

A operação atual documentada é **semantic search** com:

- `text`;
- `similarityThreshold` normalizado entre `0` e `1`;
- `limit` de `1` a `100`, default `10`;
- paginação por `pageToken`;
- `filterOp: all | any`;
- filtros por `sessionId`, `ownerId`, `namespace`, `topics`, `memoryType` e
  `createdAt`.

Operadores documentados: `eq`, `ne`, `in`, `all`; timestamps também suportam
`gt`, `lt`, `gte`, `lte`.

Fonte: [API reference 1.0.0](https://redis.io/docs/latest/develop/ai/context-engine/agent-memory/api-reference/)
e [search/filter examples](https://redis.io/docs/latest/develop/ai/context-engine/agent-memory/api-examples/).

**Importante:** não encontrei `search_mode=keyword|hybrid` nem `hybrid_alpha`
no contrato Iris 1.0.0. Esses recursos existem no V0 0.15.x, mas não devem ser
prometidos pelo adapter Iris sem capability discovery ou confirmação posterior.

### Sensitive-data exclusions

O Cloud oferece semantic exclusions apenas para contas selecionadas e como
recurso inicial. Elas atuam na extração sessão → long-term, não removem conteúdo
de session memory e não atuam sobre long-term records criados diretamente. A
própria Redis diz que são advisory e não podem ser o único controle.

Consequência: secret scanning e bloqueio de prompt injection devem permanecer
no nosso Memory Adapter, antes de qualquer provider.

Fonte: [Sensitive-data exclusions](https://redis.io/docs/latest/operate/iris/agent-memory/create-service/).

## V0 open-source: baseline local

### Instalação e Docker

Pin recomendado para desenvolvimento reproduzível:

```bash
pip install agent-memory-server==0.15.2
docker pull ghcr.io/redis/agent-memory-server:0.15.2
docker pull ghcr.io/redis/agent-memory-server:0.15.2-standalone
```

Também há imagens equivalentes em
`redislabs/agent-memory-server:0.15.2`. A variante standard precisa de Redis
externo; a standalone inclui Redis e documenta volume `/data`. Para o projeto,
preferir a standard com Redis separado e volume próprio, pois isso preserva a
fronteira provider/infra e facilita migração.

Fonte: [release 0.15.2](https://github.com/redis/agent-memory-server/releases).

O compose oficial V0 distingue:

- local simples: `api + redis`, API em `8000`, task backend `asyncio`;
- semelhante a produção: `api + task-worker + redis + mcp`;
- MCP de rede em `9000`;
- Redis externo por `REDIS_URL`;
- worker Docket separado para processamento background.

Comandos oficiais:

```bash
agent-memory api --host 0.0.0.0 --port 8000 --task-backend=asyncio
agent-memory task-worker --concurrency 10
agent-memory mcp --mode sse --port 9000 --task-backend docket
```

Fonte: [V0 README](https://github.com/redis/agent-memory-server/tree/main/V0).

### REST API V0

A referência publicada ainda mostra `API Version: 0.14.0`, portanto está um
minor atrás do server `0.15.2`. As rotas documentadas são:

```text
GET    /v1/health
GET    /v1/working-memory/
GET    /v1/working-memory/{session_id}
PUT    /v1/working-memory/{session_id}
DELETE /v1/working-memory/{session_id}
POST   /v1/long-term-memory/
POST   /v1/long-term-memory/search
GET    /v1/long-term-memory/{memory_id}
PATCH  /v1/long-term-memory/{memory_id}
DELETE /v1/long-term-memory
POST   /v1/long-term-memory/forget
POST   /v1/memory/prompt
```

Fonte: [V0 REST API](https://redis.github.io/agent-memory-server/api/).

Antes de implementar o adapter, levantar `/openapi.json` da imagem pinada
`0.15.2`; ele deve ser a autoridade sobre docs HTML desatualizados.

### MCP V0 e nomes exatos

As sete tools MCP confirmadas no V0 são:

```text
set_working_memory
create_long_term_memories
search_long_term_memory
get_long_term_memory
edit_long_term_memory
delete_long_term_memories
memory_prompt
```

`search_long_term_memory` suporta semantic, keyword e hybrid search, filtros,
query optimization e recency boost. `memory_prompt` combina working e long-term
context. `set_working_memory` grava mensagens, records e JSON de sessão e
dispara promotion/extraction.

Fonte: [V0 MCP interface](https://github.com/redis/agent-memory-server/blob/main/V0/docs/mcp.md).

Transporte confirmado:

- stdio: `agent-memory mcp`;
- network: `agent-memory mcp --mode sse --port 9000`;
- a release `0.14.0` adicionou `streamable-http`; portanto o wrapper deve
  consultar capabilities/transporte na versão executada e não hardcode SSE.

Fonte: [V0 README](https://github.com/redis/agent-memory-server/tree/main/V0)
e [release notes](https://github.com/redis/agent-memory-server/releases).

### Search V0

O V0 `0.15.0` adicionou keyword e hybrid search. O payload documentado usa:

```json
{
  "text": "python programming help",
  "search_mode": "hybrid",
  "hybrid_alpha": 0.7,
  "limit": 10
}
```

Modos:

- `semantic` (default): vector similarity;
- `keyword`: BM25/full-text;
- `hybrid`: combinação; `hybrid_alpha=0` é keyword puro e `1` semantic puro,
  default documentado `0.7`.

Há filtros por `user_id`, `session_id`, `namespace`, `memory_type`, `topics`,
`entities`, timestamps, além de recency boost configurável.

Fonte: [V0 long-term memory](https://redis.github.io/agent-memory-server/long-term-memory/),
[release 0.15.0](https://github.com/redis/agent-memory-server/releases),
[recency boost](https://redis.github.io/agent-memory-server/recency-boost/).

### Working memory V0

`PUT /v1/working-memory/{session_id}` substitui a memória existente e aceita
mensagens, structured memories, arbitrary JSON, contexto/sumário, `user_id`,
`namespace`, extraction strategy e `ttl_seconds`. GET pode limitar mensagens e
budget por modelo/context window. O TTL default documentado é uma hora e é
implementado com Redis TTL.

Fonte: [V0 REST API](https://redis.github.io/agent-memory-server/api/)
e [V0 memory lifecycle](https://redis.github.io/agent-memory-server/memory-lifecycle/).

### Extraction, deduplication, compaction e summarization V0

Extraction strategies confirmadas:

- `discrete` (default);
- `summary`;
- `preferences`;
- `custom`.

O servidor pode extrair automaticamente em background, aceitar memories já
normalizadas dentro da atualização de working memory ou criar long-term records
diretamente.

Deduplication documentada:

- hash-based para texto idêntico;
- semantic, por similaridade, com merge assistido por LLM;
- compaction em background para merge/cleanup/índice.

Forgetting e compaction dependem de worker quando o backend é Docket. Working
memory usa TTL; long-term memory no V0 é persistente até delete/forgetting.

Fontes: [memory extraction strategies](https://redis.github.io/agent-memory-server/memory-extraction-strategies/),
[long-term memory](https://redis.github.io/agent-memory-server/long-term-memory/),
[memory lifecycle](https://redis.github.io/agent-memory-server/memory-lifecycle/).

**Cautela:** as docs publicadas contêm exemplos históricos com nomes de tools
LLM como `eagerly_create_long_term_memory`, enquanto o MCP atual documenta
`create_long_term_memories`. Para integração MCP, usar apenas a lista retornada
por `tools/list` na instância `0.15.2`; não derivar nomes de exemplos de SDK.

### Autenticação V0

- Auth passou a ser habilitada por default na linha `0.14.x`.
- Exceto `/v1/health`, endpoints requerem Bearer JWT quando auth está ativa.
- `DISABLE_AUTH=true` existe apenas para desenvolvimento local.
- As docs resumem suporte a OAuth2/JWT ou token, mas a página dedicada de auth
  está retornando 404 no site legado. Logo, issuer/audience/JWKS exatos precisam
  ser confirmados no OpenAPI/config da imagem pinada antes de exposição remota.

Fontes: [V0 REST auth](https://redis.github.io/agent-memory-server/api/),
[release notes](https://github.com/redis/agent-memory-server/releases),
[V0 README](https://github.com/redis/agent-memory-server/tree/main/V0).

## MCP gerenciado: fato e incerteza

Há documentação oficial genérica dizendo que o serviço gerenciado possui REST
e MCP, mas as páginas específicas atuais do Iris apresentam Agent Memory como
REST API + Python SDK e não publicam endpoint MCP nem lista de tools equivalente
à do V0. A lista das sete tools acima está confirmada para o servidor V0 e para
exemplos de integração, não para um endpoint MCP nativo do Cloud.

Fontes em tensão:

- [Redis as agent memory](https://redis.io/docs/latest/develop/use-cases/agent-memory/)
  menciona REST e MCP no ecossistema gerenciado;
- [Redis Iris Agent Memory](https://redis.io/docs/latest/operate/iris/agent-memory/)
  e [API/SDK docs](https://redis.io/docs/latest/develop/ai/context-engine/agent-memory/api-examples/)
  expõem REST + SDK;
- [MCP tool list V0](https://redis.io/docs/latest/integrate/google-adk/integration-patterns/)
  usa o servidor open-source separado.

Decisão segura: hospedar o nosso **Shared Memory MCP** e fazer com que ele chame
o adapter REST/SDK. Assim todos os agentes têm a mesma superfície, mesmo que o
provider mude de V0 para Iris.

## Seam de migração recomendado

### Contrato interno

```ts
interface AgentMemoryProvider {
  capabilities(): Promise<MemoryCapabilities>;
  health(): Promise<MemoryHealth>;
  search(input: SearchMemoryInput): Promise<MemorySearchResult>;
  remember(input: RememberMemoryInput): Promise<MemoryRecord>;
  update(input: UpdateMemoryInput): Promise<MemoryRecord>;
  forget(input: ForgetMemoryInput): Promise<void>;
  getWorkingMemory(input: GetWorkingMemoryInput): Promise<WorkingMemory>;
  setWorkingMemory(input: SetWorkingMemoryInput): Promise<void>;
  createHandoff(input: AgentHandoff): Promise<void>;
}
```

`capabilities()` deve declarar pelo menos:

```ts
type MemoryCapabilities = {
  semanticSearch: boolean;
  keywordSearch: boolean;
  hybridSearch: boolean;
  serverDeduplication: boolean;
  automaticExtraction: boolean;
  automaticSummarization: boolean;
  workingMemoryTtl: boolean;
  longTermMemoryTtl: boolean;
  nativeMcp: boolean;
};
```

### Mapeamento V0 ↔ Iris

| Conceito interno | V0 0.15.2 | Iris Data Plane 1.0.0 |
|---|---|---|
| provider isolation | app-enforced + namespace/user/session | store-scoped auth + namespace/owner/session |
| temporary tier | working memory PUT/GET | session events/session retrieval |
| persistent create | `POST /v1/long-term-memory/` | `POST /v1/stores/{storeId}/long-term-memory` |
| search | semantic/keyword/hybrid | semantic + metadata filters confirmado |
| update | V0 PATCH | store-scoped PATCH |
| delete | IDs/query | store-scoped bulk IDs |
| auth | local JWT/token; disable only local | Cloud Bearer API key; grants/store in self-managed |
| extraction | strategy per working memory | service-configured type/extraction pipeline |
| TTL | per working record + forgetting config | service-level short/long TTL |

### Regras de implementação

1. O MCP público recebe `workspaceId`, `projectId`, `namespace`, `sessionId` e
   `agentId`; o adapter traduz isso para provider-specific fields.
2. Para Iris, projetos sensíveis ou tenants devem preferencialmente usar stores
   separados; no mínimo, namespace + owner filters obrigatórios em toda busca.
3. Para V0, filtros de projeto devem estar dentro da query enviada ao backend;
   nunca buscar globalmente e filtrar apenas depois.
4. Dedup, versioning (`active/superseded/deprecated`), secret scanning, trust
   level e stale detection são políticas do nosso domínio. Recursos nativos do
   provider são otimizações, não a única garantia.
5. Persistir metadata portátil dentro dos campos suportados. Dados não nativos
   (`sourceCommit`, `trustLevel`, `supersededBy`) devem ter representação
   versionada e testada pelo adapter.
6. `SOURCE CODE > MEMORY` deve ser aplicada antes de injetar contexto; o
   provider não conhece a atualidade do Git.
7. Falha do provider é fail-open para tarefas baseadas no repositório e
   fail-closed apenas para operações explicitamente dependentes de memória.

## Baseline de implementação recomendado

### Desenvolvimento local

- `agent-memory-server:0.15.2` standard, pinado por digest depois do primeiro
  pull auditado;
- Redis separado, private network, sem publish da porta `6379` quando não for
  necessário no host;
- API `8000`, worker Docket e MCP/wrapper network-accessible somente em
  loopback/private network;
- Shared Memory MCP próprio como única superfície dos agentes;
- autenticação do wrapper mesmo em rede local multi-agent; V0 auth não deve ser
  a única fronteira;
- volume persistente Redis com AOF/config adequado ao ambiente;
- capability probe no startup (`/v1/health`, `/openapi.json`, MCP `tools/list`);
- pin de Python 3.12 para o servidor V0.

### Produção

- Não promover V0 a production-ready: ele é explicitamente não suportado.
- Preferir Redis Iris Cloud; alternativamente Iris self-managed Kubernetes
  quando licença/private preview estiverem disponíveis.
- Manter Shared Memory MCP e adapter; trocar somente o provider config.
- TLS, API keys em secret manager, store grants, private connectivity, rate
  limits e auditoria no gateway/MCP.

## Riscos e lacunas a validar no Milestone 2

1. **Docs V0 stale:** REST HTML mostra API `0.14.0`, enquanto a imagem é
   `0.15.2`. Extrair e versionar `/openapi.json` da imagem real.
2. **Security drift:** há issue oficial aberta pedindo release com lock
   atualizado/CVEs já corrigidos em `main`; isso reforça que `0.15.2` precisa de
   image/dependency scan antes de uso e não serve como baseline de produção:
   [issues oficiais](https://github.com/redis/agent-memory-server/issues).
3. **Managed MCP não confirmado:** não configurar agentes direto em um endpoint
   Cloud imaginado. Usar nosso MCP sobre REST/SDK.
4. **Search parity ausente:** Iris 1.0.0 confirma semantic search, não keyword ou
   hybrid. O wrapper deve fazer capability negotiation e degradar para semantic.
5. **Dedup semantics:** deduplicação V0 pode fundir records semelhantes; testar
   atomic facts e evitar confiar nela para versionamento de decisões.
6. **TTL semantics diferentes:** V0 aceita TTL por working record; Iris configura
   TTL no serviço. O contrato interno precisa documentar quando TTL solicitado é
   rounded/ignored/rejected.
7. **MCP transport:** preferir Streamable HTTP se confirmado via runtime;
   manter SSE apenas para compatibilidade com V0.
8. **Managed data migration:** não há prova oficial de migração automática V0 →
   Iris. Planejar export/re-ingest validado, sem presumir compatibilidade física
   das chaves Redis.

## Critérios de saída deste discovery

- Versões e estado de suporte foram confirmados em fontes primárias.
- REST V0 e Iris foram separados explicitamente.
- Tools MCP exatas do V0 foram registradas.
- Recursos com paridade incompleta foram marcados como capabilities, não como
  garantias.
- O baseline preserva uma troca futura V0 → Iris sem alterar Grok, Codex,
  Composer ou Orca.

