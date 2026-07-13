# HumenAI — Assistant e-commerce multi-canal

**HumenAI** est une plateforme SaaS permettant aux e-commerçants de déployer un agent conversationnel intelligent sur tous leurs canaux de vente.

## Architecture

```
Next.js 15 (App Router) + TypeScript + Tailwind CSS v4
├── Landing / Marketing
├── Dashboard marchand
│   ├── Conversations (live + historique)
│   ├── Configuration (identité, RAG, canaux)
│   ├── Intégrations (connecteurs API)
│   ├── Analytics (métriques, satisfaction)
│   └── Équipe (multi-utilisateurs, rôles)
├── API (Next.js Route Handlers)
│   ├── /api/chat — Messages entrant/sortant
│   ├── /api/webhooks/:channel — Webhooks WhatsApp/Instagram/...
│   ├── /api/tenants — Gestion des comptes marchands
│   └── /api/conversations — CRUD conversations
├── Widget de chat web (embeddable)
└── Middleware (multi-tenant, auth)
```

## Canaux supportés

| Canal | Statut |
|-------|--------|
| WhatsApp Business API | 🔧 À implémenter |
| Instagram DM | 🔧 À implémenter |
| Facebook Messenger | 🔧 À implémenter |
| TikTok DM | 🔧 À implémenter |
| Shopify | 🔧 À implémenter |
| WooCommerce | 🔧 À implémenter |
| Widget web | ✅ Prototype |
| Email | 🔧 À implémenter |

## Stack technique

| Couche | Technologie |
|--------|-------------|
| **Frontend** | Next.js 15 (App Router), React 19, Tailwind CSS v4 |
| **Backend** | Next.js API Routes |
| **Base de données** | PostgreSQL (via Supabase) |
| **Vector DB** | pgvector (RAG) |
| **Auth** | Supabase Auth / NextAuth.js |
| **ORM** | Drizzle ORM |
| **AI** | OpenAI / Anthropic |
| **Déploiement** | Vercel |

## Premiers pas

```bash
# Cloner et installer
npm install

# Copier les variables d'environnement
cp .env.example .env.local
# Remplir les valeurs dans .env.local

# Démarrer le serveur de développement
npm run dev
```

## Structure du projet

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Login, Register
│   ├── (dashboard)/        # Dashboard marchand
│   ├── api/                # API Routes
│   └── page.tsx            # Landing page
├── components/
│   ├── ui/                 # Composants réutilisables
│   ├── chat/               # Composants de chat
│   ├── dashboard/          # Composants dashboard
│   └── widget/             # Widget web embeddable
├── lib/
│   ├── ai/                 # Pipeline IA + RAG
│   ├── api/                # Adaptateurs canaux, rate limiter
│   ├── db/                 # Schema, migrations
│   └── utils/              # Utilitaires partagés
├── types/                  # Types TypeScript
└── middleware.ts           # Multi-tenant + auth
```

## Roadmap

- [ ] **Phase 1** — Fondation : Auth, DB multi-tenant, layout dashboard
- [ ] **Phase 2** — IA Core : Pipeline RAG + prompt système dynamique
- [ ] **Phase 3** — Connecteurs : API gateway + canaux (WhatsApp first)
- [ ] **Phase 4** — Dashboard complet : Configuration, wizard onboarding
- [ ] **Phase 5** — Live Chat : Hand-off humain, file d'attente
- [ ] **Phase 6** — Analytics : Reporting, monitoring, CSAT
- [ ] **Phase 7** — Enterprise : Multi-utilisateurs, templates sectoriels
