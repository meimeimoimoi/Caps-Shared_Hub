# RAG query service

Planned AI answering (port **5104**): retrieves the relevant legal chunks from the vector store built by
`ingestion`, asks the language model, and returns the answer with its citations.

## Status

Empty skeleton: it starts, answers `/healthz` and `/readyz`, and validates tokens like every service. No vector
store client, model client or endpoints yet.

## When you start it

- Read the knowledge base through the vector store and the events or API of `ingestion`, never its schema.
- Who pays for a question (free quota or credits) is decided by `workflow` (`AiQuota`, `AiUsage`); this service
  only answers.
- Keep one project and split by feature (`Features/<Name>/`), with the vector store and model clients behind
  interfaces so they can be swapped and faked in tests.
- Keep API keys in user-secrets or the environment, never in `appsettings.json`.

## Run (PowerShell from BE)

~~~powershell
dotnet run --project rag-query   # http://localhost:5104/healthz
~~~
