import type { EnglishQuestion } from "@/types/game";

/* ------------------------------------------------------------------ */
/*  Bank soal "Talking about Future Activities using WILL"             */
/*  Soal dibuat dari kombinasi subjek × kegiatan × keterangan waktu    */
/*  sehingga jumlahnya ratusan dan selalu bervariasi. Semua soal       */
/*  punya terjemahan, petunjuk, dan penjelasan bahasa Indonesia.       */
/* ------------------------------------------------------------------ */

type Subject = { cap: string; low: string; id: string };
type Activity = {
  v: string;
  s: string;
  past: string;
  ing: string;
  rest: string;
  id: string;
};
type TimeWord = { en: string; id: string };

const SUBJECTS: Subject[] = [
  { cap: "I", low: "I", id: "saya" },
  { cap: "You", low: "you", id: "kamu" },
  { cap: "We", low: "we", id: "kita" },
  { cap: "They", low: "they", id: "mereka" },
  { cap: "He", low: "he", id: "dia (laki-laki)" },
  { cap: "She", low: "she", id: "dia (perempuan)" },
  { cap: "Rina", low: "Rina", id: "Rina" },
  { cap: "Budi", low: "Budi", id: "Budi" },
  { cap: "My mother", low: "my mother", id: "ibu saya" },
  { cap: "My father", low: "my father", id: "ayah saya" },
  { cap: "Our teacher", low: "our teacher", id: "guru kami" },
  { cap: "My friends", low: "my friends", id: "teman-teman saya" },
  { cap: "The students", low: "the students", id: "para siswa" },
];

const ACTIVITIES: Activity[] = [
  { v: "play", s: "plays", past: "played", ing: "playing", rest: "football", id: "bermain sepak bola" },
  { v: "visit", s: "visits", past: "visited", ing: "visiting", rest: "the museum", id: "mengunjungi museum" },
  { v: "study", s: "studies", past: "studied", ing: "studying", rest: "English", id: "belajar bahasa Inggris" },
  { v: "help", s: "helps", past: "helped", ing: "helping", rest: "the teacher", id: "membantu guru" },
  { v: "watch", s: "watches", past: "watched", ing: "watching", rest: "a movie", id: "menonton film" },
  { v: "read", s: "reads", past: "read", ing: "reading", rest: "a book", id: "membaca buku" },
  { v: "clean", s: "cleans", past: "cleaned", ing: "cleaning", rest: "the classroom", id: "membersihkan kelas" },
  { v: "buy", s: "buys", past: "bought", ing: "buying", rest: "a new bag", id: "membeli tas baru" },
  { v: "cook", s: "cooks", past: "cooked", ing: "cooking", rest: "fried rice", id: "memasak nasi goreng" },
  { v: "go", s: "goes", past: "went", ing: "going", rest: "to the beach", id: "pergi ke pantai" },
  { v: "wash", s: "washes", past: "washed", ing: "washing", rest: "the car", id: "mencuci mobil" },
  { v: "write", s: "writes", past: "wrote", ing: "writing", rest: "a letter", id: "menulis surat" },
  { v: "listen", s: "listens", past: "listened", ing: "listening", rest: "to music", id: "mendengarkan musik" },
  { v: "ride", s: "rides", past: "rode", ing: "riding", rest: "a bike", id: "naik sepeda" },
  { v: "draw", s: "draws", past: "drew", ing: "drawing", rest: "a picture", id: "menggambar sebuah gambar" },
  { v: "feed", s: "feeds", past: "fed", ing: "feeding", rest: "the cat", id: "memberi makan kucing" },
  { v: "water", s: "waters", past: "watered", ing: "watering", rest: "the plants", id: "menyiram tanaman" },
  { v: "do", s: "does", past: "did", ing: "doing", rest: "the homework", id: "mengerjakan PR" },
  { v: "sing", s: "sings", past: "sang", ing: "singing", rest: "a song", id: "menyanyikan sebuah lagu" },
  { v: "bake", s: "bakes", past: "baked", ing: "baking", rest: "a cake", id: "memanggang kue" },
  { v: "meet", s: "meets", past: "met", ing: "meeting", rest: "new friends", id: "bertemu teman baru" },
  { v: "swim", s: "swims", past: "swam", ing: "swimming", rest: "in the pool", id: "berenang di kolam" },
  { v: "take", s: "takes", past: "took", ing: "taking", rest: "photos", id: "mengambil foto" },
  { v: "visit", s: "visits", past: "visited", ing: "visiting", rest: "the zoo", id: "mengunjungi kebun binatang" },
];

