/** Langues de l'interface (ADR 0018). Le français est la langue de référence. */
export const LANGUAGES = ['fr', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

const fr = {
  'site.name': 'Arrakis',
  'placeholder.title': 'Le site arrive bientôt',
  'placeholder.body': 'Les classements, les cartes et les éditions d’Arrakis s’afficheront ici.',
  'language.switchTo': 'English',
} as const;

/** Une clé de texte. Une clé inconnue ne compile pas. */
export type TextKey = keyof typeof fr;

// Typé sur les clés du français : un texte oublié en anglais ne compile pas.
const en: Record<TextKey, string> = {
  'site.name': 'Arrakis',
  'placeholder.title': 'The site is coming soon',
  'placeholder.body': 'Arrakis leaderboards, cards and editions will show up here.',
  'language.switchTo': 'Français',
};

export const DICTIONARY: Record<Language, Record<TextKey, string>> = { fr, en };
