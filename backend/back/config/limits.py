"""Limites de tamanho dos campos de texto livre (TextField não tem limite no banco).

Espelhados no front (Plataforma: src/lib/fieldLimits.ts; Loja: src/lib/field-limits.ts):
mudou aqui, mude lá. CharField/EmailField já são limitados pelo próprio model.
"""

MESSAGE_MAX = 2000          # mensagem de lead / pedido institucional / solicitação de agendamento
NOTES_MAX = 2000            # observações (consulta, cliente, pacote)
BIO_MAX = 2000              # bio do profissional
DESCRIPTION_MAX = 1000      # descrição de serviço / pacote
PAYMENT_DESCRIPTION_MAX = 500
CLINICAL_CONTENT_MAX = 250_000  # 4 blocos de até 50 mil caracteres + JSON
