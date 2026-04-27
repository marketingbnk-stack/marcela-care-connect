
# Inbox WhatsApp no CRM (modo conversa)

## Visão geral

Vamos construir uma **Caixa de Entrada de WhatsApp dentro do próprio CRM** — sem depender do Chatwoot e sem usar a API oficial da Meta nesta fase. A conexão com o WhatsApp será feita via **Evolution API** (gateway open-source baseado em WhatsApp Web, igual ao que o Chatwoot/N8N usam para WhatsApp não-oficial). Funciona escaneando o QR Code do número da clínica, exatamente como o WhatsApp Web.

A interface ficará no estilo Chatwoot: **lista de conversas à esquerda, chat no meio, painel do lead à direita** — tudo já dentro do CRM, com os dados do lead/pipeline integrados.

## Por que Evolution API e não Chatwoot embutido

- Chatwoot é um app Rails completo, **não roda dentro do nosso projeto React/Lovable**. Embuti-lo exigiria hospedar separadamente e abrir via iframe — pior experiência e sem integração real com leads/pipeline.
- Evolution API é apenas um **gateway HTTP + webhook**. A interface é 100% nossa, então as conversas já nascem dentro do CRM, ligadas aos leads, com categorização, etapas do pipeline, notas etc.
- Quando vocês quiserem migrar para a API oficial da Meta no futuro, só trocamos a camada de envio/recebimento — toda a UI e o banco continuam iguais.

## Como vai funcionar (fluxo)

```text
WhatsApp da clínica
        │  (QR Code)
        ▼
  Evolution API  ──webhook──►  Edge Function "whatsapp-webhook"
        ▲                              │
        │                              ▼
   envio msgs                  Banco (conversations + messages)
        │                              │
        │                              ▼
        └────── Edge Function ◄── CRM (Inbox em tempo real)
              "whatsapp-send"
```

1. Conectamos o número via QR Code (uma vez).
2. Toda mensagem recebida cai no webhook → grava em `chat_messages` → aparece em tempo real no Inbox via Supabase Realtime.
3. Se o telefone não existir como lead, criamos automaticamente um **lead novo** (etapa "Novo Lead", origem "WhatsApp").
4. Atendente responde pelo CRM → edge function envia para Evolution API → chega no WhatsApp do cliente.
5. Cada conversa pode ser atribuída a um atendente, marcada com etiquetas (categorias), arquivada, ou ter o lead movido no pipeline diretamente do chat.

## O que será construído

### 1. Banco de dados (migrations)

Vamos **estender** as tabelas `chat_conversations` e `chat_messages` que já existem (hoje usadas pelo agente de IA), adicionando campos de WhatsApp:

- `chat_conversations`: adicionar `whatsapp_number` (do cliente), `assigned_to` (user_id do atendente), `unread_count`, `last_message_at`, `last_message_preview`, `is_archived`, `labels` (array de tags).
- `chat_messages`: adicionar `direction` ('inbound'/'outbound'), `whatsapp_message_id`, `media_url`, `media_type`, `status` (enviado/entregue/lido).
- Nova tabela `conversation_labels` (id, name, color) para categorias customizáveis.
- Nova tabela `whatsapp_instances` (id, instance_name, status, qr_code, phone_number) para guardar o estado da conexão.
- Habilitar **Realtime** em `chat_conversations` e `chat_messages`.

### 2. Edge Functions (3 novas)

- **`whatsapp-webhook`** (público, `verify_jwt = false`): recebe eventos da Evolution API. Para cada mensagem recebida: localiza/cria lead pelo telefone, localiza/cria conversa, insere mensagem, atualiza `unread_count` e `last_message_*`.
- **`whatsapp-send`** (autenticado): recebe `{ conversation_id, content, media? }` do CRM, chama a Evolution API para enviar e grava a mensagem outbound.
- **`whatsapp-instance`** (autenticado, admin): cria/conecta instância na Evolution API, retorna o **QR Code** para o admin escanear, e checa o status da conexão.

### 3. Frontend — nova página `/inbox`

Layout 3 colunas estilo Chatwoot:

