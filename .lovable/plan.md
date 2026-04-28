
# MVP: WhatsApp 100% nativo via Mega API (sem n8n)

## Diagnóstico do que está acontecendo agora

Olhando o banco e os logs, confirmei 3 coisas:

1. **A conversa do Fábio existe** — está lá: `contact_name = "=Fabio Almeida"`, `last_message_preview = "=Fabio"`. O `=` no começo é o **bug do n8n** mandando expressões literais ("={{ $json... }}") em vez de avaliar. Por isso parece "estranho" no Inbox.
2. **O envio está quebrado** porque sua instância da Mega API está deslogada (`403 Instance not logged in`). O QR Code expirou ou nunca foi escaneado de fato.
3. **A conversa "não aparece"** provavelmente é porque o `last_message_at` recente não casa com algum filtro, ou simplesmente porque você precisa selecionar — mas ela está lá. Vou validar visualmente depois de resolver o resto.

Sua intuição está certa: **n8n nesse momento é peso morto**. Ele só serve pra "transportar" o webhook da Mega pro Supabase, e está bagunçando os dados no caminho. Vamos cortar fora.

## Stack final (simples e direta)

```text
WhatsApp do cliente
        │
        ▼
   Mega API (gateway WhatsApp Web — instância da clínica)
        │
        ├──webhook──►  Edge Function "mega-webhook"  ──►  banco (conversas + mensagens)
        │                                                      │
        ▼                                                      ▼
   envio (POST)  ◄── Edge Function "whatsapp-send"  ◄── botão "Enviar" do Inbox
                                                              ▲
                                                              │
                                                       CRM em tempo real (Supabase Realtime)
```

**Sem n8n. Sem Chatwoot. Sem API oficial Meta.** Só Mega API + nossas edge functions + nosso CRM.

## O que vou construir / arrumar

### 1. Reconectar a instância Mega (PRÉ-REQUISITO — você faz)
Hoje o `MEGA_API_INSTANCE_KEY` está **deslogado**. Antes de qualquer envio funcionar, você precisa:
- Entrar no painel da Mega API
- Confirmar a `instance_key` ativa (a mesma que está no secret)
- Escanear o QR Code com o WhatsApp da clínica
- Validar que aparece "Connected" no painel

Sem isso, nenhum envio sai — não tem código que conserte instância deslogada.

### 2. Nova edge function `mega-webhook` (substitui o n8n)
- Endpoint público: `https://qfwlyvkumdplegppeqwx.supabase.co/functions/v1/mega-webhook`
- Recebe **direto da Mega API** o payload bruto (formato Baileys: `data.key.remoteJid`, `data.message.conversation`, `data.pushName`, `data.key.fromMe`, etc.)
- Já tem todo o parser robusto (aproveito o que está em `n8n-whatsapp-webhook` mas sem a bagunça do "desempacotar string JSON"), só simplifico para o formato real da Mega.
- Ignora mensagens com `fromMe: true` enviadas pelo próprio CRM (evita eco quando a gente mesma manda).
- Cria/atualiza lead, conversa e insere mensagem — igual hoje, mas com nome/conteúdo limpos (sem "=").

**Você vai precisar:** entrar no painel da Mega → seção Webhooks → colar essa URL e ativar eventos de mensagem recebida.

### 3. Arrumar `whatsapp-send` (já existe, mas com pequenos ajustes)
- O código já está correto. Só vou:
  - Adicionar tratamento melhor pro erro "Instance not logged in" (mensagem clara pro usuário no Inbox: *"WhatsApp desconectado — peça pro admin reconectar"*)
  - Confirmar o endpoint exato da Mega (`/rest/sendMessage/{instance_key}/text`) — se a doc da sua versão usar outro path (ex: `/sendText`), ajusto.

### 4. Limpar o lixo do n8n
- **Deletar** a conversa atual do Fábio (com nome `=Fabio Almeida`) pra você testar do zero limpo.
- **Desativar** a edge function `n8n-whatsapp-webhook` (deixo o arquivo lá comentado, mas pode remover do n8n).
- Remover o link do n8n no painel da Mega — apontar webhook direto pra `mega-webhook`.

### 5. Painel admin: status da instância em tempo real
Adicionar em `AdminWhatsApp.tsx`:
- Indicador grande **Verde / Vermelho** mostrando se a Mega responde "logged in" ou não (pinga `/rest/instance/{key}` a cada 30s).
- Botão "Buscar QR Code" que chama `whatsapp-instance` e mostra o QR pra escanear sem precisar abrir o painel da Mega.

Assim você nunca mais fica sem saber se está conectado.

## Memória da conversa (já está pronto)

Você mencionou "registrar conversas no sistema (memória)". Já está tudo:
- Cada conversa tem **`id`** único, ligado ao **`lead_id`** — toda mensagem fica gravada em `chat_messages` indexada por `conversation_id`.
- Quando o agente de IA for plugado (futuro), ele lê o histórico via `chat_messages WHERE conversation_id = X ORDER BY created_at` — memória completa por contato.
- O `contact_name` já vem do WhatsApp (`pushName`) e é salvo na conversa + no lead.

Nada novo precisa ser construído pra isso — a estrutura já existe e funciona.

## Ordem de execução (quando aprovar)

1. **Você**: reconectar a Mega (escanear QR no painel da Mega).
2. **Eu**: criar `mega-webhook`, ajustar `whatsapp-send`, limpar conversa do Fábio, atualizar admin com status visual.
3. **Você**: trocar a URL do webhook na Mega de `n8n` para `mega-webhook`.
4. **Teste ponta a ponta**: manda WhatsApp pro número da clínica → conversa aparece limpa no Inbox → você responde do CRM → chega no celular do contato.

## Resposta direta às suas perguntas

> *"Conseguimos criar nativamente sem n8n?"*
**Sim, e é melhor.** O n8n só atrapalhou. Mega API → edge function direta → banco. Stack mais simples possível.

> *"Qual o melhor stack?"*
O atual já é o ideal: **Mega API (gateway) + Supabase Edge Functions (recepção/envio) + Realtime (UI ao vivo)**. Não precisa nada além.

> *"Pegar nome, ID da conversa, memória"*
Tudo já é registrado: `pushName` → `contact_name`, `conversation_id` único, `chat_messages` com histórico completo por conversa.

> *"O que é mais prático pro MVP?"*
Exatamente o que está nesse plano: **cortar n8n, ligar Mega direto, garantir instância logada**. 1 edge function nova, 1 ajuste pequeno, 1 limpeza.