const FUTURE_TIMES: TimeWord[] = [
  { en: "tomorrow", id: "besok" },
  { en: "tonight", id: "nanti malam" },
  { en: "next week", id: "minggu depan" },
  { en: "next month", id: "bulan depan" },
  { en: "next Sunday", id: "hari Minggu depan" },
  { en: "this afternoon", id: "sore ini" },
  { en: "after school", id: "sepulang sekolah" },
  { en: "next year", id: "tahun depan" },
  { en: "tomorrow morning", id: "besok pagi" },
  { en: "this weekend", id: "akhir pekan ini" },
  { en: "next Saturday", id: "hari Sabtu depan" },
  { en: "in two days", id: "dua hari lagi" },
];

const PAST_TIMES: TimeWord[] = [
  { en: "yesterday", id: "kemarin" },
  { en: "last week", id: "minggu lalu" },
  { en: "last night", id: "tadi malam" },
  { en: "two days ago", id: "dua hari yang lalu" },
  { en: "last month", id: "bulan lalu" },
  { en: "last year", id: "tahun lalu" },
];

/* ------------------------------ helpers ------------------------------ */

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(20261021);
const pick = <T,>(items: T[]): T => items[Math.floor(rng() * items.length)];

function shuffleWith<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const cap1 = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const uniq = (items: string[]) => Array.from(new Set(items));

const enPos = (s: Subject, a: Activity, t: TimeWord) =>
  `${s.cap} will ${a.v} ${a.rest} ${t.en}.`;
const enNeg = (s: Subject, a: Activity, t: TimeWord) =>
  `${s.cap} will not ${a.v} ${a.rest} ${t.en}.`;
const idPos = (s: Subject, a: Activity, t: TimeWord) =>
  `${cap1(t.id)} ${s.id} akan ${a.id}.`;
const idNeg = (s: Subject, a: Activity, t: TimeWord) =>
  `${cap1(t.id)} ${s.id} tidak akan ${a.id}.`;
const idAsk = (s: Subject, a: Activity, t: TimeWord) =>
  `Apakah ${s.id} akan ${a.id} ${t.id}?`;

const RULE_ID =
  "Rumus: Subject + will + kata kerja dasar (V1). Will artinya “akan”.";

/* ------------------------- generated questions ------------------------- */

const generated: EnglishQuestion[] = [];
let counter = 0;
const add = (q: Omit<EnglishQuestion, "id">) => {
  counter += 1;
  generated.push({ id: `g${counter}`, ...q });
};