- **Coluna esquerda (lista de conversas)**: filtros (Todas / Não lidas / Atribuídas a mim / Arquivadas), busca, badge de não lidas, etiquetas coloridas, prévia da última mensagem e timestamp.
- **Coluna central (chat)**: bolhas de mensagens (inbound cinza à esquerda, outbound coral à direita), indicador de digitação/status, campo de envio com suporte a anexos e emoji, botão de marcar como lida.
- **Coluna direita (contexto do lead)**: mostra o `LeadDetailDialog` em modo embedded — dados do lead, etapa do pipeline (com troca rápida), próxima etapa sugerida, notas, agendamentos. Botões para: atribuir conversa a um atendente, adicionar etiquetas, arquivar, marcar como resolvida.

Sidebar ganha novo item **"Inbox"** com ícone de mensagem e badge de conversas não lidas.

### 4. Tela de configuração no Admin

Nova aba **"WhatsApp"** no `/admin`:
- Status da instância (Conectado / Desconectado / Aguardando QR).
- Botão **"Conectar número"** → mostra QR Code para escanear com o WhatsApp da clínica.
- Botão **"Desconectar"**.
- Gerenciamento de **Etiquetas** (criar/editar/excluir categorias com cores).

### 5. Tempo real

Usar Supabase Realtime para que novas mensagens apareçam instantaneamente no Inbox sem refresh, e a contagem de não lidas atualize ao vivo.

## Sobre a Evolution API (infra externa necessária)

A Evolution API precisa rodar em algum lugar fora do Lovable (é um servidor Node persistente que mantém a sessão WhatsApp Web aberta). Opções recomendadas:

- **Railway / Render / Fly.io** — deploy 1-clique do template oficial da Evolution API, custo ~US$ 5/mês.
- **VPS própria** (Hostinger, Contabo, DigitalOcean) — Docker compose pronto disponibilizado pelos mantenedores.

**O que vou precisar de você quando começarmos a implementar:**
1. URL da sua instância Evolution API (ex: `https://evolution.suaclinica.com`)
2. **API Key** da Evolution API (gerada no setup dela)

Esses dois valores serão guardados como **secrets** no backend (`EVOLUTION_API_URL` e `EVOLUTION_API_KEY`) — nunca expostos no frontend.

Se você ainda não tem a Evolution API rodando, eu te passo um guia passo-a-passo de deploy no Railway (mais rápido, ~10 min) assim que aprovar o plano.

## Ordem de entrega (faseada)

**Fase 1 — Fundação (essa primeira leva):**
- Migrations do banco (extensão das tabelas + novas tabelas + realtime).
- Edge functions `whatsapp-webhook`, `whatsapp-send`, `whatsapp-instance`.
- Tela Admin → aba WhatsApp com QR Code e gestão de etiquetas.
- Página `/inbox` com layout 3 colunas, lista de conversas, chat funcional, painel do lead, realtime.
- Item "Inbox" na sidebar com badge.

**Fase 2 (depois, se quiser):**
- Atribuição automática por regras (ex: leads de Instagram vão para atendente X).
- Respostas rápidas / templates.
- Envio de mídia (imagens, PDFs, áudios).
- Notificações no navegador para novas mensagens.
- Métricas no dashboard (tempo médio de resposta, conversas por atendente).

## Detalhes técnicos

- Stack: React + Tailwind + shadcn/ui, Supabase (banco/auth/realtime/edge functions), Evolution API externa.
- Webhook da Evolution → endpoint público `https://qfwlyvkumdplegppeqwx.supabase.co/functions/v1/whatsapp-webhook` (configurado no painel da Evolution).
- Identificação de lead por telefone normalizado (E.164 sem `+`).
- RLS: conversas visíveis para todos os autenticados (mantém padrão atual da equipe pequena); apenas admins/mestres podem conectar/desconectar instância.
- Sem custo de API por mensagem (é WhatsApp Web), só o custo da hospedagem da Evolution.

## Riscos / observações

- WhatsApp Web pode bloquear números usados de forma abusiva (envio em massa). Para uso de atendimento normal, é estável — milhares de empresas usam essa stack.
- Quando migrarem para a API oficial da Meta, mantemos toda a UI e só trocamos as 2 edge functions de envio/recebimento.
