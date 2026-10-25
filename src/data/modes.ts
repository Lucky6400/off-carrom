/* The ten ways to play. The career uses classic / free / duel plus one random special per venue. */
export type GameId = 'classic' | 'free' | 'duel' | 'rapid' | 'knock' | 'queen' | 'target' | 'bank' | 'sprint' | 'combo';
export interface ModeDef { id: GameId; name: string; tag: string; desc: string; special: boolean; races: number }
export const MODES: ModeDef[] = [
  { id: 'classic', name: 'CLASSIC', tag: 'WHITES VS BLACKS', desc: 'Pot all nine of your colour, then take the queen. Pot the queen, then cover her with one of your own coins on the very next shot or she goes back. Pot your striker and a coin comes back.', special: false, races: 1 },
  { id: 'free', name: 'FREESTYLE', tag: 'FIRST TO 100', desc: 'Any coin counts for anyone. White is 20 points, black is 10 and the queen is 50. Keep shooting while you pot. Pot your striker and you lose 10 points.', special: false, races: 1 },
  { id: 'duel', name: 'B&W DUEL', tag: 'SEVEN EACH, NO QUEEN', desc: 'A fast duel: seven coins each, no queen, and a 20 second shot clock. Clear your seven first. Pot your striker and a coin comes back.', special: false, races: 1 },
  { id: 'rapid', name: 'RAPID FIRE', tag: 'BEAT THE CLOCK', desc: 'Three minutes on the clock and 25 seconds a shot. Most points when time runs out wins. White 20, black 10, queen 50.', special: true, races: 1 },
  { id: 'knock', name: 'KNOCKOUT', tag: 'THREE LIVES', desc: 'Pot a coin every turn or lose a life. Pot your striker and you lose a life too. Last player standing wins.', special: true, races: 1 },
  { id: 'queen', name: "QUEEN'S GAMBIT", tag: 'COVER THE QUEEN', desc: 'A small board with the queen in the middle. Pot her, then cover her with a coin of your colour. The first to cover the queen wins. Coins of the wrong colour come back.', special: true, races: 1 },
  { id: 'target', name: 'TARGET PRACTICE', tag: 'LOWEST NUMBER FIRST', desc: 'Eight numbered coins. Always hit the lowest number first. Each coin you pot is worth its number. First to 19 points wins.', special: true, races: 1 },
  { id: 'bank', name: 'BANK SHOTS', tag: 'BOUNCE IT IN', desc: 'Only coins that bounce off the rim before they drop count: 20 points each. A direct pot goes straight back on the board. First to 60 wins.', special: true, races: 1 },
  { id: 'sprint', name: 'SPRINT', tag: 'FIRST TO THREE COINS', desc: 'A tiny board with seven coins. The first player to pot three coins wins. Pot your striker and your rival gets a coin.', special: true, races: 1 },
  { id: 'combo', name: 'COMBO CHAIN', tag: 'KEEP THE STREAK', desc: 'Every coin in a row is worth more: 10, 20, 30 and up. Miss and the chain breaks. Pot your striker and lose 20. First to 120 wins.', special: true, races: 1 },
];
export const modeById = (id: GameId) => MODES.find((m) => m.id === id) ?? MODES[0];
export const SPECIALS: GameId[] = ['rapid', 'knock', 'queen', 'target', 'bank', 'sprint', 'combo'];
export const CAREER_GAMES: GameId[] = ['classic', 'free', 'duel'];
