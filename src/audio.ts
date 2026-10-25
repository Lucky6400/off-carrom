/* Synthesised audio: small WebAudio voices for UI and pool sounds (cue strike, ball clack, cushion thud, pocket drop) and a looping lounge-style backing track. */
import { save } from './save.js';

let ac: AudioContext | null = null, master: GainNode, sfxBus: GainNode, musBus: GainNode, noiseBuf: AudioBuffer | null = null, comp: DynamicsCompressorNode;
let active = true, hits = 0, hitT = 0;

export function unlock() {
  if (ac) { if (ac.state === 'suspended') void ac.resume(); return; }
  try {
    const A = window.AudioContext || (window as any).webkitAudioContext; ac = new A();
    comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 5; comp.connect(ac.destination);
    master = ac.createGain(); master.gain.value = 0.9; master.connect(comp);
    sfxBus = ac.createGain(); sfxBus.connect(master); musBus = ac.createGain(); musBus.connect(master);
    const len = ac.sampleRate, b = ac.createBuffer(1, len, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; noiseBuf = b;
    applyVolumes();
  } catch { ac = null; }
}
export function applyVolumes() { if (!ac) return; sfxBus.gain.value = save.opts.sfx; musBus.gain.value = save.opts.music * 0.5; }
export function setAudioActive(on: boolean) { active = on; if (!ac) return; if (on) void ac.resume(); else void ac.suspend(); }

function tone(f: number, dur: number, type: OscillatorType = 'square', vol = 0.18, slide = 0, delay = 0, bus?: GainNode) {
  if (!ac || !active) return; const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(bus ?? sfxBus); o.start(t); o.stop(t + dur + 0.05);
}
function noise(dur: number, vol = 0.2, freq = 2000, delay = 0, q = 0.7, type: BiquadFilterType = 'lowpass', slide = 0) {
  if (!ac || !active || !noiseBuf) return; const t = ac.currentTime + delay, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noiseBuf; s.playbackRate.value = 0.8 + Math.random() * 0.4; f.type = type; f.frequency.setValueAtTime(freq, t); if (slide) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur); f.Q.value = q;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f); f.connect(g); g.connect(sfxBus); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
}
/** limit how many physics sounds start inside one 60 ms window (a break makes dozens of hits) */
function room(): boolean { const now = performance.now(); if (now - hitT > 60) { hitT = now; hits = 0; } return ++hits <= 7; }

export function sfx(name: string, v = 1) {
  if (!ac) return;
  switch (name) {
    case 'click': tone(880, 0.05, 'square', 0.1); tone(1320, 0.06, 'square', 0.07, 0, 0.03); break;
    case 'back': tone(520, 0.07, 'square', 0.1); tone(340, 0.09, 'square', 0.09, 0, 0.05); break;
    case 'tick': tone(1500, 0.03, 'square', 0.06); break;
    case 'place': tone(440, 0.06, 'triangle', 0.16); tone(660, 0.08, 'triangle', 0.14, 0, 0.05); break;
    case 'lock': tone(740, 0.05, 'square', 0.12); tone(1100, 0.09, 'square', 0.1, 0, 0.04); break;
    case 'coin': tone(1320, 0.07, 'square', 0.12); tone(1980, 0.16, 'square', 0.1, 0, 0.06); break;
    case 'cue': { const a = 0.35 + 0.65 * Math.min(1, v); noise(0.05, 0.26 * a, 2600, 0, 5, 'bandpass'); tone(190, 0.09, 'sine', 0.3 * a, -60); tone(2100, 0.03, 'triangle', 0.1 * a); break; }
    case 'clack': { if (!room()) break; const a = Math.min(1, 0.15 + v * 0.12), f = 2300 + Math.random() * 1000; tone(f, 0.11, 'sine', 0.26 * a, -500); tone(f * 1.9, 0.06, 'triangle', 0.1 * a); noise(0.03, 0.2 * a, 4500, 0, 3, 'highpass'); break; }
    case 'rail': { if (!room()) break; const a = Math.min(1, 0.12 + v * 0.1); tone(140, 0.12, 'sine', 0.3 * a, -70); noise(0.08, 0.16 * a, 900, 0, 0.8, 'lowpass'); break; }
    case 'pocket': { const a = 0.5 + 0.5 * Math.min(1, v / 3); noise(0.16, 0.22 * a, 1500, 0, 1.6, 'bandpass', -900); tone(210, 0.22, 'sine', 0.28 * a, -110); tone(120, 0.3, 'sine', 0.2 * a, -40, 0.12); for (let i = 0; i < 3; i++) tone(900 + Math.random() * 500, 0.05, 'triangle', 0.07, 0, 0.1 + i * 0.07); break; }
    case 'break': noise(0.5, 0.34, 3000, 0, 0.8, 'lowpass', -2000); tone(90, 0.35, 'sine', 0.36, -40); break;
    case 'foul': tone(150, 0.2, 'sawtooth', 0.16); tone(110, 0.3, 'sawtooth', 0.16, 0, 0.14); break;
    case 'turn': tone(660, 0.07, 'triangle', 0.14); tone(990, 0.1, 'triangle', 0.12, 0, 0.06); break;
    case 'win': [523, 659, 784, 1047, 1319, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.18, 'square', 0.13, 0, i * 0.1)); break;
    case 'lose': [392, 349, 311, 262].forEach((f, i) => tone(f, 0.28, 'triangle', 0.18, 0, i * 0.2)); break;
    case 'buy': tone(988, 0.07, 'square', 0.12); tone(1319, 0.07, 'square', 0.12, 0, 0.07); tone(1760, 0.2, 'square', 0.12, 0, 0.14); break;
    case 'error': tone(180, 0.18, 'square', 0.14); tone(140, 0.22, 'square', 0.14, 0, 0.12); break;
    case 'level': [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.18, 0, i * 0.08)); tone(1568, 0.4, 'sine', 0.12, 0, 0.34); break;
    case 'power': tone(400, 0.3, 'sawtooth', 0.1, 900); tone(1200, 0.25, 'triangle', 0.12, 600, 0.1); break;
    case 'whoosh': noise(0.25, 0.14, 1200, 0, 0.7, 'bandpass', 2500); break;
    case 'tap': tone(1000, 0.03, 'sine', 0.06); break;
  }
}

