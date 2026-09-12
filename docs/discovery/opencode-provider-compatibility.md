# OpenCode compatibility with Redis Agent Memory Server 0.15.2

Date checked: 2026-08-27

## Conclusion

Redis Agent Memory Server 0.15.2 is **not restricted to OpenAI**. It uses
LiteLLM for both chat generation and embeddings and officially documents more
than 100 providers. The current project's Compose configuration happens to use
the OpenAI defaults; that is a deployment choice, not a Redis Agent Memory
requirement.

An "OpenCode API" can mean two different things:

1. **`opencode serve`** is OpenCode's agent/session control API. Its official
   endpoint inventory exposes projects, sessions, messages, providers, tools,
   MCP and related agent operations. It does not document an embeddings
   endpoint or an OpenAI-compatible model-provider surface. It is therefore not
   a drop-in LLM/embedding provider for Redis Agent Memory.
2. **OpenCode Zen** is an optional paid inference gateway with an API key. It
   documents generation endpoints (`/responses`, `/messages`,
   `/chat/completions`, and Gemini model endpoints), but its published endpoint
   list does not include `/embeddings`. Consequently, a Zen key cannot replace
   the current OpenAI key as the **sole** credential for Agent Memory's complete
   generation + semantic-search path.

Using Zen for generation and a separate supported embedding provider might be
possible, but Redis Agent Memory 0.15.2 does not document an `opencode/` LiteLLM
provider or a tested Zen recipe. It should be treated as an integration to
prototype and verify, not as a supported configuration we can claim today.

## What version 0.15.2 supports

The tag `server/v0.15.2` pins LiteLLM to `>=1.75.5, <=1.82.6`. Its provider
configuration is driven by these principal environment variables:

| Purpose | Variable | Default |
| --- | --- | --- |
| Main generation | `GENERATION_MODEL` | `gpt-5` in source |
| Fast generation | `FAST_MODEL` | `gpt-5-mini` |
| Slow generation | `SLOW_MODEL` | `gpt-5` |
| Embeddings | `EMBEDDING_MODEL` | `text-embedding-3-small` |
| Unknown embedding dimension | `REDISVL_VECTOR_DIMENSIONS` | `1536` |

The provider document names `QUERY_OPTIMIZATION_MODEL`, but the tagged
`Settings` model does not define that field and `optimize_query()` selects
`FAST_MODEL`. Because extra environment fields are ignored, this version should
use `FAST_MODEL` for query optimization rather than relying on the documented
but unwired variable.

The tagged source also declares `OPENAI_API_BASE` and
`ANTHROPIC_API_BASE`. The embedding factory explicitly forwards
`OPENAI_API_BASE` and `OPENAI_API_KEY` to LiteLLM. Although the generic LLM
client accepts per-request `api_base` and `api_key`, the normal generation call
sites do not explicitly pass those settings. This is another reason not to
claim a Zen custom-base configuration without a live compatibility test.

### Provider/model formats documented by Redis

Generation:

| Provider | Variables | `GENERATION_MODEL` example |
| --- | --- | --- |
| OpenAI | `OPENAI_API_KEY` | `gpt-4o` |
| Anthropic | `ANTHROPIC_API_KEY` | `claude-3-5-sonnet-20241022` |
| AWS Bedrock | standard AWS credentials and `AWS_REGION_NAME` | `anthropic.claude-sonnet-4-5-20250929-v1:0` |
| Ollama/local | `OLLAMA_API_BASE` | `ollama/llama2` |
| Azure OpenAI | `AZURE_API_KEY`, `AZURE_API_BASE`, `AZURE_API_VERSION` | `azure/<deployment>` |
| Gemini | `GEMINI_API_KEY` | `gemini/gemini-1.5-pro` |

Embeddings:

