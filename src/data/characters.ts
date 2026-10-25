/* The players. `look` drives the portrait painter; power / control / spin (1..10) are small bonuses; `skill` is how well the computer plays them. */
export type HairStyle = 'short' | 'spiky' | 'long' | 'bob' | 'pony' | 'bun' | 'mohawk' | 'afro' | 'bald' | 'slick' | 'curly' | 'pixie' | 'twin' | 'side';
export type TopKind = 'tee' | 'tank' | 'jersey' | 'hoodie' | 'jacket' | 'suit' | 'dress' | 'armor' | 'vest' | 'suit2';
export type FaceShape = 'oval' | 'round' | 'square' | 'long' | 'heart' | 'diamond';
/** body language: what the arms are doing, and the attitude on the face (smirk, smug, cool, grin, stern) */
export type Pose = 'fold' | 'chin' | 'beckon' | 'wag' | 'shrug' | 'fist' | 'cue' | 'thumbdown';
export type Attitude = 'smirk' | 'smug' | 'cool' | 'grin' | 'stern';
export interface Look {
  face?: FaceShape; pose?: Pose; att?: Attitude; tilt?: number; turn?: number;
  skin: string; hair: HairStyle; hairCol: string; eye: string; female?: boolean; top: TopKind; shirt: string; shirt2: string;
  beard?: 'stubble' | 'full' | 'goatee' | 'stache'; glasses?: 'round' | 'shades' | 'visor' | 'monocle'; hat?: 'cap' | 'beanie' | 'band' | 'phones' | 'crown' | 'helmet' | 'shades-up' | 'fedora' | 'cowboy' | 'beret' | 'turban' | 'topi';
  extra?: 'earring' | 'scar' | 'towel' | 'chain' | 'tie' | 'bow' | 'cape' | 'patch'; num?: string; bg: [string, string]; lip?: string; wide?: number; head?: number; lash?: boolean;
}
export interface CharDef { id: string; name: string; title: string; look: Look; power: number; control: number; spin: number; price: number; skill: number; playable: boolean }

const S = { fair: '#f7c9a4', tan: '#e0a070', brown: '#b87a4b', dark: '#7a4a2e', deep: '#4f2f1f', pale: '#fbdcc4' };
const mk = (id: string, name: string, title: string, look: Look, power: number, control: number, spin: number, price: number, skill: number, playable = true): CharDef => ({ id, name, title, look, power, control, spin, price, skill, playable });