/* ---- music: a soft lounge loop (minor ii-V-I style changes), electric-piano chords, bass, brushed hats ---- */
type Mood = 'menu' | 'game' | 'result';
let mood: Mood | null = null, timer = 0, step = 0, nextT = 0;
const PROG: [number, number[]][] = [[50, [0, 3, 7, 10]], [43, [0, 4, 7, 10]], [48, [0, 4, 7, 11]], [45, [0, 4, 7, 10]]]; // Dm7 G7 Cmaj7 A7 (midi roots)
const mf = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
export function startMusic(m: Mood) {
  if (!ac) return; if (mood === m) return; stopMusic(); mood = m; step = 0; nextT = ac.currentTime + 0.08;
  timer = window.setInterval(() => {
    if (!ac || !active || !mood) return;
    while (nextT < ac.currentTime + 0.25) { playStep(step, nextT, mood); step++; nextT += (60 / (mood === 'game' ? 96 : 104)) / 4; }
  }, 60);
}
export function stopMusic() { if (timer) clearInterval(timer); timer = 0; mood = null; }
function playStep(i: number, t: number, m: Mood) {
  if (!ac) return; const bar = Math.floor(i / 16) % 4, s = i % 16, [root, chord] = PROG[bar];
  const v = (f: number, d: number, type: OscillatorType, vol: number, att = 0.01) => { const o = ac!.createOscillator(), g = ac!.createGain(); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(musBus); o.start(t); o.stop(t + d + 0.05); };
  if (s === 0 || s === 10) v(mf(root - 12), 0.5, 'sine', 0.5);
  if (s === 6 && m !== 'result') v(mf(root - 12 + 7), 0.3, 'sine', 0.3);
  if (s === 0) for (const c of chord) { v(mf(root + 12 + c), 1.5, 'triangle', 0.07, 0.03); v(mf(root + 24 + c) * 1.002, 1.2, 'sine', 0.035, 0.03); }
  if (s === 8 && m !== 'game') for (const c of chord) v(mf(root + 12 + c), 0.6, 'triangle', 0.05, 0.02);
  if (s % 2 === 0 && noiseBuf) { const n = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter(); n.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = 8000; g.gain.setValueAtTime(s % 4 === 0 ? 0.07 : 0.04, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); n.connect(f); f.connect(g); g.connect(musBus); n.start(t); n.stop(t + 0.07); }
  const mel = [12, -1, 7, -1, 10, 7, -1, 3, 0, -1, 7, 10, -1, 12, 14, -1];
  if (m === 'menu' && mel[s] >= 0 && bar % 2 === 0) v(mf(root + 24 + mel[s] + (chord[1] === 4 ? 0 : 0)), 0.32, 'sine', 0.06, 0.02);
  if (s === 12 && noiseBuf) { const n = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter(); n.buffer = noiseBuf; f.type = 'bandpass'; f.frequency.value = 1800; g.gain.setValueAtTime(0.1, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1); n.connect(f); f.connect(g); g.connect(musBus); n.start(t); n.stop(t + 0.12); }
}
export function vibrate(ms: number) { if (save.opts.vibrate && (navigator as any).userActivation?.hasBeenActive !== false) try { navigator.vibrate?.(ms); } catch { /* ignore */ } }
