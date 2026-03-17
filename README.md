# Local da FSS

Sistema de Gerenciamento de Espaços para Eventos.

## Stack

- **Frontend:** Next.js 16 (App Router) + TypeScript + Tailwind CSS
- **Backend:** Supabase (Auth + Postgres + Storage)
- **Calendário:** FullCalendar
- **Exportação:** iCal (.ics)

## Funcionalidades

- **Autenticação:** Login/registro via convite (link compartilhado por WhatsApp)
- **Solicitante:** Criar solicitações de evento com upload de arquivos (imagens, PDFs, vídeos)
- **Admin:** Aprovar/recusar solicitações, gerenciar espaços, convites e usuários
- **Calendário:** Visualização dia/semana/mês dos eventos aprovados
- **Exportação .ics:** Download individual ou de todos os eventos para Google Calendar
- **Especificações:** Página para informações do local e tamanhos de mídia (em construção)

## Setup

### 1. Clonar e instalar

```bash
git clone <repo-url>
cd local-da-fss
npm install
```

### 2. Configurar Supabase

1. Criar um projeto no [Supabase](https://supabase.com)
2. Executar o schema SQL em `supabase/schema.sql` no SQL Editor do Supabase
3. Copiar `.env.local.example` para `.env.local` e preencher:

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 3. Criar primeiro admin

No SQL Editor do Supabase, após registrar o primeiro usuário:

```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'seu@email.com';
```

### 4. Rodar

```bash
npm run dev
```

Acesse http://localhost:3000

## Deploy (Vercel)

```bash
npm install -g vercel
vercel
```

Configure as variáveis de ambiente no painel da Vercel.

## Estrutura

```
src/
├── app/
│   ├── (auth)/          # Login e registro
│   ├── (app)/           # Área autenticada
│   │   ├── dashboard/   # Dashboard do solicitante
│   │   ├── solicitacoes/# CRUD de solicitações
│   │   ├── calendario/  # Calendário público
│   │   ├── especificacoes/ # Specs do local
│   │   └── admin/       # Área administrativa
│   └── api/ics/         # API de exportação .ics
├── components/          # Componentes reutilizáveis
├── lib/                 # Supabase clients, tipos
└── middleware.ts        # Auth middleware
supabase/
└── schema.sql           # Schema completo do banco
```
