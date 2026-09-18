# VivaMente — identidade

Execute os comandos nesta pasta, com o ambiente Python e as variáveis do
`.env.example` configurados. Nunca use o banco de produção para testes.

## Primeiro administrador

```powershell
python manage.py migrate
python manage.py create_admin seu-email@exemplo.com
```

O comando solicita a senha sem exibi-la, cria a conta pelo Firebase e enfileira
a sincronização para o Back. Não passe senhas pela linha de comando.
Verifique a conectividade e a sincronização antes de acessar a plataforma:

```powershell
python manage.py sync_identity_outbox
```

Em operação, esse reprocessamento precisa de execução periódica e acompanhamento
de eventos que falharam. O comando não cria um worker permanente.

## Desenvolvimento e testes

```powershell
python manage.py runserver
python manage.py test apps tests
```

O runserver usa a porta 8003; o Compose expõe 8001. Configure a plataforma
com a porta escolhida. Para testes, defina DATABASE_URL apontando explicitamente
para PostgreSQL local e separado dos bancos de trabalho.