| Provider | Variables | `EMBEDDING_MODEL` example |
| --- | --- | --- |
| OpenAI | `OPENAI_API_KEY` | `text-embedding-3-small` |
| AWS Bedrock | AWS credentials | `bedrock/amazon.titan-embed-text-v2:0` |
| Ollama/local | `OLLAMA_API_BASE`, `REDISVL_VECTOR_DIMENSIONS=768` | `ollama/nomic-embed-text` |
| Hugging Face | `HUGGINGFACE_API_KEY`, explicit dimensions | `huggingface/BAAI/bge-large-en` |
| Cohere | `COHERE_API_KEY`, explicit dimensions | `cohere/embed-english-v3.0` |
| Vertex AI | GCP credentials | `vertex_ai/text-embedding-004` |
| Mistral | `MISTRAL_API_KEY` | `mistral/mistral-embed` |
| Azure OpenAI | Azure variables | `azure/<embedding-deployment>` |

Redis explicitly notes that the `gemini/` prefix supports generation only;
Google embeddings must use Vertex AI or another embedding provider.

## Practical options for this repository

### Recommended local/no-usage-billing path: Ollama for both operations

This is the cleanest officially documented replacement for OpenAI in local
development:

```dotenv
OLLAMA_API_BASE=http://host.docker.internal:11434
GENERATION_MODEL=ollama/qwen3:8b
FAST_MODEL=ollama/qwen3:8b
SLOW_MODEL=ollama/qwen3:8b
EMBEDDING_MODEL=ollama/nomic-embed-text
REDISVL_VECTOR_DIMENSIONS=768
REDISVL_INDEX_NAME=memory_records_ollama_768
```

The generation model can be changed to another model available in the local
Ollama installation. `nomic-embed-text` produces 768-dimensional vectors,
so the Redis vector index must be configured for 768 dimensions before it is
created. Changing dimensions after memories have already been indexed requires
a deliberate index/data migration; it is not a hot credential swap.

The Compose file now passes `OLLAMA_API_BASE`, all generation model roles,
`EMBEDDING_MODEL`, `REDISVL_VECTOR_DIMENSIONS=768`, and a dedicated
`memory_records_ollama_768` index into the Agent Memory API/worker. This keeps
the previous 1536-dimensional index intact while the local provider is
validated.

### Other proven split-provider combinations

- Anthropic or Gemini for generation plus Ollama, Bedrock, Cohere, Hugging Face,
  Mistral, Vertex AI, Azure, or OpenAI for embeddings.
- OpenRouter is supported by LiteLLM for generation with
  `OPENROUTER_API_KEY` and model names such as
  `openrouter/<provider>/<model>`. Redis 0.15.2 does not list OpenRouter in its
  embedding-provider reference, so do not assume the same OpenRouter key also
  satisfies the embedding requirement without a version-pinned live test.
- OpenCode Zen could be experimentally paired with Ollama embeddings, but this
  combination is not an official Redis recipe and must first prove the exact
  generation endpoint/model behavior against LiteLLM `<=1.82.6`.

## Primary sources

- Redis Agent Memory Server 0.15.2 release:
  <https://github.com/redis/agent-memory-server/releases/tag/server%2Fv0.15.2>
- Redis 0.15.2 provider documentation:
  <https://github.com/redis/agent-memory-server/blob/server/v0.15.2/docs/llm-providers.md>
- Redis 0.15.2 embedding documentation:
  <https://github.com/redis/agent-memory-server/blob/server/v0.15.2/docs/embedding-providers.md>
- Redis 0.15.2 settings source:
  <https://github.com/redis/agent-memory-server/blob/server/v0.15.2/agent_memory_server/config.py>
- Redis 0.15.2 LLM client source:
  <https://github.com/redis/agent-memory-server/blob/server/v0.15.2/agent_memory_server/llm/client.py>
- Redis 0.15.2 LiteLLM version constraint:
  <https://github.com/redis/agent-memory-server/blob/server/v0.15.2/pyproject.toml>
- OpenCode server API:
  <https://opencode.ai/docs/server/>
- OpenCode Zen API endpoints:
  <https://opencode.ai/docs/zen>
- OpenCode provider credentials/configuration:
  <https://opencode.ai/docs/providers/>
- LiteLLM provider/model format, including OpenRouter and Ollama:
  <https://docs.litellm.ai/>
