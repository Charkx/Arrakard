/**
 * Icônes de champion, servies par Data Dragon (le service d'images de Riot),
 * comme en v1. Le nom saisi dans les feuilles de résultats ne correspond pas
 * toujours à l'identifiant de l'image : la table ci-dessous fait le lien.
 */

/** Version des images. Une version plus ancienne n'a pas les derniers champions. */
const DDRAGON_VERSION = '16.12.1';

/** Nom tel qu'il est saisi → identifiant Data Dragon, quand la règle générale ne suffit pas. */
const IMAGE_ID: Readonly<Record<string, string>> = {
  'Jarvan IV': 'JarvanIV',
  Jarvan: 'JarvanIV',
  "Kha'Zix": 'Khazix',
  "Kai'Sa": 'Kaisa',
  "Vel'Koz": 'Velkoz',
  "Cho'Gath": 'Chogath',
  "Kog'Maw": 'KogMaw',
  'Kog Maw': 'KogMaw',
  "Rek'Sai": 'RekSai',
  "Bel'Veth": 'Belveth',
  "K'Sante": 'KSante',
  'Dr. Mundo': 'DrMundo',
  'Aurelion Sol': 'AurelionSol',
  'Lee Sin': 'LeeSin',
  'Master Yi': 'MasterYi',
  'Miss Fortune': 'MissFortune',
  'Tahm Kench': 'TahmKench',
  'Twisted Fate': 'TwistedFate',
  'Xin Zhao': 'XinZhao',
  Wukong: 'MonkeyKing',
  'Nunu & Willump': 'Nunu',
  'Renata Glasc': 'Renata',
  LeBlanc: 'Leblanc',
  Zaheen: 'Zaahen',
};

/** L'identifiant Data Dragon d'un champion : la table, sinon le nom sans espaces ni ponctuation. */
export function championImageId(name: string): string {
  return IMAGE_ID[name] ?? name.replace(/['\s.\-&]/g, '').replace(/^./, (c) => c.toUpperCase());
}

export function championIconUrl(name: string): string {
  return `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/champion/${championImageId(name)}.png`;
}
