/** Langues de l'interface (ADR 0018). Le français est la langue de référence. */
export const LANGUAGES = ['fr', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

const fr = {
  'site.name': 'Arrakis',
  'nav.leaderboard': 'Classement',
  'lang.switch': 'EN',
  'lang.switch.label': 'Switch to English',

  'common.all': 'Tous',
  'common.loading': 'Chargement…',

  'tier.elite': 'Élite',
  'tier.gold': 'Or',
  'tier.silver': 'Argent',
  'tier.bronze': 'Bronze',

  'lb.title': 'Classement',
  'lb.season.active': '{season} · en cours',
  'lb.season.none': 'Aucune saison en cours',
  'lb.kpi.ranked': 'Joueurs classés',
  'lb.kpi.progress': 'Plus forte progression',
  'lb.kpi.avgGames': 'Parties en moyenne',
  'lb.podium': 'Podium',
  'lb.division': 'Division',
  'lb.division.div1': 'Div 1',
  'lb.division.div2': 'Div 2',
  'lb.role': 'Rôle',
  'lb.filters': 'Filtres du classement',
  'lb.col.rank': '#',
  'lb.col.player': 'Joueur',
  'lb.col.rating': 'Note',
  'lb.col.winrate': 'Victoires',
  'lb.col.kda': 'KDA',
  'lb.col.games': 'Parties',
  'lb.col.tier': 'Palier',
  'lb.col.form': 'Forme',
  'lb.col.evolution': 'Évol.',
  'lb.sortBy': 'Trier par {column}',
  'lb.form.up': 'En forme',
  'lb.form.down': 'En baisse',
  'lb.form.stable': 'Stable',
  'lb.evolution.up': 'Gagne {n} place(s)',
  'lb.evolution.down': 'Perd {n} place(s)',
  'lb.empty': 'Classement vide',
  'lb.empty.noFilter':
    'Aucun joueur classé pour cette saison. Il faut 5 parties pour apparaître au classement.',
  'lb.empty.filtered':
    'Aucun joueur ne correspond aux filtres actifs. Essaie d’élargir la sélection.',
  'lb.error': 'Le classement n’a pas pu être chargé. Vérifie ta connexion, puis recharge la page.',
  'lb.openProfile': 'Voir le profil de {name}',

  'card.games': '{n} parties',
  'card.editions': '{n} éditions',
  'card.impact': 'Impact',
  'card.consistency': 'Consist.',
  'card.clutch': 'Clutch',

  'profile.soon': 'Le profil des joueurs arrive bientôt.',
  'profile.back': '← Retour au classement',
} as const;

/** Une clé de texte. Une clé inconnue ne compile pas. */
export type TextKey = keyof typeof fr;

// Typé sur les clés du français : un texte oublié en anglais ne compile pas.
const en: Record<TextKey, string> = {
  'site.name': 'Arrakis',
  'nav.leaderboard': 'Leaderboard',
  'lang.switch': 'FR',
  'lang.switch.label': 'Passer en français',

  'common.all': 'All',
  'common.loading': 'Loading…',

  'tier.elite': 'Elite',
  'tier.gold': 'Gold',
  'tier.silver': 'Silver',
  'tier.bronze': 'Bronze',

  'lb.title': 'Leaderboard',
  'lb.season.active': '{season} · ongoing',
  'lb.season.none': 'No season in progress',
  'lb.kpi.ranked': 'Ranked players',
  'lb.kpi.progress': 'Biggest climb',
  'lb.kpi.avgGames': 'Average games',
  'lb.podium': 'Podium',
  'lb.division': 'Division',
  'lb.division.div1': 'Div 1',
  'lb.division.div2': 'Div 2',
  'lb.role': 'Role',
  'lb.filters': 'Leaderboard filters',
  'lb.col.rank': '#',
  'lb.col.player': 'Player',
  'lb.col.rating': 'Rating',
  'lb.col.winrate': 'Win rate',
  'lb.col.kda': 'KDA',
  'lb.col.games': 'Games',
  'lb.col.tier': 'Tier',
  'lb.col.form': 'Form',
  'lb.col.evolution': 'Move',
  'lb.sortBy': 'Sort by {column}',
  'lb.form.up': 'On form',
  'lb.form.down': 'Slumping',
  'lb.form.stable': 'Steady',
  'lb.evolution.up': 'Up {n} place(s)',
  'lb.evolution.down': 'Down {n} place(s)',
  'lb.empty': 'Empty leaderboard',
  'lb.empty.noFilter':
    'No player ranked this season yet. It takes 5 games to appear on the leaderboard.',
  'lb.empty.filtered': 'No player matches the active filters. Try widening the selection.',
  'lb.error': 'The leaderboard could not be loaded. Check your connection, then reload the page.',
  'lb.openProfile': 'Open {name}’s profile',

  'card.games': '{n} games',
  'card.editions': '{n} editions',
  'card.impact': 'Impact',
  'card.consistency': 'Consist.',
  'card.clutch': 'Clutch',

  'profile.soon': 'Player profiles are coming soon.',
  'profile.back': '← Back to the leaderboard',
};

export const DICTIONARY: Record<Language, Record<TextKey, string>> = { fr, en };
