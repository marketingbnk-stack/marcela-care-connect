

## CRM Clínica Dra. Marcela Cammarota

### Design System (baseado no manual da marca)
- **Cores**: Azul escuro #00205B (títulos, sidebar), azuis #334D7C, #7F8FAC, #E6E9EF (variações), Rosa/Coral #FF6D6A (destaque/CTAs), rosas claros #FF8A88, #FFB5B4, #FFF1F1, Branco #FFFFFF
- **Tipografia**: Montserrat (corpo) — fonte disponível via Google Fonts
- **Estilo visual**: Clean, sofisticado, com elementos de glassmorphism sutis, bordas finas, cantos arredondados
- **Background**: Predominantemente branco/tons claros, sidebar em azul escuro

### Estrutura de Páginas

#### 1. **Login** (tela de entrada)
- Login com email/senha para equipe pequena (2-5 pessoas)
- Logo da Marcela Cammarota no topo
- Design limpo, fundo branco com detalhes em azul e coral

#### 2. **Dashboard** (página inicial após login)
- KPIs rápidos: Total de leads, Leads novos (hoje/semana), Consultas agendadas, Taxa de conversão
- Gráfico simples de leads por origem
- Leads recentes com ações rápidas
- Atividades pendentes (follow-ups do dia)

#### 3. **Pipeline / Kanban** (gestão visual dos leads)
- Colunas arrastáveis (drag & drop):
  1. **Novo Lead** → 2. **Contato Feito** → 3. **Consulta Agendada** → 4. **Consulta Realizada** → 5. **Procedimento Agendado** → 6. **Realizado**
- Cards com: nome, origem (badge colorido), procedimento de interesse, data de entrada, botão WhatsApp
- Filtros por origem, data, procedimento

#### 4. **Lista de Leads** (visão em tabela)
- Tabela com busca, filtros e ordenação
- Colunas: Nome, Telefone, Origem, Etapa, Procedimento, Data de entrada, Última interação
- Ações rápidas: WhatsApp, editar, mover etapa

#### 5. **Detalhe do Lead** (ficha completa)
- Dados pessoais: nome, telefone, email, idade, cidade
- Origem do lead (Instagram Ads, Google Ads, Indicação, Site, Orgânico, Evento, Outro)
- Procedimento(s) de interesse (Mamoplastia, Abdominoplastia, Rinoplastia, Lipoaspiração, etc.)
- Histórico de interações / notas (timeline)
- Botão "Enviar WhatsApp" (abre wa.me com número preenchido)
- Status atual no pipeline

#### 6. **Sidebar de Navegação**
- Logo M.C. no topo
- Itens: Dashboard, Pipeline, Leads, Relatórios
- Fundo azul escuro (#00205B), ícones brancos, item ativo com destaque coral
- Colapsável

### Backend (Lovable Cloud / Supabase)
- **Tabelas**: leads, lead_notes, lead_sources (origens), procedures (procedimentos), profiles
- **Auth**: Email/senha com Lovable Cloud
- **RLS**: Todos os usuários autenticados acessam os mesmos dados (equipe pequena)

### Integração WhatsApp (MVP)
- Botão em cada lead que abre `wa.me/{telefone}` com mensagem pré-formatada
- Registro manual da interação no CRM após contato
- Preparado para evolução futura com API oficial

### Funcionalidades-chave
- Cadastro rápido de lead (modal com campos mínimos: nome, telefone, origem, procedimento)
- Drag & drop no pipeline
- Busca e filtros em todas as views
- Notas/observações por lead com data e autor
- Relatórios simples: leads por origem, conversão por etapa, leads por período