for (const a of ACTIVITIES) {
  // 1 & 2 — lengkapi dengan "will"
  for (const distractors of [
    ["was", "did", "has"],
    ["was", "did", "had"],
  ]) {
    const s = pick(SUBJECTS);
    const t = pick(FUTURE_TIMES);
    add({
      type: "complete-sentence",
      question: `${s.cap} ___ ${a.v} ${a.rest} ${t.en}.`,
      options: ["will", ...distractors],
      correctAnswer: "will",
      translation: idPos(s, a, t),
      hint: `Ada kata “${t.en}” (${t.id}), artinya kegiatan di masa depan. Pakai kata “akan” dalam bahasa Inggris: will.`,
      explanation: "Use will for future activities. Will + base verb.",
      explanationId: `Kegiatan di masa depan memakai will. Kalimat benar: “${enPos(s, a, t)}” ${RULE_ID}`,
    });
  }

  // 3 & 4 — bentuk kata kerja setelah will
  for (let i = 0; i < 2; i++) {
    const s = pick(SUBJECTS);
    const t = pick(FUTURE_TIMES);
    add({
      type: "complete-sentence",
      question: `${s.cap} will ___ ${a.rest} ${t.en}.`,
      options: uniq([a.v, a.s, a.past, a.ing]),
      correctAnswer: a.v,
      translation: idPos(s, a, t),
      hint: "Setelah will, pakai kata kerja bentuk dasar: tanpa -s, tanpa -ed, tanpa -ing.",
      explanation: `After will, use the base verb: ${a.v}.`,
      explanationId: `Setelah will selalu kata kerja dasar (V1), yaitu “${a.v}”, bukan “${a.s}”, “${a.past}”, atau “${a.ing}”. Jadi: ${enPos(s, a, t)}`,
    });
  }

  // 5 & 6 — pilih kalimat yang benar
  for (let i = 0; i < 2; i++) {
    const s = pick(SUBJECTS);
    const t = pick(FUTURE_TIMES);
    const correct = enPos(s, a, t);
    const wrongs = shuffleWith(
      uniq([
        `${s.cap} will ${a.s} ${a.rest} ${t.en}.`,
        `${s.cap} will ${a.ing} ${a.rest} ${t.en}.`,
        `${s.cap} will ${a.past} ${a.rest} ${t.en}.`,
        `${s.cap} ${a.past} ${a.rest} ${t.en}.`,
        `${s.cap} will to ${a.v} ${a.rest} ${t.en}.`,
      ]).filter((w) => w !== correct),
      rng,
    ).slice(0, 3);
    add({
      type: "multiple-choice",
      question: `Choose the correct sentence: “${idPos(s, a, t)}”`,
      options: [correct, ...wrongs],
      correctAnswer: correct,
      translation: "Pilih kalimat bahasa Inggris yang artinya sama dan tata bahasanya benar.",
      hint: "Cari kalimat yang memakai will + kata kerja dasar (tanpa -s, -ed, -ing, dan tanpa to).",
      explanation: "Use subject + will + base verb.",
      explanationId: `Jawaban benar: “${correct}”. ${RULE_ID}`,
    });
  }

  // 7, 8, 9 — benar atau salah
  {
    const s = pick(SUBJECTS);
    const t = pick(FUTURE_TIMES);
    add({
      type: "true-false",
      question: `“${enPos(s, a, t)}” Is this correct?`,
      options: ["True", "False"],
      correctAnswer: "True",
      translation: `Apakah kalimat ini benar? (${idPos(s, a, t)})`,
      hint: "Periksa: ada will, lalu kata kerja dasar tanpa tambahan.",
      explanation: "Subject + will + base verb is correct.",
      explanationId: `Benar! Kalimat ini sudah tepat: will + ${a.v}. ${RULE_ID}`,
    });
  }
  {
    const kinds = shuffleWith(
      [
        { bad: a.s, id: `Setelah will pakai kata kerja dasar: “${a.v}”, bukan “${a.s}”.`, en: `After will, use ${a.v}, not ${a.s}.` },
        { bad: a.ing, id: `Setelah will pakai kata kerja dasar: “${a.v}”, bukan “${a.ing}”.`, en: `After will, use ${a.v}, not ${a.ing}.` },
        { bad: a.past, id: `Will untuk masa depan, jadi jangan pakai bentuk lampau “${a.past}”. Pakai “${a.v}”.`, en: `Do not use the past form ${a.past} after will.` },
      ].filter((k) => k.bad !== a.v),
      rng,
    );
    for (const kind of kinds.slice(0, 2)) {
      const s = pick(SUBJECTS);
      const t = pick(FUTURE_TIMES);
      add({
        type: "true-false",
        question: `“${s.cap} will ${kind.bad} ${a.rest} ${t.en}.” Is this correct?`,
        options: ["True", "False"],
        correctAnswer: "False",
        translation: "Apakah kalimat ini benar? Cari kesalahannya!",
        hint: "Lihat kata kerja setelah will. Apakah sudah bentuk dasar?",
        explanation: kind.en,
        explanationId: `Salah. ${kind.id} Kalimat benar: “${enPos(s, a, t)}”`,
      });
    }
  }

  // 10 & 11 — susun kalimat positif
  for (let i = 0; i < 2; i++) {
    const s = pick(SUBJECTS);
    const t = pick(FUTURE_TIMES);
    add({
      type: "sentence-builder",
      question: "Arrange the words into a correct sentence.",
      options: [s.cap, "will", a.v, a.rest, t.en],
      correctAnswer: enPos(s, a, t),
      translation: `Susun menjadi: “${idPos(s, a, t)}”`,
      hint: "Urutan: pelaku (Subject) → will → kata kerja → kegiatan → waktu.",
      explanation: "Order: subject + will + base verb + other information + time.",
      explanationId: `Urutan yang benar: “${enPos(s, a, t)}” — pelaku, will, kata kerja, lalu keterangan.`,
    });
  }

  // 12 — negatif (pilihan ganda)
  {
    const s = pick(SUBJECTS);
    const t = pick(FUTURE_TIMES);
    const correct = enNeg(s, a, t);
    const wrongs = shuffleWith(
      [
        `${s.cap} not will ${a.v} ${a.rest} ${t.en}.`,
        `${s.cap} will not ${a.s} ${a.rest} ${t.en}.`,
        `${s.cap} will no ${a.v} ${a.rest} ${t.en}.`,
        `${s.cap} will not ${a.ing} ${a.rest} ${t.en}.`,
      ],
      rng,
    ).slice(0, 3);
    add({
      type: "multiple-choice",
      question: `Choose the negative sentence: “${idNeg(s, a, t)}”`,
      options: [correct, ...wrongs],
      correctAnswer: correct,
      translation: "Pilih kalimat negatif (tidak akan).",
      hint: "Kalimat negatif: will + not + kata kerja dasar. Letak “not” setelah will.",
      explanation: "Negative: will not (won't) + base verb.",
      explanationId: `Negatif memakai will not + V1. Jawaban: “${correct}”`,
    });
  }

  // 13 — negatif (lengkapi)
  {
    const s = pick(SUBJECTS);
    const t = pick(FUTURE_TIMES);
    add({
      type: "complete-sentence",
      question: `${s.cap} will ___ ${a.v} ${a.rest} ${t.en}.`,
      options: ["not", "no", "don't", "doesn't"],
      correctAnswer: "not",
      translation: idNeg(s, a, t),
      hint: "Artinya “tidak akan”. Kata “tidak” dalam kalimat will adalah not.",
      explanation: "Use will not + base verb for negative future sentences.",
      explanationId: `Will + not = tidak akan. Bisa dipersingkat jadi won't. Contoh: “${enNeg(s, a, t)}”`,
    });
  }

  // 14 & 15 — susun kalimat tanya
  for (let i = 0; i < 2; i++) {
    const s = pick(SUBJECTS);
    const t = pick(FUTURE_TIMES);
    add({
      type: "sentence-builder",
      question: "Arrange the words into a correct question.",
      options: ["Will", s.low, a.v, a.rest, t.en],
      correctAnswer: `Will ${s.low} ${a.v} ${a.rest} ${t.en}?`,
      translation: `Susun menjadi pertanyaan: “${idAsk(s, a, t)}”`,
      hint: "Kalimat tanya diawali dengan Will, lalu pelaku, lalu kata kerja.",
      explanation: "Question: Will + subject + base verb ...?",
      explanationId: `Kalimat tanya: Will + Subject + V1. Jadi: “Will ${s.low} ${a.v} ${a.rest} ${t.en}?”`,
    });
  }

  // 16 — pilih kalimat tanya
  {
    const s = pick(SUBJECTS);
    const t = pick(FUTURE_TIMES);
    const correct = `Will ${s.low} ${a.v} ${a.rest} ${t.en}?`;
    const wrongs = shuffleWith(
      uniq([
        `${s.cap} will ${a.v} ${a.rest} ${t.en}?`,
        `Does ${s.low} will ${a.v} ${a.rest} ${t.en}?`,
        `Will ${s.low} ${a.s} ${a.rest} ${t.en}?`,
        `Will ${s.low} ${a.ing} ${a.rest} ${t.en}?`,
      ]).filter((w) => w !== correct),
      rng,
    ).slice(0, 3);
    add({
      type: "multiple-choice",
      question: `Choose the correct question: “${idAsk(s, a, t)}”`,
      options: [correct, ...wrongs],
      correctAnswer: correct,
      translation: "Pilih kalimat tanya yang benar.",
      hint: "Kalimat tanya dimulai dengan Will, bukan dengan pelaku.",
      explanation: "Put will at the beginning of the question.",
      explanationId: `Untuk bertanya, will dipindah ke depan: “${correct}”`,
    });
  }

  // 17 & 18 — terjemahan Indonesia → Inggris
  for (let i = 0; i < 2; i++) {
    const s = pick(SUBJECTS);
    const t = pick(FUTURE_TIMES);
    let s2 = pick(SUBJECTS);
    while (s2.cap === s.cap) s2 = pick(SUBJECTS);
    let a2 = pick(ACTIVITIES);
    while (a2.rest === a.rest) a2 = pick(ACTIVITIES);
    const pt = pick(PAST_TIMES);
    const correct = enPos(s, a, t);
    add({
      type: "multiple-choice",
      question: `Translate: “${idPos(s, a, t)}”`,
      options: [
        correct,
        `${s.cap} ${a.past} ${a.rest} ${pt.en}.`,
        enPos(s2, a, t),
        `${s.cap} will ${a2.v} ${a2.rest} ${t.en}.`,
      ],
      correctAnswer: correct,
      translation: "Pilih terjemahan bahasa Inggris yang paling tepat.",
      hint: "Cocokkan pelaku, kegiatan, dan waktunya. “Akan” = will.",
      explanation: "Match the subject, activity, and time.",
      explanationId: `Terjemahan yang tepat: “${correct}”`,
    });
  }

  // 19 — arti kalimat (Inggris → Indonesia)
  {
    const s = pick(SUBJECTS);
    const t = pick(FUTURE_TIMES);
    let t2 = pick(FUTURE_TIMES);
    while (t2.en === t.en) t2 = pick(FUTURE_TIMES);
    let a2 = pick(ACTIVITIES);
    while (a2.rest === a.rest) a2 = pick(ACTIVITIES);
    const pt = pick(PAST_TIMES);
    const correct = idPos(s, a, t);
    add({
      type: "multiple-choice",
      question: `What does this sentence mean? “${enPos(s, a, t)}”`,
      options: [
        correct,
        idPos(s, a, t2),
        idPos(s, a2, t),
        `${cap1(pt.id)} ${s.id} ${a.id}.`,
      ],
      correctAnswer: correct,
      translation: "Pilih arti kalimat yang benar dalam bahasa Indonesia.",
      hint: "Ingat: will = akan, jadi kegiatannya belum terjadi.",
      explanation: "Will talks about future activities.",
      explanationId: `Artinya: “${correct}”`,
    });
  }

  // 20 & 21 — jawaban singkat
  {
    const t = pick(FUTURE_TIMES);
    add({
      type: "complete-sentence",
      question: `“Will you ${a.v} ${a.rest} ${t.en}?” “Yes, I ___.”`,
      options: ["will", "do", "am", "did"],
      correctAnswer: "will",
      translation: `Kamu akan ${a.id} ${t.id}? Ya, saya akan.`,
      hint: "Pertanyaan memakai Will, jawabannya juga memakai will.",
      explanation: "Answer Will-questions with will.",
      explanationId: "Jawaban singkat mengikuti kata pertanyaan: Will you ...? → Yes, I will.",
    });
  }
  {
    const t = pick(FUTURE_TIMES);
    add({
      type: "complete-sentence",
      question: `“Will you ${a.v} ${a.rest} ${t.en}?” “No, I ___.”`,
      options: ["won't", "don't", "didn't", "wasn't"],
      correctAnswer: "won't",
      translation: `Kamu akan ${a.id} ${t.id}? Tidak, saya tidak akan.`,
      hint: "Jawaban “tidak” untuk will adalah won't (will not).",
      explanation: "Won't is the short form of will not.",
      explanationId: "No, I won't. = No, I will not. (Tidak, saya tidak akan.)",
    });
  }
}

