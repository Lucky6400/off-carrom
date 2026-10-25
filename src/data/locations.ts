/* The ten carrom venues. Each hosts a boss, owns a board and gives 5 power-ups of one kind the first time it is cleared. */
import type { PowerId } from './items.js';

export type FrameKind = 'pine' | 'teak' | 'walnut' | 'rosewood' | 'ebony' | 'maple' | 'gold' | 'neon';
export type FloorKind = 'planks' | 'tiles' | 'carpet' | 'concrete' | 'ice' | 'marble' | 'deck' | 'stone' | 'space';
export type Motif = 'flower' | 'sun' | 'lotus' | 'star' | 'ring' | 'plain';
export interface BoardStyle {
  frame: [string, string]; frameKind: FrameKind; surface: [string, string]; line: string; ring: string; motif: Motif; pocket: string; net: string; trim: string; neon?: string; pockets: number;
}
export interface LocDef {
  id: string; name: string; tag: string; story: string; boss: string; opps: string[]; accent: string; sky: [string, string]; floor: FloorKind; floorCols: [string, string];
  board: BoardStyle; reward: PowerId; fee: number;
}

export const LOCS: LocDef[] = [
  { id: 'chai', name: 'CHAI CORNER', tag: 'ROADSIDE TEA STALL', story: 'Steam, sugar and the clack of coins. Babulal has run the corner board since before you were born. Beat him and the street takes notice.', boss: 'babulal', opps: ['pinky', 'omar', 'sana'], accent: '#ffb347', sky: ['#3a1a0a', '#c8641a'], floor: 'concrete', floorCols: ['#8a7a68', '#5a4c3e'],
    board: { frame: ['#d8a868', '#9a6a30'], frameKind: 'pine', surface: ['#ecca8e', '#cfa466'], line: '#3a2410', ring: '#b03a2a', motif: 'ring', pocket: '#1a0e06', net: '#d8c8a0', trim: '#d8c090', pockets: 1.1 }, reward: 'eagle', fee: 0 },
  { id: 'banyan', name: 'BANYAN COURTYARD', tag: 'VILLAGE COURTYARD', story: 'Under the old banyan the whole village gathers on Sundays. Meenakshi Amma plays slow, smiles wide and never loses the queen.', boss: 'meenakshi', opps: ['sana', 'pinky', 'wei'], accent: '#e8863a', sky: ['#4a2210', '#e8a050'], floor: 'stone', floorCols: ['#9a8468', '#6a5640'],
    board: { frame: ['#a8682c', '#5a3414'], frameKind: 'teak', surface: ['#e6bf80', '#bf9154'], line: '#3a2410', ring: '#2a6a4a', motif: 'lotus', pocket: '#180c04', net: '#d0c098', trim: '#e0b868', pockets: 1.08 }, reward: 'steady', fee: 100 },
  { id: 'spice', name: 'SPICE MARKET LOFT', tag: 'BAZAAR ATTIC', story: 'Above the sacks of saffron and chilli, traders settle debts over a carrom board. Farid counts every coin twice.', boss: 'farid', opps: ['omar', 'amara', 'lucas'], accent: '#ff6a3a', sky: ['#4a1408', '#d8501a'], floor: 'planks', floorCols: ['#7a4a26', '#3e2412'],
    board: { frame: ['#7a4a26', '#3e2412'], frameKind: 'walnut', surface: ['#deae6c', '#b07c40'], line: '#3a1c0a', ring: '#c8402a', motif: 'sun', pocket: '#140a04', net: '#c8b48a', trim: '#d8a850', pockets: 1.06 }, reward: 'thunder', fee: 200 },
  { id: 'tea', name: 'TEA ESTATE VERANDA', tag: 'HILL STATION', story: 'Mist over the tea rows and a veranda board polished by a hundred monsoons. Kavya flicks with a planter\'s patience.', boss: 'kavya', opps: ['wei', 'lucas', 'sana'], accent: '#9ad25a', sky: ['#143018', '#5a9a4a'], floor: 'deck', floorCols: ['#9a7a54', '#5a4228'],
    board: { frame: ['#e8c890', '#a8783a'], frameKind: 'maple', surface: ['#f0d6a8', '#c9a468'], line: '#3a2810', ring: '#2a7a4a', motif: 'star', pocket: '#1a1008', net: '#d8caa0', trim: '#e8d098', pockets: 1.04 }, reward: 'magnet', fee: 300 },
  { id: 'boat', name: 'BACKWATER HOUSEBOAT', tag: 'KERALA CRUISE', story: 'A teak houseboat drifting through still green water. Captain Joseph plays with the tide: patient, then sudden.', boss: 'joseph', opps: ['kavya', 'amara', 'lucas'], accent: '#3ab8d8', sky: ['#0a2a48', '#3a98b8'], floor: 'deck', floorCols: ['#8a6a44', '#4a3620'],
    board: { frame: ['#8a3a22', '#3a1408'], frameKind: 'rosewood', surface: ['#e6b874', '#b88444'], line: '#2a1408', ring: '#2a8aa8', motif: 'lotus', pocket: '#10080a', net: '#cfc09a', trim: '#e0b060', pockets: 1.02 }, reward: 'glide', fee: 450 },
  { id: 'durbar', name: 'MAHARAJA DURBAR', tag: 'ROYAL PALACE HALL', story: 'Chandeliers, marble and a board inlaid with gold. Maharani Indira only plays for the finest stakes and has never been beaten at home.', boss: 'indira', opps: ['omar', 'wei', 'farid'], accent: '#ffd23a', sky: ['#3a0610', '#a01830'], floor: 'marble', floorCols: ['#e8dcc4', '#b8a888'],
    board: { frame: ['#3a1c14', '#12080a'], frameKind: 'gold', surface: ['#f2d696', '#c99a54'], line: '#4a2a10', ring: '#a01830', motif: 'sun', pocket: '#0e0608', net: '#e8d6a0', trim: '#ffd23a', pockets: 1.0 }, reward: 'protip', fee: 600 },
  { id: 'haveli', name: 'DESERT HAVELI', tag: 'PINK CITY COURTYARD', story: 'Carved sandstone and the smell of rain on hot stone. Zorawar plays every shot like a duel at sunset.', boss: 'zorawar', opps: ['indira', 'amara', 'lucas'], accent: '#f07a8a', sky: ['#5a1a2a', '#f08a5a'], floor: 'stone', floorCols: ['#c8905e', '#8a5a36'],
    board: { frame: ['#c8803a', '#7a4418'], frameKind: 'teak', surface: ['#f2cc90', '#cd9a60'], line: '#401c10', ring: '#d8402a', motif: 'flower', pocket: '#180806', net: '#dccaa0', trim: '#f0c070', pockets: 0.98 }, reward: 'rewind', fee: 800 },
  { id: 'lodge', name: 'HIMALAYA LODGE', tag: 'SNOWBOUND MONASTERY INN', story: 'Prayer flags, yak butter tea and a board that has outlasted three winters. Tenzing never raises his voice or his striker.', boss: 'tenzing', opps: ['kavya', 'wei', 'joseph'], accent: '#7ac8f0', sky: ['#0a2a58', '#78c8f0'], floor: 'planks', floorCols: ['#8a5a30', '#4a3018'],
    board: { frame: ['#d8b888', '#8a6038'], frameKind: 'pine', surface: ['#dccaa4', '#ae9462'], line: '#2a2010', ring: '#3a5a8a', motif: 'star', pocket: '#10100c', net: '#d0c4a4', trim: '#e0cc9c', pockets: 0.96 }, reward: 'sticky', fee: 1000 },
  { id: 'bazaar', name: 'NIGHT BAZAAR', tag: 'NEON MARKET', story: 'Lanterns, neon signs and a glossy black board under a string of bulbs. Mira Tan hustles tourists by day and legends by night.', boss: 'mira', opps: ['zorawar', 'indira', 'farid'], accent: '#ff3ad8', sky: ['#1a0a3a', '#a01a8a'], floor: 'tiles', floorCols: ['#2a1c40', '#140c28'],
    board: { frame: ['#2a2230', '#0c0a14'], frameKind: 'neon', surface: ['#3a2a22', '#1c1410'], line: '#ff9ae8', ring: '#ff3ad8', motif: 'star', pocket: '#06040a', net: '#9a7aa0', trim: '#ff3ad8', neon: '#ff3ad8', pockets: 0.94 }, reward: 'glide', fee: 1300 },
  { id: 'arena', name: 'GRAND CHAMPIONSHIP', tag: 'THE FINAL ARENA', story: 'A packed hall, a single board under the lights and the cup waiting on its stand. Rudra Verma has not dropped a final in ten years.', boss: 'rudra', opps: ['mira', 'tenzing', 'zorawar'], accent: '#ffe27a', sky: ['#02040e', '#4a3a78'], floor: 'carpet', floorCols: ['#5a1428', '#2a0810'],
    board: { frame: ['#e8c06a', '#8a5a14'], frameKind: 'gold', surface: ['#f8e0a8', '#d6aa62'], line: '#3a2410', ring: '#c8901a', motif: 'flower', pocket: '#0a0604', net: '#f0e0b0', trim: '#fff0a0', pockets: 0.9 }, reward: 'eagle', fee: 1600 },
];
export const locById = (id: string) => LOCS.find((l) => l.id === id) ?? LOCS[0];
export const LOC_COUNT = LOCS.length;
