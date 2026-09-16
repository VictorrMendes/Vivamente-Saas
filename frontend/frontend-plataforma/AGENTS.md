# Regras do projeto — frontend-plataforma (VivaMente)

## Git / versionamento

- **Nunca** execute `git add`, `git commit`, `git push`, `git checkout`, `git reset` ou qualquer comando que altere o histórico/estado do repositório remoto ou local. Isso é feito **somente pelo usuário**.
- Antes de qualquer ação de versionamento (inclusive sugerir um commit), **avise o usuário** e espere ele decidir/executar.
- Trabalhe em **steps pequenos e independentes** (ex: "models da app X", "serializers da app X", "auth middleware"). Ao final de cada step, pare e informe o que foi feito para o usuário revisar e commitar antes de seguir pro próximo.

## Qualidade / verificação

- Ao concluir uma tarefa, **rode os testes** relacionados (ou escreva um teste mínimo se não existir) para confirmar que o que foi pedido realmente funciona — não declare "pronto" sem evidência.
- Sempre passe por uma checagem de **segurança** antes de fechar a tarefa, validação de input, RBAC, dados sensíveis fora de log, endpoints públicos sem vazar dado interno (ver `docs/frontend-plataforma.md`).

## Referência

- Especificação completa do projeto: `docs/frontend-plataforma.md` e `docs/frontend-plataforma.txt` D:\projetos\VivaMente\frontend\design