// Soal kata keterangan waktu masa depan.
for (const t of FUTURE_TIMES) {
  for (let i = 0; i < 2; i++) {
    const pasts = shuffleWith(PAST_TIMES, rng).slice(0, 3).map((p) => p.en);
    add({
      type: "multiple-choice",
      question: "Which time expression goes with will (future)?",
      options: [t.en, ...pasts],
      correctAnswer: t.en,
      translation: "Pilih kata waktu yang menunjukkan masa depan.",
      hint: "Kata waktu masa depan: tomorrow, next, tonight, in ... days.",
      explanation: `${t.en} means the activity has not happened yet.`,
      explanationId: `“${t.en}” artinya “${t.id}”, jadi kegiatannya belum terjadi. Cocok dipakai dengan will.`,
    });
  }
}

/* ---------------------- soal konsep buatan tangan ---------------------- */

const core: EnglishQuestion[] = [
  {
    id: "c1",
    type: "multiple-choice",
    question: "What will you do tomorrow?",
    options: ["I will play football.", "I played football yesterday.", "I playing football.", "I plays football."],
    correctAnswer: "I will play football.",
    translation: "Apa yang akan kamu lakukan besok?",
    hint: "Cari jawaban yang memakai will + kata kerja dasar.",
    explanation: "Use will + base verb to talk about future activities.",
    explanationId: "Untuk kegiatan besok, pakai will + kata kerja dasar: I will play football.",
  },
  {
    id: "c2",
    type: "true-false",
    question: "“I will goes to school tomorrow.” Is this correct?",
    options: ["True", "False"],
    correctAnswer: "False",
    translation: "Apakah kalimat ini benar?",
    hint: "Lihat kata kerja setelah will.",
    explanation: "After will, use the base verb: go, not goes.",
    explanationId: "Salah. Setelah will pakai kata kerja dasar “go”, bukan “goes”.",
  },
  {
    id: "c3",
    type: "multiple-choice",
    question: "Which sentence is negative?",
    options: ["I will not be late.", "I will be late.", "I am late yesterday.", "I was not late yesterday."],
    correctAnswer: "I will not be late.",
    translation: "Kalimat mana yang negatif (tentang masa depan)?",
    hint: "Cari will + not.",
    explanation: "Use will not + base verb to make a negative future sentence.",
    explanationId: "Negatif masa depan: will not + V1. I will not be late = Saya tidak akan terlambat.",
  },
  {
    id: "c4",
    type: "multiple-choice",
    question: "What is the short form of 'will not'?",
    options: ["won't", "wouldn't", "didn't", "isn't"],
    correctAnswer: "won't",
    translation: "Apa singkatan dari will not?",
    hint: "Bunyinya “wont”.",
    explanation: "Will not can be shortened to won't.",
    explanationId: "Will not disingkat menjadi won't.",
  },
  {
    id: "c5",
    type: "true-false",
    question: "“He will study tonight.” talks about the future.",
    options: ["True", "False"],
    correctAnswer: "True",
    translation: "Apakah kalimat ini membicarakan masa depan?",
    hint: "Perhatikan will dan tonight.",
    explanation: "Will and tonight indicate a future activity.",
    explanationId: "Benar. Will dan tonight (nanti malam) menunjukkan masa depan.",
  },
  {
    id: "c6",
    type: "multiple-choice",
    question: "When do we use will?",
    options: [
      "To talk about future activities",
      "To talk about yesterday",
      "To talk about things happening now",
      "To talk about old habits",
    ],
    correctAnswer: "To talk about future activities",
    translation: "Kapan kita memakai will?",
    hint: "Will artinya “akan”.",
    explanation: "We use will for future activities, plans, and promises.",
    explanationId: "Will dipakai untuk kegiatan, rencana, dan janji di masa depan.",
  },
  {
    id: "c7",
    type: "multiple-choice",
    question: "Which word form comes after will?",
    options: ["Base verb (V1)", "Verb + -ed", "Verb + -ing", "Verb + -s"],
    correctAnswer: "Base verb (V1)",
    translation: "Bentuk kata kerja apa yang dipakai setelah will?",
    hint: "Kata kerja dasar = tanpa tambahan apa pun.",
    explanation: "Always use the base verb after will.",
    explanationId: "Setelah will selalu kata kerja dasar (V1): will play, will go, will study.",
  },
  {
    id: "c8",
    type: "multiple-choice",
    question: "“I'll” is the short form of ...",
    options: ["I will", "I am", "I have", "I did"],
    correctAnswer: "I will",
    translation: "“I'll” adalah singkatan dari ...",
    hint: "'ll berasal dari will.",
    explanation: "'ll is the short form of will: I'll = I will.",
    explanationId: "I'll = I will. You'll = You will. She'll = She will.",
  },
  {
    id: "c9",
    type: "complete-sentence",
    question: "Look at the dark clouds! It ___ rain soon.",
    options: ["will", "did", "was", "has"],
    correctAnswer: "will",
    translation: "Lihat awan gelap itu! Sebentar lagi akan hujan.",
    hint: "Hujan belum turun, jadi masa depan.",
    explanation: "Use will for predictions about the future.",
    explanationId: "Will juga dipakai untuk menebak/prediksi masa depan: It will rain.",
  },
  {
    id: "c10",
    type: "complete-sentence",
    question: "I ___ help you with your homework. I promise!",
    options: ["will", "did", "was", "am"],
    correctAnswer: "will",
    translation: "Aku akan membantu PR-mu. Aku janji!",
    hint: "Janji adalah sesuatu yang akan dilakukan nanti.",
    explanation: "Use will for promises.",
    explanationId: "Will dipakai untuk janji: I will help you.",
  },
  {
    id: "c11",
    type: "complete-sentence",
    question: "We ___ have a picnic next Sunday.",
    options: ["will", "did", "were", "has"],
    correctAnswer: "will",
    translation: "Kita akan piknik hari Minggu depan.",
    hint: "“Next Sunday” = Minggu depan.",
    explanation: "Next Sunday is in the future, so use will.",
    explanationId: "Next Sunday adalah masa depan, jadi pakai will.",
  },
  {
    id: "c12",
    type: "complete-sentence",
    question: "They ___ come to school tomorrow. (negative)",
    options: ["won't", "don't", "didn't", "aren't"],
    correctAnswer: "won't",
    translation: "Mereka tidak akan datang ke sekolah besok.",
    hint: "Negatif dari will adalah won't.",
    explanation: "Won't = will not.",
    explanationId: "They won't come = They will not come (mereka tidak akan datang).",
  },
  {
    id: "c13",
    type: "sentence-builder",
    question: "Arrange the words into a correct sentence.",
    options: ["tomorrow", "will", "It", "rain"],
    correctAnswer: "It will rain tomorrow.",
    translation: "Susun menjadi: “Besok akan hujan.”",
    hint: "Mulai dengan It, lalu will.",
    explanation: "Subject + will + base verb + time.",
    explanationId: "Urutan: It (pelaku) + will + rain + tomorrow.",
  },
  {
    id: "c14",
    type: "sentence-builder",
    question: "Arrange the words into a correct sentence.",
    options: ["late", "won't", "She", "be"],
    correctAnswer: "She won't be late.",
    translation: "Susun menjadi: “Dia tidak akan terlambat.”",
    hint: "Won't diletakkan setelah She.",
    explanation: "Subject + won't + base verb.",
    explanationId: "Urutan: She + won't + be + late.",
  },
  {
    id: "c15",
    type: "sentence-builder",
    question: "Arrange the words into a correct question.",
    options: ["help", "Will", "you", "me", "tomorrow"],
    correctAnswer: "Will you help me tomorrow?",
    translation: "Susun menjadi: “Maukah kamu membantuku besok?”",
    hint: "Pertanyaan dimulai dengan Will.",
    explanation: "Will + subject + base verb ...?",
    explanationId: "Kalimat tanya: Will + you + help + me + tomorrow?",
  },
  {
    id: "c16",
    type: "complete-sentence",
    question: "“Will they come to the party?” “Yes, they ___.”",
    options: ["will", "do", "did", "are"],
    correctAnswer: "will",
    translation: "Akankah mereka datang ke pesta? Ya, mereka akan datang.",
    hint: "Jawab dengan kata yang sama dengan pertanyaan.",
    explanation: "Answer with will: Yes, they will.",
    explanationId: "Will they ...? → Yes, they will. / No, they won't.",
  },
  {
    id: "c17",
    type: "true-false",
    question: "We use will with the word “yesterday”.",
    options: ["True", "False"],
    correctAnswer: "False",
    translation: "Kita memakai will dengan kata “yesterday” (kemarin).",
    hint: "Kemarin sudah lewat, will untuk yang akan datang.",
    explanation: "Yesterday is the past. Will is for the future.",
    explanationId: "Salah. Yesterday = kemarin (masa lalu). Will dipakai untuk masa depan.",
  },
  {
    id: "c18",
    type: "true-false",
    question: "Will is the same for I, you, he, she, it, we, and they.",
    options: ["True", "False"],
    correctAnswer: "True",
    translation: "Will sama untuk semua pelaku.",
    hint: "Tidak ada “wills”!",
    explanation: "Will never changes with the subject.",
    explanationId: "Benar! Will tidak berubah: He will, She will, They will.",
  },
  {
    id: "c19",
    type: "complete-sentence",
    question: "I'm thirsty. I ___ get some water.",
    options: ["will", "did", "was", "has"],
    correctAnswer: "will",
    translation: "Aku haus. Aku akan mengambil air.",
    hint: "Keputusan yang dibuat saat ini untuk melakukan sesuatu sebentar lagi.",
    explanation: "Use will for quick decisions.",
    explanationId: "Will dipakai untuk keputusan cepat: I will get some water.",
  },
  {
    id: "c20",
    type: "complete-sentence",
    question: "My brother ___ be ten years old next year.",
    options: ["will", "did", "was", "has"],
    correctAnswer: "will",
    translation: "Adikku akan berusia sepuluh tahun tahun depan.",
    hint: "“Next year” = tahun depan.",
    explanation: "Next year is in the future, so use will.",
    explanationId: "Next year = tahun depan, jadi pakai will.",
  },
];

