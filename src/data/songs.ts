import type { Song, SongNote, SongWave } from "@/types/game";

/* ------------------------------------------------------------------ */
/*  Generator lagu Future Keys                                         */
/*  Setiap lagu punya tempo, nada 4 jalur, suara, bass, dan melodi     */
/*  yang berbeda. Durasi 1–2 menit. Tidak ada sistem difficulty.       */
/* ------------------------------------------------------------------ */

type Style = "gentle" | "bouncy" | "lively";

type SongConfig = {
  id: string;
  title: string;
  tagline: string;
  icon: string;
  colors: [string, string];
  bpm: number;
  seconds: number; // target durasi
  seed: number;
  style: Style;
  wave: SongWave;
  lanePitches: [string, string, string, string];
  bass: string[];
};

type PhraseNote = { pos: number; lane: number };
type Bar = PhraseNote[];

// Posisi ketukan (0–3.5) di dalam satu bar 4/4.
const BAR_PATTERNS: Record<Style, number[][]> = {
  gentle: [[0, 1, 2, 3], [0, 1, 2, 3], [0, 1, 2], [0, 1, 2, 2.5, 3]],
  bouncy: [
    [0, 1, 2, 3],
    [0, 1, 2, 2.5, 3],
    [0, 0.5, 1, 2, 3],
    [0, 1, 1.5, 2, 3],
    [0, 1, 2, 3, 3.5],
  ],
  lively: [
    [0, 1, 2, 3],
    [0, 0.5, 1, 2, 2.5, 3],
    [0, 1, 1.5, 2, 2.5, 3],
    [0, 0.5, 1, 1.5, 2, 3],
    [0, 1, 2, 2.5, 3, 3.5],
  ],
};

const ENDING_PATTERNS: number[][] = [[0, 1, 2, 3], [0, 1, 2, 3], [0, 1, 2]];

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Pilih jalur berikutnya. Nada rapat (gap < 1 ketukan) hanya boleh pindah 1 jalur.
function nextLane(random: () => number, lane: number, gap: number) {
  const options = gap < 1 ? [-1, 1] : [-2, -1, -1, 1, 1, 2, 0];
  const step = options[Math.floor(random() * options.length)];
  let next = lane + step;
  if (next < 0 || next > 3) next = lane - step;
  if (next < 0 || next > 3) next = lane === 0 ? 1 : lane === 3 ? 2 : lane;
  return next;
}

function makeBar(
  random: () => number,
  patterns: number[][],
  startLane: number,
  gapIn: number,
): Bar {
  const pattern = patterns[Math.floor(random() * patterns.length)];
  let lane = startLane;
  let prev = -gapIn;
  return pattern.map((pos) => {
    lane = nextLane(random, lane, pos - prev);
    prev = pos;
    return { pos, lane };
  });
}

function makePhrase(
  random: () => number,
  patterns: number[][],
  startLane: number,
  gapIn: number,
): Bar[] {
  const bars: Bar[] = [];
  let lane = startLane;
  let gap = gapIn;
  for (let b = 0; b < 4; b++) {
    const bar = makeBar(random, b === 3 ? ENDING_PATTERNS : patterns, lane, gap);
    bars.push(bar);
    lane = bar[bar.length - 1].lane;
    gap = 4 - bar[bar.length - 1].pos;
  }
  return bars;
}

// Variasi frasa: ulangi frasa tetapi bar terakhir dibuat baru.
function varyPhrase(random: () => number, phrase: Bar[]): Bar[] {
  const copy = phrase.map((bar) => bar.map((n) => ({ ...n })));
  const prevBar = copy[2];
  const last = prevBar[prevBar.length - 1];
  copy[3] = makeBar(random, ENDING_PATTERNS, last.lane, 4 - last.pos);
  return copy;
}

const SECTION_ORDER = ["A", "A", "B", "A", "C", "C", "B", "A"];

function buildSong(cfg: SongConfig): Song {
  const random = mulberry32(cfg.seed);
  const patterns = BAR_PATTERNS[cfg.style];

  // Jumlah bar (setelah 1 bar intro) agar durasi mendekati target.
  const lastBeatTarget = ((cfg.seconds - 1.1) * cfg.bpm) / 60;
  const totalBars = Math.round((lastBeatTarget - 4) / 4) + 1;
  const melodyBars = totalBars - 1;
  const phraseCount = Math.ceil(melodyBars / 4);

  const base: Record<string, Bar[]> = {};
  const varied: Record<string, Bar[]> = {};
  const seen: Record<string, number> = {};
  const phrases: Bar[][] = [];

  for (let i = 0; i < phraseCount; i++) {
    const letter = SECTION_ORDER[i % SECTION_ORDER.length];
    if (!base[letter]) {
      base[letter] = makePhrase(random, patterns, Math.floor(random() * 4), 4);
      varied[letter] = varyPhrase(random, base[letter]);
    }
    const count = seen[letter] ?? 0;
    seen[letter] = count + 1;
    phrases.push(count % 2 === 0 ? base[letter] : varied[letter]);
  }

  let notes: SongNote[] = [];
  for (let bar = 0; bar < melodyBars; bar++) {
    const phrase = phrases[Math.floor(bar / 4)];
    for (const n of phrase[bar % 4]) {
      notes.push({
        beat: 4 + bar * 4 + n.pos,
        lane: n.lane,
        pitch: cfg.lanePitches[n.lane],
      });
    }
  }

  // Nada penutup panjang di jalur pertama.
  const endBeat = 4 + melodyBars * 4;
  notes.push({ beat: endBeat, lane: 0, pitch: cfg.lanePitches[0] });

  // Nada emas (pemicu kuis): 3–4 kali per lagu, tersebar merata.
  const goldenCount = cfg.seconds >= 95 ? 4 : 3;
  const goldenBeats: number[] = [];
  for (let i = 1; i <= goldenCount; i++) {
    const target = 4 + (melodyBars * 4 * i) / (goldenCount + 1);
    let best = -1;
    let bestDiff = Infinity;
    notes.forEach((note, index) => {
      if (note.beat % 1 !== 0 || note.beat >= endBeat - 8) return;
      const diff = Math.abs(note.beat - target);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = index;
      }
    });
    if (best >= 0) {
      notes[best] = { ...notes[best], isQuestion: true };
      goldenBeats.push(notes[best].beat);
    }
  }

  // Beri jeda 1 ketukan setelah nada emas agar anak sempat bersiap.
  notes = notes.filter(
    (note) =>
      !goldenBeats.some(
        (g) => note.beat > g && note.beat <= g + 1 && !note.isQuestion,
      ),
  );

  const lastBeat = notes[notes.length - 1].beat;

  return {
    id: cfg.id,
    title: cfg.title,
    tagline: cfg.tagline,
    icon: cfg.icon,
    colors: cfg.colors,
    bpm: cfg.bpm,
    duration: Math.round((lastBeat * 60) / cfg.bpm + 1.1),
    wave: cfg.wave,
    lanePitches: cfg.lanePitches,
    bass: cfg.bass,
    notes,
  };
}