export const CHARS: CharDef[] = [
  mk('arjun', 'ARJUN MEHTA', 'THE NEW STRIKER', { pose: 'fold', att: 'smirk', tilt: -0.05, turn: 0.8, face: 'square', skin: S.tan, hair: 'short', hairCol: '#1a100a', eye: '#3a2a14', top: 'jacket', shirt: '#c8602a', shirt2: '#fff0d0', bg: ['#c8802a', '#5a3010'] }, 3, 3, 3, 0, 0.3),
  mk('zara', 'ZARA KHAN', 'FLICK ARTIST', { pose: 'chin', att: 'smug', tilt: 0.06, turn: -0.7, face: 'heart', skin: S.brown, hair: 'long', hairCol: '#14100e', eye: '#2a1a10', female: true, top: 'jacket', shirt: '#f4ead4', shirt2: '#d8902a', lip: '#c8405a', lash: true, extra: 'earring', bg: ['#b8702a', '#4a2410'] }, 2, 4, 3, 0, 0.3),
  mk('pinky', 'PINKY SHARMA', 'BUBBLY BREAKER', { pose: 'wag', att: 'grin', tilt: -0.04, turn: 0.6, face: 'round', skin: S.tan, hair: 'twin', hairCol: '#1a0e0a', eye: '#3a2a14', female: true, top: 'hoodie', shirt: '#ff7aa8', shirt2: '#fff0f4', lip: '#e8607a', lash: true, bg: ['#e8905a', '#8a3a1a'] }, 2, 3, 4, 700, 0.34),
  mk('omar', 'OMAR HASSAN', 'THE BEAR', { pose: 'fold', att: 'stern', tilt: 0.03, turn: -0.8, face: 'square', skin: S.brown, hair: 'short', hairCol: '#14100e', eye: '#2a1a10', top: 'vest', shirt: '#4a3a2a', shirt2: '#e8d8b0', beard: 'full', wide: 1.16, bg: ['#7a4a1a', '#2c180a'] }, 6, 3, 2, 1500, 0.5),
  mk('amara', 'AMARA OKAFOR', 'CALM FLICK', { pose: 'shrug', att: 'cool', tilt: 0.07, turn: 0.6, face: 'oval', skin: S.deep, hair: 'afro', hairCol: '#14100e', eye: '#2a1a10', female: true, top: 'tank', shirt: '#e8a02a', shirt2: '#fff0c0', lip: '#b03a3a', lash: true, extra: 'earring', bg: ['#c8742a', '#4a2008'] }, 3, 6, 3, 2400, 0.58),
  mk('wei', 'WEI LING', 'THE PRECISIONIST', { pose: 'beckon', att: 'smirk', tilt: -0.06, turn: -0.7, face: 'diamond', skin: S.pale, hair: 'bob', hairCol: '#14141c', eye: '#2a2230', top: 'jacket', shirt: '#2a3a5a', shirt2: '#e8c890', glasses: 'round', bg: ['#6a5a3a', '#201808'] }, 3, 8, 4, 3600, 0.66),
  mk('lucas', 'LUCAS FERREIRA', 'SAMBA STRIKER', { pose: 'wag', att: 'smug', tilt: 0.05, turn: 0.8, face: 'long', skin: S.tan, hair: 'curly', hairCol: '#1a100c', eye: '#3a2a1a', top: 'jersey', shirt: '#e8c02a', shirt2: '#2a7a3a', bg: ['#a86a20', '#3a2008'] }, 5, 6, 5, 5200, 0.72),
  mk('sana', 'SANA ALI', 'SLICK FINGERS', { pose: 'beckon', att: 'smug', tilt: -0.07, turn: -0.6, face: 'heart', skin: S.brown, hair: 'pony', hairCol: '#0e0a0c', eye: '#3a1a10', female: true, top: 'hoodie', shirt: '#a8402a', shirt2: '#fff0d8', lip: '#c02a6a', lash: true, glasses: 'visor', bg: ['#a8502a', '#3a1408'] }, 4, 6, 9, 7200, 0.8),
  mk('babulal', 'BABULAL KAKA', 'THE CHAI MASTER', { pose: 'fold', att: 'cool', tilt: 0.04, turn: 0.7, face: 'round', skin: S.dark, hair: 'bald', hairCol: '#c8c0b0', eye: '#2a1a10', top: 'vest', shirt: '#f0e4c8', shirt2: '#a8402a', beard: 'stache', hat: 'topi', wide: 1.18, bg: ['#a85a28', '#3a1a08'] }, 5, 3, 2, 3000, 0.3),
  mk('meenakshi', 'MEENAKSHI AMMA', 'COURTYARD QUEEN', { pose: 'chin', att: 'smirk', tilt: -0.05, turn: -0.8, face: 'oval', skin: S.dark, hair: 'bun', hairCol: '#c8c8c0', eye: '#2a1a10', female: true, top: 'dress', shirt: '#2a7a4a', shirt2: '#ffd23a', lip: '#b02a3a', lash: true, extra: 'earring', bg: ['#b8742a', '#4a2a0a'] }, 4, 5, 3, 4200, 0.38),
  mk('farid', 'FARID QURESHI', 'SPICE TRADER', { pose: 'wag', att: 'smug', tilt: 0.06, turn: 0.7, face: 'long', skin: S.tan, hair: 'side', hairCol: '#2a1a10', eye: '#4a6a3a', top: 'vest', shirt: '#7a2a1a', shirt2: '#e8c870', beard: 'goatee', extra: 'chain', bg: ['#c8502a', '#5a1a0a'] }, 6, 5, 4, 5400, 0.46),
  mk('kavya', 'KAVYA NAIR', 'THE PLANTER', { pose: 'shrug', att: 'grin', tilt: -0.07, turn: -0.6, face: 'diamond', skin: S.brown, hair: 'long', hairCol: '#1a100c', eye: '#201a30', female: true, top: 'jacket', shirt: '#4a8a4a', shirt2: '#f4f0d8', lip: '#c8506a', lash: true, bg: ['#7a9a3a', '#243a10'] }, 4, 6, 6, 6800, 0.54),
  mk('joseph', 'CAPTAIN JOSEPH', 'BACKWATER BOSS', { pose: 'fist', att: 'cool', tilt: 0.05, turn: 0.8, face: 'square', skin: S.dark, hair: 'short', hairCol: '#c8c8c0', eye: '#3a6a5a', top: 'jersey', shirt: '#f4f4ec', shirt2: '#2a5a8a', beard: 'full', hat: 'cap', bg: ['#2a7a98', '#0a2a3a'] }, 5, 7, 6, 8400, 0.62),
  mk('indira', 'MAHARANI INDIRA', 'THE ROYAL FLICK', { pose: 'chin', att: 'smug', tilt: 0.05, turn: 0.8, face: 'oval', skin: S.tan, hair: 'bun', hairCol: '#14100e', eye: '#3a6a5a', female: true, top: 'dress', shirt: '#a01830', shirt2: '#ffd23a', hat: 'crown', lip: '#c01840', lash: true, extra: 'earring', bg: ['#8a1a2a', '#2a0610'] }, 5, 7, 6, 10500, 0.7),
  mk('zorawar', 'ZORAWAR RATHORE', 'DESERT FOX', { pose: 'fist', att: 'grin', tilt: -0.03, turn: -0.7, face: 'square', skin: S.brown, hair: 'short', hairCol: '#14100e', eye: '#4a3a1a', top: 'jacket', shirt: '#d8402a', shirt2: '#ffe8a0', hat: 'turban', beard: 'stache', wide: 1.1, bg: ['#d8704a', '#6a2a14'] }, 8, 5, 4, 13000, 0.77),
  mk('tenzing', 'TENZING LAMA', 'THE SNOW MONK', { pose: 'fold', att: 'cool', tilt: -0.04, turn: -0.8, face: 'round', skin: S.tan, hair: 'bald', hairCol: '#1a1210', eye: '#201a14', top: 'dress', shirt: '#a82a1a', shirt2: '#ffc83a', bg: ['#4a6a98', '#12203a'] }, 6, 8, 6, 17000, 0.84),
  mk('mira', 'MIRA TAN', 'NIGHT HAWKER', { pose: 'shrug', att: 'smirk', tilt: 0.06, turn: 0.7, face: 'heart', skin: S.pale, hair: 'pixie', hairCol: '#ff3ad8', eye: '#201a30', female: true, top: 'hoodie', shirt: '#2a1a40', shirt2: '#ff9ae8', hat: 'phones', lip: '#c02a8a', lash: true, bg: ['#7a1a8a', '#14083a'] }, 5, 8, 8, 22000, 0.91),
  mk('rudra', 'RUDRA VERMA', 'THE GRANDMASTER', { pose: 'fist', att: 'smirk', tilt: -0.06, turn: -0.6, face: 'long', skin: S.brown, hair: 'slick', hairCol: '#c8c8c0', eye: '#3a2a1a', top: 'suit', shirt: '#1a1a22', shirt2: '#ffd23a', glasses: 'monocle', beard: 'goatee', extra: 'chain', bg: ['#b88a20', '#3a2404'] }, 10, 10, 9, 30000, 0.97),
  mk('coach', 'COACH PEPPER', 'YOUR GUIDE', { pose: 'beckon', att: 'grin', tilt: 0.04, turn: 0.5, face: 'round', skin: S.tan, hair: 'curly', hairCol: '#c8c8c8', eye: '#3a2a1a', female: true, top: 'jacket', shirt: '#c8802a', shirt2: '#f4f0d8', glasses: 'round', lip: '#c8506a', lash: true, bg: ['#b8742a', '#3a200a'] }, 5, 5, 5, 0, 0.5, false),
];
export const PLAYABLE = CHARS.filter((c) => c.playable);
/** the name to show in tight places: the first name (skipping titles like LADY / MR.) */
export const shortName = (c: { name: string }) => { const w = c.name.replace(/^(LADY|MR.|COACH|DR.|MAHARANI|CAPTAIN)\s+/, '').split(' '); return w[0]; };
export const charById = (id: string) => CHARS.find((c) => c.id === id) ?? CHARS[0];
export const charIndex = (id: string) => CHARS.findIndex((c) => c.id === id);