export const questions: EnglishQuestion[] = [...core, ...generated];

/* ------------------------------ utilities ------------------------------ */

export function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[.!?,“”"]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function isCorrectAnswer(answer: string, question: EnglishQuestion) {
  return normalizeText(answer) === normalizeText(question.correctAnswer);
}

function shuffle<T>(items: T[]): T[] {
  return shuffleWith(items, Math.random);
}

/**
 * Pilih soal acak untuk satu sesi kuis. Berusaha memakai jenis soal yang
 * berbeda-beda, paling banyak 1 soal susun-kalimat (agar muat dalam waktu),
 * dan menghindari soal yang baru saja muncul.
 */
export function pickQuizQuestions(
  count: number,
  recent: Set<string> = new Set(),
): EnglishQuestion[] {
  const fresh = shuffle(questions.filter((q) => !recent.has(q.id)));
  const pool = fresh.length >= count * 4 ? fresh : shuffle(questions);

  const picked: EnglishQuestion[] = [];
  const usedTypes = new Set<string>();
  let builders = 0;

  for (const q of pool) {
    if (picked.length >= count) break;
    if (usedTypes.has(q.type)) continue;
    if (q.type === "sentence-builder" && builders >= 1) continue;
    picked.push(q);
    usedTypes.add(q.type);
    if (q.type === "sentence-builder") builders += 1;
  }

  for (const q of pool) {
    if (picked.length >= count) break;
    if (picked.includes(q)) continue;
    if (q.type === "sentence-builder" && builders >= 1) continue;
    picked.push(q);
  }

  return picked.map((q) => ({
    ...q,
    options:
      q.options && q.type !== "true-false" ? shuffle(q.options) : q.options,
  }));
}