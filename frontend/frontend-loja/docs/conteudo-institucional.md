# Conteúdo institucional — 22/09/2026

Sobre, Privacidade e Termos têm conteúdo e navegação próprios. Os formulários apontam para Privacidade e Termos, informando o uso/encaminhamento dos dados antes do envio. O rodapé aponta para `/sobre`, agora incluída no sitemap.

O usuário confirmou que a razão social, CNPJ e e-mail ainda não estão definidos e autorizou dados mockados no desenvolvimento. `src/components/legal-identity.tsx` concentra essa identificação: não há CNPJ inventado; o endereço usa `.example`, está explicitamente marcado como fictício e não é um link de envio. Privacidade e Termos mantêm `noindex` e ficam fora do sitemap.

## Limites e preparação para produção

Os textos jurídicos são propostas para desenvolvimento, não uma comprovação de conformidade ou parecer jurídico. Antes de publicar:

- Informar responsável legal, CNPJ quando aplicável e um canal de privacidade real, monitorado e testado.
- Validar as bases legais por operação, os papéis de VivaMente e profissionais e o atendimento de menores. Não presumir que o envio do formulário seja consentimento genérico, especialmente para dados sensíveis em texto livre.
- Definir prazos de retenção por categoria e procedimento para atender direitos dos titulares. Não foi implementada exclusão automática por esta tarefa.
- Confirmar fornecedores efetivamente usados, locais de processamento e mecanismos aplicáveis a transferências internacionais.
- Conferir a configuração real de cookies, logs, segurança e backups na infraestrutura de publicação.
- Validar regras comerciais de participação e responsabilidade. Os termos da Loja não substituem condições de contratação dos atendimentos ou da plataforma profissional.
- Revisar o texto jurídico, substituir a identificação provisória e então decidir a indexação das páginas.

## Fontes

- LGPD, especialmente transparência, hipóteses de tratamento, dados sensíveis e direitos: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm
- Orientação da ANPD aos titulares: https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados/direito-dos-titulares

As descrições de coleta e encaminhamento foram baseadas nos formulários e contratos atuais da Loja. A versão pública não promete consulta confirmada, prazo de resposta, entrega de e-mail, resultado terapêutico, nem exibe preços ou duração das sessões.
