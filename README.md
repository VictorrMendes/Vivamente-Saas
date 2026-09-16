# VivaMente

Repositorio integrado do VivaMente. Cada aplicacao mantem suas dependencias e comandos de execucao.

| Pasta | Aplicacao |
| --- | --- |
| `backend/back` | API principal Django |
| `backend/Oauth` | Autenticacao Django |
| `frontend/frontend-plataforma` | Plataforma Vue |
| `frontend/frontend-loja` | Loja Next.js |
| `frontend/design` | Pacote de design compartilhado pelos dois fronts |

Consulte o README de cada aplicacao para instalar e executar. Configure os arquivos `.env` localmente a partir dos exemplos; eles nao sao versionados.

Os commits originais foram importados sem reescrita. As branches `archive/<projeto>/local/...` e `archive/<projeto>/origin/...` preservam as referencias anteriores a migracao. Elas sao historicas; novas funcionalidades partem de `main`.

O workflow de testes do backend fica em `.github/workflows/backend-tests.yml`. Os comandos de cada aplicacao continuam sendo executados a partir de sua propria pasta. Integracoes externas de deploy devem apontar para a pasta da aplicacao dentro deste repositorio.
