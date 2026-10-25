/* Shop gear. Strikers lengthen the aim guide (and add a little power), grips steady the aim, powders make the board slicker so coins carry farther.
   Power-ups are consumables. Every item below is data only; the art is drawn in gfx/gearfx.ts from the colours given here. */
export interface StrikerDef { id: string; name: string; level: number; price: number; aim: number; power: number; face: [string, string]; rim: string; mark: string; style: 'plain' | 'ring' | 'flower' | 'star' | 'gold' | 'cosmic'; desc: string }
export interface GripDef { id: string; name: string; level: number; price: number; control: number; col: string; col2: string; desc: string }
export interface PowderDef { id: string; name: string; level: number; price: number; glide: number; col: string; desc: string }
export type PowerId = 'eagle' | 'thunder' | 'steady' | 'magnet' | 'glide' | 'protip' | 'rewind' | 'sticky';
export interface PowerDef { id: PowerId; name: string; price: number; col: string; col2: string; desc: string; short: string }

export const STRIKERS: StrikerDef[] = [
  { id: 'bone', name: 'BONE WHITE', level: 1, price: 0, aim: 0.34, power: 1.0, face: ['#f6efe0', '#d8ccb0'], rim: '#a89870', mark: '#b8a888', style: 'plain', desc: 'A trusty house striker.' },
  { id: 'amber', name: 'AMBER RING', level: 2, price: 250, aim: 0.48, power: 1.02, face: ['#ffd88a', '#d89a2a'], rim: '#8a5a12', mark: '#fff0c0', style: 'ring', desc: 'A longer guide line.' },
  { id: 'ebony', name: 'EBONY FLOWER', level: 4, price: 600, aim: 0.66, power: 1.05, face: ['#4a4038', '#16120e'], rim: '#0a0806', mark: '#e8c88a', style: 'flower', desc: 'Good guide, solid hit.' },
  { id: 'jade', name: 'JADE STAR', level: 7, price: 1200, aim: 0.86, power: 1.08, face: ['#8ae0b0', '#2a9a68'], rim: '#0e5a3a', mark: '#e8fff0', style: 'star', desc: 'Sees most of the board.' },
  { id: 'ruby', name: 'RUBY ROYAL', level: 10, price: 2400, aim: 1.08, power: 1.12, face: ['#ff6a7a', '#a0142a'], rim: '#5a0614', mark: '#ffd8dc', style: 'flower', desc: 'A pro grade guide.' },
  { id: 'sapphire', name: 'SAPPHIRE SUN', level: 14, price: 4500, aim: 1.34, power: 1.16, face: ['#6aa8ff', '#1a3a9a'], rim: '#0a1a5a', mark: '#e0ecff', style: 'ring', desc: 'Guide reaches far.' },
  { id: 'gilded', name: 'GILDED SUN', level: 18, price: 8000, aim: 1.7, power: 1.2, face: ['#fff0a0', '#e0a020'], rim: '#8a5a0a', mark: '#ff5a2a', style: 'gold', desc: 'Near full board guide.' },
  { id: 'cosmic', name: 'COSMIC LEGEND', level: 22, price: 15000, aim: 2.4, power: 1.25, face: ['#9a6aff', '#1a0a5a'], rim: '#0a0630', mark: '#8af0ff', style: 'cosmic', desc: 'The whole board, laid bare.' },
];
export const GRIPS: GripDef[] = [
  { id: 'none', name: 'BARE FINGERS', level: 1, price: 0, control: 0, col: '#e8b890', col2: '#c89870', desc: 'No help.' },
  { id: 'cotton', name: 'COTTON PAD', level: 3, price: 150, control: 0.15, col: '#f4f4f0', col2: '#c8c8c0', desc: 'Slightly steadier aim.' },
  { id: 'leather', name: 'LEATHER GUARD', level: 6, price: 500, control: 0.3, col: '#8a5a32', col2: '#5a3416', desc: 'A calmer flick.' },
  { id: 'gel', name: 'GEL TIP', level: 10, price: 1500, control: 0.5, col: '#4a7ac8', col2: '#1a3a78', desc: 'Half the shake.' },
  { id: 'silk', name: 'SILK SLEEVE', level: 15, price: 4000, control: 0.7, col: '#e8a05a', col2: '#9a5a1a', desc: 'Very steady.' },
  { id: 'golden', name: 'GOLDEN GRIP', level: 20, price: 9000, control: 0.9, col: '#ffd23a', col2: '#b8780a', desc: 'Rock steady.' },
];
export const POWDERS: PowderDef[] = [
  { id: 'boric', name: 'BORIC POWDER', level: 1, price: 0, glide: 1.0, col: '#f0ece0', desc: 'The standard board dust.' },
  { id: 'talc', name: 'SOFT TALC', level: 3, price: 150, glide: 1.06, col: '#e8d8f0', desc: 'A little more glide.' },
  { id: 'pro', name: 'PRO FINISH', level: 6, price: 500, glide: 1.12, col: '#ffb070', desc: 'Slick and quick.' },
  { id: 'silk', name: 'SILK DUST', level: 10, price: 1500, glide: 1.18, col: '#ffe27a', desc: 'Coins travel far.' },
  { id: 'master', name: 'MASTER GLIDE', level: 15, price: 4000, glide: 1.26, col: '#c8a0ff', desc: 'Very slick.' },
  { id: 'diamond', name: 'DIAMOND DUST', level: 20, price: 9000, glide: 1.35, col: '#9af0ff', desc: 'Maximum glide.' },
];
export const POWERS: PowerDef[] = [
  { id: 'eagle', name: 'EAGLE EYE', price: 60, col: '#3ae8ff', col2: '#0a6a9a', short: 'EYE', desc: 'A long guide with a rim bounce for one shot.' },
  { id: 'thunder', name: 'THUNDER', price: 80, col: '#ffd23a', col2: '#b8600a', short: 'PWR', desc: 'A harder hit: 25% more power for one shot.' },
  { id: 'steady', name: 'STEADY HAND', price: 90, col: '#6ae85a', col2: '#1a7a2a', short: 'AIM', desc: 'No aim shake for one shot.' },
  { id: 'magnet', name: 'POCKET MAGNET', price: 110, col: '#ff5a6a', col2: '#8a0a1a', short: 'MAG', desc: 'Pockets pull coins in for one shot.' },
  { id: 'glide', name: 'GLIDE', price: 100, col: '#c060ff', col2: '#4a12a8', short: 'GLD', desc: 'A slicker board: coins slide 40% farther for one shot.' },
  { id: 'protip', name: 'PRO TIP', price: 140, col: '#ff9a2a', col2: '#9a4a0a', short: 'TIP', desc: 'Aims the best shot for you.' },
  { id: 'rewind', name: 'REWIND', price: 160, col: '#9ab0ff', col2: '#2a3a98', short: 'RWD', desc: 'Retake the shot if it goes wrong.' },
  { id: 'sticky', name: 'STICKY STRIKER', price: 120, col: '#8a9ab0', col2: '#243448', short: 'STK', desc: 'The striker freezes when it hits a coin.' },
];
export const strikerById = (id: string) => STRIKERS.find((c) => c.id === id) ?? STRIKERS[0];
export const gripById = (id: string) => GRIPS.find((c) => c.id === id) ?? GRIPS[0];
export const powderById = (id: string) => POWDERS.find((c) => c.id === id) ?? POWDERS[0];
export const powerById = (id: string) => POWERS.find((c) => c.id === id) ?? POWERS[0];

/** XP needed to leave a level (the reference shows 920 at level 2) */
export const xpForLevel = (lv: number) => 600 + 900 * (lv - 1);
export const MAX_LEVEL = 30;
