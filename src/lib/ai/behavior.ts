// ============================================================================
// HumenAI — Behavior Configuration System
// Définit les modes de comportement du chatbot :
// - Mode prank / humour
// - Mode formulaire vs checkout complet
// - Personnalité fine (humour, persuasion, formalité, créativité)
// ============================================================================

export type PrankLevel = "none" | "light" | "medium" | "heavy";
export type CheckoutMode = "simple_form" | "full_checkout";
export type ResponseLength = "short" | "medium" | "long";

export interface BehaviorConfig {
  // Prank / Humour mode
  prankMode: boolean;
  prankLevel: PrankLevel; // "none" | "light" | "medium" | "heavy"
  prankVictim: string; // qui est la cible des blagues ("" = tout le monde)
  prankLimitPerSession: number; // max de pranks par session (0 = illimité)

  // Checkout mode
  checkoutMode: CheckoutMode;
  requireEmail: boolean;
  requirePhone: boolean;
  requireAddress: boolean;

  // Personalité fine
  humorLevel: number; // 0.0 (sérieux) → 1.0 (très drôle)
  persuasionLevel: number; // 0.0 (informatif) → 1.0 (très persuasif)
  formalityLevel: number; // 0.0 (décontracté) → 1.0 (très formel)
  creativityLevel: number; // 0.0 (strict) → 1.0 (très créatif)
  empathyLevel: number; // 0.0 (neutre) → 1.0 (très empathique)
  proactiveness: number; // 0.0 (réactif) → 1.0 (très proactif)

  // Langues
  arabicDialectPreference: "fusha" | "darija" | "any";
  abbreviationHandling: boolean; // comprendre les abréviations ?
}

// ---------------------------------------------------------------------------
// Valeurs par défaut
// ---------------------------------------------------------------------------

export const DEFAULT_BEHAVIOR: BehaviorConfig = {
  prankMode: false,
  prankLevel: "none",
  prankVictim: "",
  prankLimitPerSession: 0,
  checkoutMode: "full_checkout",
  requireEmail: true,
  requirePhone: false,
  requireAddress: false,
  humorLevel: 0.5,
  persuasionLevel: 0.7,
  formalityLevel: 0.3,
  creativityLevel: 0.5,
  empathyLevel: 0.7,
  proactiveness: 0.7,
  arabicDialectPreference: "darija",
  abbreviationHandling: true,
};


// Add legacy rules support
export interface BehaviorConfigWithMeta extends BehaviorConfig {
  _legacyRules?: string;
}

// ---------------------------------------------------------------------------
// Parse behavior config from JSON stored in language_rules
// ---------------------------------------------------------------------------

export function parseBehaviorConfig(raw: string | null | undefined): BehaviorConfigWithMeta {
  if (!raw) return { ...DEFAULT_BEHAVIOR };

  // Try to parse as JSON
  try {
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_BEHAVIOR, ...parsed };
  } catch {
    // If it's plain text (existing language_rules), return defaults + rules
    return {
      ...DEFAULT_BEHAVIOR,
      _legacyRules: raw,
    };
  }
}

// Internal type with meta
type InternalBehavior = BehaviorConfig & { _legacyRules?: string };

// ---------------------------------------------------------------------------
// Serialize behavior config to JSON string for storage in language_rules
// ---------------------------------------------------------------------------

export function serializeBehaviorConfig(config: BehaviorConfig): string {
  const { _legacyRules, ...clean } = config as InternalBehavior;
  return JSON.stringify(clean);
}

// ---------------------------------------------------------------------------
// Build the behavior section of the system prompt
// ---------------------------------------------------------------------------

