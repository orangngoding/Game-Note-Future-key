export type QuestionType =
  | "multiple-choice"
  | "sentence-builder"
  | "complete-sentence"
  | "true-false";

export type EnglishQuestion = {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[];
  correctAnswer: string;
  // Penjelasan dalam bahasa Inggris.
  explanation: string;
  // Terjemahan / arti soal dalam bahasa Indonesia (ditampilkan di bawah soal).
  translation?: string;
  // Petunjuk bahasa Indonesia, muncul setelah anak salah menjawab.
  hint?: string;
  // Penjelasan bahasa Indonesia, muncul setelah anak menjawab benar.
  explanationId?: string;
};

export type SongWave = "triangle" | "sine" | "square";

// Tipe data untuk setiap not di dalam lagu.
export type SongNote = {
  beat: number;
  lane: number;
  pitch: string;
  isQuestion?: boolean;
};

// Tipe data untuk satu lagu Future Keys (tanpa sistem difficulty).
export type Song = {
  id: string;
  title: string;
  tagline: string;
  icon: string;
  colors: [string, string];
  bpm: number;
  // Perkiraan durasi lagu dalam detik (antara 60 dan 120).
  duration: number;
  // Jenis suara melodi, berbeda-beda tiap lagu.
  wave: SongWave;
  // Nada untuk 4 jalur (A, S, K, L), berbeda-beda tiap lagu.
  lanePitches: [string, string, string, string];
  // Nada bass iringan, berganti tiap bar (4 ketukan).
  bass: string[];
  notes: SongNote[];
};