# HumenAI — Projet SaaS

## Stack
- **Frontend** : Next.js 15 (App Router), React 19, Tailwind CSS v4
- **Backend** : API Routes Next.js
- **Base de données** : PostgreSQL (Supabase) avec pgvector
- **Auth** : Supabase Auth / NextAuth.js
- **ORM** : Drizzle ORM
- **AI** : OpenAI / Anthropic
- **Déploiement** : Vercel

## Structure
```
src/
├── app/             # App Router (pages + API)
├── components/      # Composants React
├── lib/             # Logique métier
├── types/           # Types TypeScript
└── hooks/           # Hooks React
```

## Règles projet
- Isolation multi-tenant stricte (données, conversations, logs)
- 80% coverage minimum
- TDD workflow
- Anti-template UI