export function buildBehaviorSystemPrompt(config: BehaviorConfig, brandTone: string): string {
  const parts: string[] = [];

  // ── Prank Mode ──
  if (config.prankMode && config.prankLevel !== "none") {
    const prankDesc: Record<PrankLevel, string> = {
      none: "",
      light: "blagues légères et taquineries amicales",
      medium: "blagues, défis et taquineries",
      heavy: "pranks élaborés, défis, mystères, mensonges absurdes pour rire",
    };

    let prankPrompt = `\n🎭 **MODE PRANK ACTIVÉ (${config.prankLevel.toUpperCase()})**`;
    prankPrompt += `\nFais des ${prankDesc[config.prankLevel]} avec les clients.`;

    if (config.prankVictim) {
      prankPrompt += `\nCible spéciale : "${config.prankVictim}"`;
    }
    if (config.prankLimitPerSession > 0) {
      prankPrompt += `\nLimite : ${config.prankLimitPerSession} prank(s) par conversation maximum.`;
    }
    prankPrompt += `\n⚠️ Toujours rester bienveillant — ne jamais être méchant ou offensant.`;
    prankPrompt += `\nDès que le client semble agacé, arrête immédiatement et deviens sérieux.`;

    parts.push(prankPrompt);
  }

  // ── Checkout Mode ──
  const checkoutPrompt = config.checkoutMode === "simple_form"
    ? `\n📋 **MODE FORMULAIRE SIMPLE** : Demande juste le minimum (nom + email). Ne force pas les détails.`
    : `\n🛒 **MODE CHECKOUT COMPLET** : Guide le client vers l'achat complet. Demande nom, email, téléphone, adresse si nécessaire.`;

  parts.push(checkoutPrompt);

  // ── Personalité fine ──
  const personality: string[] = [];

  // Humour
  if (config.humorLevel < 0.2) personality.push("sois strict et sérieux, pas d'humour");
  else if (config.humorLevel < 0.4) personality.push("humour léger et rare");
  else if (config.humorLevel < 0.6) personality.push("humour naturel et équilibré");
  else if (config.humorLevel < 0.8) personality.push("drôle et décontracté, n'hésite pas à faire rire");
  else personality.push("très drôle et exubérant, fais rire le client");

  // Persuasion
  if (config.persuasionLevel < 0.2) personality.push("sois informatif et neutre, ne force pas la vente");
  else if (config.persuasionLevel < 0.4) personality.push("suggère doucement sans insister");
  else if (config.persuasionLevel < 0.6) personality.push("persuasif naturel, propose avec confiance");
  else if (config.persuasionLevel < 0.8) personality.push("convaincant, utilise des arguments de vente solides");
  else personality.push("très persuasif, utilise toutes les techniques de vente (rareté, urgence, preuve sociale)");

  // Formalité
  if (config.formalityLevel < 0.2) personality.push("très décontracté, tutoie, parle comme un pote");
  else if (config.formalityLevel < 0.4) personality.push("décontracté et naturel, tutoie");
  else if (config.formalityLevel < 0.6) personality.push("neutre et poli");
  else if (config.formalityLevel < 0.8) personality.push("formel et respectueux, vouvoie");
  else personality.push("très formel, vouvoie, langage soutenu");

  // Créativité
  if (config.creativityLevel < 0.2) personality.push("réponds de façon prévisible et structurée");
  else if (config.creativityLevel < 0.4) personality.push("reste dans le cadre mais avec une touche personnelle");
  else if (config.creativityLevel < 0.6) personality.push("créatif et naturel");
  else if (config.creativityLevel < 0.8) personality.push("très créatif, surprends le client");
  else personality.push("extrêmement créatif, hors des sentiers battus");

  // Empathie
  if (config.empathyLevel < 0.2) personality.push("neutre et factuel");
  else if (config.empathyLevel < 0.4) personality.push("poli et agréable");
  else if (config.empathyLevel < 0.6) personality.push("chaleureux et compréhensif");
  else if (config.empathyLevel < 0.8) personality.push("très empathique, montre que tu comprends le client");
  else personality.push("extrêmement empathique, connecte-toi émotionnellement avec le client");

  // Proactivité
  if (config.proactiveness > 0.6) {
    personality.push("sois proactif : propose, suggère, relance sans attendre");
  } else if (config.proactiveness < 0.3) {
    personality.push("sois réactif : réponds aux questions sans en ajouter");
  }

  parts.push(`\n🎯 **PERSONNALITÉ :** ${personality.join(". ")}.`);

  // ── Température IA ──
  const temperature = 0.2 + (config.creativityLevel * 0.6) + (config.humorLevel * 0.2);
  parts.push(`\nTEMPERATURE: ${Math.min(temperature, 1.0).toFixed(2)}`);

  return parts.join("\n");
}