const CONFIGS: SongConfig[] = [
  {
    id: "song-01",
    title: "Sunny Morning",
    tagline: "Pagi cerah penuh semangat",
    icon: "☀️",
    colors: ["#fbbf24", "#f97316"],
    bpm: 92,
    seconds: 64,
    seed: 101,
    style: "gentle",
    wave: "triangle",
    lanePitches: ["C4", "E4", "G4", "C5"],
    bass: ["C2", "G2", "A2", "F2"],
  },
  {
    id: "song-02",
    title: "Happy Playground",
    tagline: "Main bareng di taman bermain",
    icon: "🎠",
    colors: ["#f472b6", "#a855f7"],
    bpm: 100,
    seconds: 74,
    seed: 202,
    style: "gentle",
    wave: "sine",
    lanePitches: ["D4", "F#4", "A4", "D5"],
    bass: ["D2", "A2", "B2", "G2"],
  },
  {
    id: "song-03",
    title: "Rainbow Road",
    tagline: "Melompat di atas pelangi",
    icon: "🌈",
    colors: ["#34d399", "#3b82f6"],
    bpm: 104,
    seconds: 84,
    seed: 303,
    style: "bouncy",
    wave: "triangle",
    lanePitches: ["E4", "G#4", "B4", "E5"],
    bass: ["E2", "B2", "C#3", "A2"],
  },
  {
    id: "song-04",
    title: "Magic Garden",
    tagline: "Taman ajaib penuh bunga",
    icon: "🌸",
    colors: ["#fb7185", "#c084fc"],
    bpm: 96,
    seconds: 90,
    seed: 404,
    style: "bouncy",
    wave: "sine",
    lanePitches: ["F4", "A4", "C5", "F5"],
    bass: ["F2", "C3", "D3", "A#2"],
  },
  {
    id: "song-05",
    title: "Candy Parade",
    tagline: "Pesta permen yang manis",
    icon: "🍭",
    colors: ["#f472b6", "#fb923c"],
    bpm: 108,
    seconds: 96,
    seed: 505,
    style: "bouncy",
    wave: "square",
    lanePitches: ["G4", "B4", "D5", "G5"],
    bass: ["G2", "D3", "E3", "C3"],
  },
  {
    id: "song-06",
    title: "River Adventure",
    tagline: "Petualangan menyusuri sungai",
    icon: "🌊",
    colors: ["#38bdf8", "#2563eb"],
    bpm: 100,
    seconds: 102,
    seed: 606,
    style: "bouncy",
    wave: "triangle",
    lanePitches: ["A3", "C4", "E4", "A4"],
    bass: ["A2", "E2", "F2", "G2"],
  },
  {
    id: "song-07",
    title: "Jungle Jump",
    tagline: "Lompat-lompat di hutan",
    icon: "🐒",
    colors: ["#4ade80", "#16a34a"],
    bpm: 112,
    seconds: 88,
    seed: 707,
    style: "lively",
    wave: "square",
    lanePitches: ["C4", "D4", "G4", "A4"],
    bass: ["C2", "F2", "G2", "C2"],
  },
  {
    id: "song-08",
    title: "Starry Journey",
    tagline: "Terbang menembus bintang",
    icon: "🌟",
    colors: ["#818cf8", "#7c3aed"],
    bpm: 104,
    seconds: 108,
    seed: 808,
    style: "lively",
    wave: "sine",
    lanePitches: ["D4", "E4", "A4", "B4"],
    bass: ["D2", "G2", "A2", "D2"],
  },
  {
    id: "song-09",
    title: "Ocean Dance",
    tagline: "Menari bersama lumba-lumba",
    icon: "🐬",
    colors: ["#22d3ee", "#0ea5e9"],
    bpm: 110,
    seconds: 112,
    seed: 909,
    style: "lively",
    wave: "triangle",
    lanePitches: ["E4", "G4", "A4", "D5"],
    bass: ["A2", "D2", "E2", "A2"],
  },
  {
    id: "song-10",
    title: "Future Legend",
    tagline: "Jadi legenda masa depan",
    icon: "👑",
    colors: ["#facc15", "#ef4444"],
    bpm: 116,
    seconds: 116,
    seed: 1010,
    style: "lively",
    wave: "triangle",
    lanePitches: ["F4", "G4", "C5", "D5"],
    bass: ["F2", "G2", "A2", "C3"],
  },
];

export const songs: Song[] = CONFIGS.map(buildSong);