# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## Git / versionamento

- **Nunca** execute `git add`, `git commit`, `git push`, `git checkout`, `git reset` ou qualquer comando que altere o histórico/estado do repositório remoto ou local. Isso é feito **somente pelo usuário**.
- Antes de qualquer ação de versionamento (inclusive sugerir um commit), **avise o usuário** e espere ele decidir/executar.
- Trabalhe em **steps pequenos e independentes** (ex: "models da app X", "serializers da app X", "auth middleware"). Ao final de cada step, pare e informe o que foi feito para o usuário revisar e commitar antes de seguir pro próximo.

## Qualidade / verificação

- Ao concluir uma tarefa, **rode os testes** relacionados (ou escreva um teste mínimo se não existir) para confirmar que o que foi pedido realmente funciona — não declare "pronto" sem evidência.
- Sempre passe por uma checagem de **segurança** antes de fechar a tarefa, validação de input, RBAC, dados sensíveis fora de log, endpoints públicos sem vazar dado interno (ver `docs/frontend-loja.md`).

## Referência

- Especificação completa do projeto: `docs/frontend-loja.md` e `docs/frontend-loja.txt` D:\projetos\VivaMente\monorepo\frontend\design
