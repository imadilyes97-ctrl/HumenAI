-- HumenAI — Migration 004 : Fix users.password_hash nullable
-- L'authentification est gérée par Supabase Auth, pas par password_hash.
-- La colonne doit être nullable.
-- Exécuter dans Supabase SQL Editor.

ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
