-- HumenAI — Migration 005 : Add pending status to channel_status enum
-- Le statut "pending" permet au marchand de sauvegarder sa config
-- AVANT que Meta ait vérifié le webhook.
-- Exécuter dans Supabase SQL Editor.

ALTER TYPE channel_status ADD VALUE IF NOT EXISTS 'pending';
