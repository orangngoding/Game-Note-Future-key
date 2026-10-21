"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Tone from "tone";
import { songs } from "@/data/songs";
import { isCorrectAnswer, pickQuizQuestions, questions } from "@/data/questions";
import type { EnglishQuestion } from "@/types/game";
import QuizCard from "@/components/QuizCard";
import { HudStat, Screen } from "@/components/ui";

const LANES = [
  { key: "A", color: "#ff5d8f", dark: "#b81d52", glow: "rgba(255,93,143,0.8)" },
  { key: "S", color: "#ffc93c", dark: "#b8830a", glow: "rgba(255,201,60,0.8)" },
  { key: "K", color: "#4ade80", dark: "#15803d", glow: "rgba(74,222,128,0.8)" },
  { key: "L", color: "#38bdf8", dark: "#0369a1", glow: "rgba(56,189,248,0.8)" },
];

const BOARD_HEIGHT = 560;
const TARGET_Y = 420;
const NOTE_H = 52;
const PAD_H = 110;
const TRAVEL_TIME = 2.3;
const PERFECT_WINDOW = 0.12;
const GOOD_WINDOW = 0.3;
const HIT_WINDOW = GOOD_WINDOW;
const QUIZ_SECONDS = 35;
const QUIZ_QUESTION_COUNT = 3;
const QUIZ_BONUS = 50;

// Demo "Cara Bermain": 4 nada biasa, lalu 1 nada emas yang membuka kuis.
const DEMO_SEQUENCE = ["A", "S", "K", "L", "S"];
const DEMO_GOLDEN_POSITION = DEMO_SEQUENCE.length - 1;
const DEMO_PITCHES = ["C4", "E4", "G4", "C5"];

type NoteStatus = Record<number, "hit" | "miss">;
type Judgement = "Perfect" | "Good" | "Miss";
type QuizStatus = "idle" | "wrong" | "correct";
type Effect = { id: number; lane: number; kind: "press" | "perfect" | "good" | "miss" };

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function Home() {
  const [screen, setScreen] = useState<"menu" | "songs" | "howto" | "game">("menu");
  const [selectedSongId, setSelectedSongId] = useState(songs[0].id);
  const song = songs.find((item) => item.id === selectedSongId) ?? songs[0];
  const beatDuration = 60 / song.bpm;
  const noteTimes = useMemo(
    () => song.notes.map((note) => note.beat * beatDuration),
    [song, beatDuration],
  );
  const endTime = noteTimes[noteTimes.length - 1] + GOOD_WINDOW + 0.8;

  // ---------- Demo (Cara Bermain) ----------
  const [demoActiveKey, setDemoActiveKey] = useState("");
  const [demoHits, setDemoHits] = useState(0);
  const [demoFeedback, setDemoFeedback] = useState(
    "Tekan A, S, K, atau L untuk mencoba!",
  );
  const [demoStep, setDemoStep] = useState(0);
  const [demoSoundOn, setDemoSoundOn] = useState(true);
  const [demoBonus, setDemoBonus] = useState(0);
  const [demoQuiz, setDemoQuiz] = useState<EnglishQuestion | null>(null);
  const [demoStatus, setDemoStatus] = useState<QuizStatus>("idle");
  const [demoWrong, setDemoWrong] = useState(0);
  const [demoLocked, setDemoLocked] = useState(false);

  const demoPosition = demoStep % DEMO_SEQUENCE.length;
  const demoTargetKey = DEMO_SEQUENCE[demoPosition];
  const demoIsGolden = demoPosition === DEMO_GOLDEN_POSITION;
  const demoLaneIndex = LANES.findIndex((lane) => lane.key === demoTargetKey);

  // ---------- Audio & waktu ----------
  const demoSynthRef = useRef<Tone.Synth | null>(null);
  const synthRef = useRef<Tone.Synth | null>(null);
  const bassRef = useRef<Tone.Synth | null>(null);
  const kickRef = useRef<Tone.MembraneSynth | null>(null);
  const hatRef = useRef<Tone.NoiseSynth | null>(null);
  const startTimeRef = useRef(0);
  const accumulatedTimeRef = useRef(0);
  const elapsedRef = useRef(0);
  const noteStatusRef = useRef<NoteStatus>({});
  const comboRef = useRef(0);
  const bestComboRef = useRef(0);
  const lastBeatRef = useRef(-1);
  const effectIdRef = useRef(0);
  const quizRewardRef = useRef(false);
  const quizLockedRef = useRef(false);
  const recentQuizRef = useRef<Set<string>>(new Set());
  const backingOnRef = useRef(true);

  // ---------- State game ----------
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [perfectCount, setPerfectCount] = useState(0);
  const [noteStatus, setNoteStatus] = useState<NoteStatus>({});
  const [activeKey, setActiveKey] = useState("");
  const [message, setMessage] = useState("Bersiap ya!");
  const [judge, setJudge] = useState<{ type: Judgement; id: number } | null>(null);
  const [effects, setEffects] = useState<Effect[]>([]);
  const [backingOn, setBackingOn] = useState(true);

  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<EnglishQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizStatus, setQuizStatus] = useState<QuizStatus>("idle");
  const [quizWrongCount, setQuizWrongCount] = useState(0);
  const [quizLocked, setQuizLocked] = useState(false);
  const [quizTimeLeft, setQuizTimeLeft] = useState(QUIZ_SECONDS);
  const [quizRewardEnabled, setQuizRewardEnabled] = useState(false);
  const [quizRight, setQuizRight] = useState(0);
  const [quizAsked, setQuizAsked] = useState(0);
  const [isCountdownActive, setIsCountdownActive] = useState(false);
  const [countdown, setCountdown] = useState(3);

  const quizQuestion = quizQuestions[currentQuestionIndex];

  useEffect(() => {
    backingOnRef.current = backingOn;
  }, [backingOn]);

  // ---------- Efek visual ----------
  const pushEffect = useCallback((lane: number, kind: Effect["kind"]) => {
    effectIdRef.current += 1;
    const id = effectIdRef.current;
    setEffects((previous) => [...previous.slice(-12), { id, lane, kind }]);
    window.setTimeout(() => {
      setEffects((previous) => previous.filter((item) => item.id !== id));
    }, 600);
  }, []);

  const showJudge = useCallback((type: Judgement) => {
    effectIdRef.current += 1;
    setJudge({ type, id: effectIdRef.current });
  }, []);

  // ---------- Audio ----------
  const ensureAudio = useCallback(async () => {
    await Tone.start();

    if (!synthRef.current) {
      synthRef.current = new Tone.Synth({
        oscillator: { type: "triangle" },
        envelope: { attack: 0.01, decay: 0.25, sustain: 0.2, release: 0.8 },
      }).toDestination();
    }
    synthRef.current.set({ oscillator: { type: song.wave } });
    synthRef.current.volume.value = song.wave === "square" ? -16 : -8;

    if (!bassRef.current) {
      bassRef.current = new Tone.Synth({
        oscillator: { type: "sine" },
        envelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 0.6 },
      }).toDestination();
      bassRef.current.volume.value = -13;
    }
    if (!kickRef.current) {
      kickRef.current = new Tone.MembraneSynth().toDestination();
      kickRef.current.volume.value = -18;
    }
    if (!hatRef.current) {
      hatRef.current = new Tone.NoiseSynth({
        noise: { type: "white" },
        envelope: { attack: 0.001, decay: 0.04, sustain: 0 },
      }).toDestination();
      hatRef.current.volume.value = -30;
    }
  }, [song.wave]);

  const playNote = useCallback((pitch: string) => {
    try {
      synthRef.current?.triggerAttackRelease(pitch, "8n");
    } catch {
      // abaikan bila dua nada dipicu di waktu yang sama
    }
  }, []);

  const playBacking = useCallback(
    (beatIndex: number) => {
      if (!backingOnRef.current) return;
      try {
        const posInBar = beatIndex % 4;
        const bar = Math.floor(beatIndex / 4);
        if (posInBar === 0) {
          bassRef.current?.triggerAttackRelease(
            song.bass[bar % song.bass.length],
            beatDuration * 2,
          );
        }
        if (posInBar === 0 || posInBar === 2) {
          kickRef.current?.triggerAttackRelease("C1", "16n");
        }
        hatRef.current?.triggerAttackRelease("32n");
      } catch {
        // abaikan
      }
    },
    [song.bass, beatDuration],
  );

  // ---------- Demo: suara & kuis ----------
  const playDemoSound = useCallback(
    async (pitch: string) => {
      if (!demoSoundOn) return;
      try {
        await Tone.start();
        if (!demoSynthRef.current) {
          demoSynthRef.current = new Tone.Synth({
            oscillator: { type: "triangle" },
            envelope: { attack: 0.01, decay: 0.25, sustain: 0.2, release: 0.8 },
          }).toDestination();
          demoSynthRef.current.volume.value = -8;
        }
        demoSynthRef.current.triggerAttackRelease(pitch, "8n");
      } catch (error) {
        console.error("Unable to play demo sound:", error);
      }
    },
    [demoSoundOn],
  );

  const openDemoQuiz = useCallback(() => {
    const [picked] = pickQuizQuestions(1);
    setDemoQuiz(picked);
    setDemoStatus("idle");
    setDemoWrong(0);
    setDemoLocked(false);
  }, []);

  const submitDemoAnswer = (answer: string) => {
    if (!demoQuiz || demoLocked) return;

    if (!isCorrectAnswer(answer, demoQuiz)) {
      setDemoStatus("wrong");
      setDemoWrong((previous) => previous + 1);
      void playDemoSound("C3");
      return;
    }

    setDemoLocked(true);
    setDemoStatus("correct");
    setDemoBonus((previous) => previous + QUIZ_BONUS);
    void playDemoSound("C5");
  };

  const closeDemoQuiz = () => {
    setDemoQuiz(null);
    setDemoStatus("idle");
    setDemoWrong(0);
    setDemoLocked(false);
    setDemoFeedback(
      "Kuis selesai! Di game asli, lagu lanjut setelah hitung mundur 3-2-1.",
    );
  };

  const handleDemoKey = useCallback(
    (key: string) => {
      if (screen !== "howto" || demoQuiz) return;

      if (key === demoTargetKey) {
        const laneIndex = LANES.findIndex((item) => item.key === key);
        if (laneIndex >= 0) void playDemoSound(DEMO_PITCHES[laneIndex]);

        setDemoHits((previous) => previous + 1);
        setDemoStep((previous) => previous + 1);

        if (demoIsGolden) {
          setDemoFeedback("Nada emas kena! Kuis English muncul, seperti di game asli.");
          openDemoQuiz();
        } else {
          setDemoFeedback(`Bagus! Tekan ${key} dengan tepat! 🎉`);
        }
      } else {
        setDemoFeedback(`Coba tekan ${demoTargetKey}! Ikuti tombol yang menyala.`);
      }

      setDemoActiveKey(key);
      window.setTimeout(() => {
        setDemoActiveKey((current) => (current === key ? "" : current));
      }, 180);
    },
    [screen, demoQuiz, demoTargetKey, demoIsGolden, playDemoSound, openDemoQuiz],
  );

  useEffect(() => {
    if (screen !== "howto") return;
    function onDemoKeyDown(event: KeyboardEvent) {
      if (event.repeat) return;
      const key = event.key.toUpperCase();
      if (["A", "S", "K", "L"].includes(key)) {
        event.preventDefault();
        handleDemoKey(key);
      }
    }
    window.addEventListener("keydown", onDemoKeyDown);
    return () => window.removeEventListener("keydown", onDemoKeyDown);
  }, [screen, handleDemoKey]);

  useEffect(() => {
    if (screen === "howto") return;
    setDemoQuiz(null);
    setDemoStatus("idle");
    setDemoWrong(0);
    setDemoLocked(false);
  }, [screen]);

  // ---------- Kuis di game ----------
  const openQuiz = useCallback((canEarnBonus: boolean) => {
    quizRewardRef.current = canEarnBonus;
    quizLockedRef.current = false;

    const picked = pickQuizQuestions(QUIZ_QUESTION_COUNT, recentQuizRef.current);
    picked.forEach((q) => recentQuizRef.current.add(q.id));
    if (recentQuizRef.current.size > questions.length * 0.7) {
      recentQuizRef.current.clear();
    }

    setQuizQuestions(picked);
    setQuizAsked((previous) => previous + picked.length);
    setCurrentQuestionIndex(0);
    setQuizStatus("idle");
    setQuizWrongCount(0);
    setQuizLocked(false);
    setQuizTimeLeft(QUIZ_SECONDS);
    setQuizRewardEnabled(canEarnBonus);
    setIsQuizOpen(true);
    setIsPlaying(false);
    setMessage(
      canEarnBonus
        ? "Nada emas kena! Jawab kuis English-nya."
        : "Nada emas terlewat, tapi kuisnya tetap muncul!",
    );
  }, []);

  const finishQuiz = useCallback((timeUp: boolean) => {
    quizLockedRef.current = false;
    setQuizLocked(false);
    setIsQuizOpen(false);
    setIsCountdownActive(true);
    setCountdown(3);
    setMessage(
      timeUp
        ? "Waktu habis! Tidak apa-apa, ayo lanjut main!"
        : "Kuis selesai! Bersiap lanjut...",
    );
  }, []);

  const submitAnswer = (answer: string) => {
    if (!quizQuestion || !isQuizOpen || quizLockedRef.current) return;

    if (!isCorrectAnswer(answer, quizQuestion)) {
      setQuizStatus("wrong");
      setQuizWrongCount((previous) => previous + 1);
      return;
    }

    quizLockedRef.current = true;
    setQuizLocked(true);
    setQuizStatus("correct");
    setQuizRight((previous) => previous + 1);
    if (quizRewardRef.current) setScore((previous) => previous + QUIZ_BONUS);
  };

  const nextQuestion = () => {
    if (!quizLockedRef.current) return;
    quizLockedRef.current = false;
    setQuizLocked(false);
    const next = currentQuestionIndex + 1;
    if (next >= quizQuestions.length) {
      finishQuiz(false);
    } else {
      setCurrentQuestionIndex(next);
      setQuizStatus("idle");
      setQuizWrongCount(0);
    }
  };

  // Timer 30 detik untuk 3 soal. Berhenti sebentar saat anak membaca penjelasan.
  useEffect(() => {
    if (!isQuizOpen) return;
    const timer = window.setInterval(() => {
      if (quizLockedRef.current) return;
      setQuizTimeLeft((previous) => Math.max(0, previous - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isQuizOpen]);

  useEffect(() => {
    if (isQuizOpen && quizTimeLeft <= 0) finishQuiz(true);
  }, [isQuizOpen, quizTimeLeft, finishQuiz]);

  // ---------- Mulai, jeda, keluar ----------
  const startGame = async () => {
    try {
      await ensureAudio();
    } catch (error) {
      console.error("Unable to start audio:", error);
    }

    noteStatusRef.current = {};
    comboRef.current = 0;
    bestComboRef.current = 0;
    quizRewardRef.current = false;
    quizLockedRef.current = false;
    accumulatedTimeRef.current = 0;
    elapsedRef.current = 0;
    lastBeatRef.current = -1;
    startTimeRef.current = performance.now();

    setNoteStatus({});
    setJudge(null);
    setEffects([]);
    setElapsed(0);
    setScore(0);
    setCombo(0);
    setBestCombo(0);
    setPerfectCount(0);
    setActiveKey("");
    setIsFinished(false);
    setIsPaused(false);
    setIsQuizOpen(false);
    setQuizQuestions([]);
    setCurrentQuestionIndex(0);
    setQuizStatus("idle");
    setQuizRight(0);
    setQuizAsked(0);
    setIsPlaying(false);
    setCountdown(3);
    setIsCountdownActive(true);
    setMessage("Bersiap! Ikuti nada yang jatuh.");
  };

  const pauseGame = () => {
    if (!isPlaying) return;
    accumulatedTimeRef.current = elapsedRef.current;
    setIsPlaying(false);
    setIsPaused(true);
  };

  const resumeGame = () => {
    setIsPaused(false);
    setCountdown(3);
    setIsCountdownActive(true);
  };

  const leaveGame = (target: "menu" | "songs") => {
    setIsPlaying(false);
    setIsPaused(false);
    setIsQuizOpen(false);
    setIsCountdownActive(false);
    setScreen(target);
  };

  // ---------- Menekan nada ----------
  const handleKeyPress = useCallback(
    (key: string) => {
      if (!isPlaying || isQuizOpen || isCountdownActive) return;
      const laneIndex = LANES.findIndex((item) => item.key === key);
      if (laneIndex === -1) return;

      setActiveKey(key);
      window.setTimeout(() => {
        setActiveKey((current) => (current === key ? "" : current));
      }, 120);

      const currentTime = elapsedRef.current;
      let closestIndex = -1;
      let closestDifference = Infinity;

      song.notes.forEach((note, index) => {
        if (note.lane !== laneIndex || noteStatusRef.current[index]) return;
        const difference = Math.abs(noteTimes[index] - currentTime);
        if (difference <= HIT_WINDOW && difference < closestDifference) {
          closestIndex = index;
          closestDifference = difference;
        }
      });

      if (closestIndex === -1) {
        pushEffect(laneIndex, "press");
        setMessage("Tunggu nadanya sampai di lingkaran ya!");
        return;
      }

      const hitNote = song.notes[closestIndex];
      const judgement: Judgement =
        closestDifference <= PERFECT_WINDOW ? "Perfect" : "Good";
      const newCombo = comboRef.current + 1;
      const multiplier = Math.min(4, 1 + Math.floor(newCombo / 10));
      const points = (judgement === "Perfect" ? 100 : 70) * multiplier;

      playNote(hitNote.pitch);

      noteStatusRef.current = { ...noteStatusRef.current, [closestIndex]: "hit" };
      setNoteStatus(noteStatusRef.current);

      comboRef.current = newCombo;
      if (newCombo > bestComboRef.current) bestComboRef.current = newCombo;
      setCombo(newCombo);
      setBestCombo(bestComboRef.current);
      setScore((previous) => previous + points);
      if (judgement === "Perfect") setPerfectCount((previous) => previous + 1);

      showJudge(judgement);
      pushEffect(laneIndex, judgement === "Perfect" ? "perfect" : "good");
      setMessage(
        `${judgement === "Perfect" ? "Sempurna" : "Bagus"}! +${points} poin${
          multiplier > 1 ? ` (x${multiplier})` : ""
        }`,
      );

      if (hitNote.isQuestion) {
        accumulatedTimeRef.current = currentTime;
        openQuiz(true);
      }
    },
    [isPlaying, isQuizOpen, isCountdownActive, song.notes, noteTimes, playNote, pushEffect, showJudge, openQuiz],
  );

  useEffect(() => {
    if (!isPlaying || isQuizOpen || isCountdownActive) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat) return;
      const key = event.key.toUpperCase();
      if (["A", "S", "K", "L"].includes(key)) {
        event.preventDefault();
        handleKeyPress(key);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isPlaying, isQuizOpen, isCountdownActive, handleKeyPress]);

  // ---------- Jam game, iringan, dan deteksi nada terlewat ----------
  useEffect(() => {
    if (!isPlaying || isQuizOpen || isCountdownActive) return;
    let animationId = 0;

    const tick = () => {
      const currentTime =
        accumulatedTimeRef.current +
        (performance.now() - startTimeRef.current) / 1000;

      elapsedRef.current = currentTime;
      setElapsed(currentTime);

      const beatIndex = Math.floor(currentTime / beatDuration);
      if (beatIndex > lastBeatRef.current) {
        lastBeatRef.current = beatIndex;
        playBacking(beatIndex);
      }

      let changed = false;
      let missedQuestion = false;
      const nextStatus = { ...noteStatusRef.current };

      for (let index = 0; index < song.notes.length; index++) {
        if (nextStatus[index]) continue;
        if (currentTime > noteTimes[index] + GOOD_WINDOW) {
          nextStatus[index] = "miss";
          changed = true;
          pushEffect(song.notes[index].lane, "miss");
          if (song.notes[index].isQuestion) {
            missedQuestion = true;
            break;
          }
        }
      }

      if (changed) {
        noteStatusRef.current = nextStatus;
        setNoteStatus(nextStatus);
        showJudge("Miss");
        comboRef.current = 0;
        setCombo(0);
      }

      if (missedQuestion) {
        accumulatedTimeRef.current = currentTime;
        openQuiz(false);
        return;
      }

      if (currentTime >= endTime) {
        setIsPlaying(false);
        setIsFinished(true);
        setMessage("Lagu selesai! Hebat!");
        return;
      }

      animationId = requestAnimationFrame(tick);
    };

    animationId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationId);
  }, [isPlaying, isQuizOpen, isCountdownActive, song.notes, noteTimes, beatDuration, endTime, playBacking, pushEffect, showJudge, openQuiz]);

  // ---------- Hitung mundur 3-2-1 (awal lagu & setelah kuis/jeda) ----------
  useEffect(() => {
    if (!isCountdownActive) return;

    if (countdown <= 0) {
      startTimeRef.current = performance.now();
      setIsCountdownActive(false);
      setIsPaused(false);
      setIsPlaying(true);
      setMessage("Ayo main! Ikuti nadanya!");
      return;
    }

    const timer = window.setTimeout(() => {
      setCountdown((previous) => previous - 1);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [isCountdownActive, countdown]);

  useEffect(() => {
    return () => {
      synthRef.current?.dispose();
      synthRef.current = null;
      bassRef.current?.dispose();
      bassRef.current = null;
      kickRef.current?.dispose();
      kickRef.current = null;
      hatRef.current?.dispose();
      hatRef.current = null;
      demoSynthRef.current?.dispose();
      demoSynthRef.current = null;
    };
  }, []);

  // ---------- Statistik ----------
  const hitCount = Object.values(noteStatus).filter((s) => s === "hit").length;
  const missCount = Object.values(noteStatus).filter((s) => s === "miss").length;
  const completedNotes = hitCount + missCount;
  const accuracy = completedNotes > 0 ? Math.round((hitCount / completedNotes) * 100) : 0;
  const stars = accuracy >= 90 ? 3 : accuracy >= 70 ? 2 : 1;
  const multiplier = Math.min(4, 1 + Math.floor(combo / 10));
  const progress = Math.min(1, elapsed / endTime);

  /* ================================================================== */
  /*  MENU                                                               */
  /* ================================================================== */
  if (screen === "menu") {
    return (
      <Screen className="flex min-h-screen max-w-3xl flex-col items-center justify-center px-5 py-10 text-center">
        <div className="anim-bob mb-4 flex h-28 w-28 items-center justify-center rounded-[2rem] border-4 border-white/80 bg-gradient-to-br from-yellow-300 to-orange-400 text-6xl shadow-[0_8px_0_#b45309]">
          🎹
        </div>

        <p className="rounded-full bg-white/15 px-4 py-1 text-xs font-bold tracking-[0.25em]">
          ENGLISH RHYTHM ADVENTURE
        </p>

        <h1 className="fk-title mt-3 text-6xl font-black sm:text-8xl">
          FUTURE <span className="text-yellow-300">KEYS</span>
        </h1>

        <p className="mt-4 max-w-md text-base font-medium text-white/90 sm:text-lg">
          Tekan tuts piano, ikuti nadanya, dan belajar{" "}
          <b className="text-yellow-300">“will”</b> sambil bermain! 🎶
        </p>

        <div className="mt-8 grid w-full max-w-md gap-4">
          <button
            onClick={() => setScreen("songs")}
            className="btn-3d btn-green anim-wiggle px-6 py-5 text-2xl"
          >
            ▶ MULAI MAIN
          </button>
          <button
            onClick={() => setScreen("howto")}
            className="btn-3d btn-purple px-6 py-4 text-xl"
          >
            ❓ CARA BERMAIN
          </button>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {["🎹 4 Jalur Piano", "⭐ Nada Emas = Kuis", `🎵 ${songs.length} Lagu`].map((feature) => (
            <span
              key={feature}
              className="rounded-full border-2 border-white/30 bg-white/10 px-4 py-1.5 text-xs font-bold"
            >
              {feature}
            </span>
          ))}
        </div>

        <p className="mt-8 text-xs font-bold tracking-widest text-white/60">
          LISTEN · PLAY · LEARN
        </p>
      </Screen>
    );
  }

  /* ================================================================== */
  /*  CARA BERMAIN                                                       */
  /* ================================================================== */
  if (screen === "howto") {
    return (
      <Screen className="max-w-3xl px-5 py-8">
        <button
          onClick={() => setScreen("menu")}
          className="btn-3d btn-ghost mb-6 px-4 py-2 text-sm"
        >
          ← Menu Utama
        </button>

        <p className="text-xs font-bold tracking-[0.3em] text-yellow-300">PANDUAN PEMAIN</p>
        <h1 className="fk-title mt-2 text-5xl font-black">Cara Bermain</h1>
        <p className="mt-3 text-base text-white/90">
          Nada jatuh dari atas. Tekan tombol yang warnanya sama saat nada tepat
          berada di lingkaran! Bisa pakai keyboard <b>A S K L</b> atau sentuh jalurnya.
        </p>

        <div className="mt-6 grid grid-cols-4 gap-2 sm:gap-3">
          {LANES.map((lane) => (
            <div
              key={lane.key}
              className="rounded-2xl border-4 border-white/70 py-4 text-center text-4xl font-black text-white"
              style={{
                background: `linear-gradient(180deg, ${lane.color}, ${lane.dark})`,
                boxShadow: `0 6px 0 ${lane.dark}`,
              }}
            >
              {lane.key}
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-4">
          <div className="card-cartoon p-5">
            <h2 className="text-lg font-black text-cyan-200">1 · Tekan nadanya 🎹</h2>
            <p className="mt-2 text-sm leading-6">
              Tekan A, S, K, atau L ketika nada sampai di lingkaran. Makin tepat,
              makin banyak poin. Hit beruntun menaikkan <b>combo</b>, dan combo
              besar menggandakan poinmu (x2, x3, x4)!
            </p>
          </div>
          <div className="card-cartoon border-yellow-200/70 p-5">
            <h2 className="text-lg font-black text-yellow-200">2 · Nada emas ★ = Kuis! ⭐</h2>
            <p className="mt-2 text-sm leading-6">
              Nada emas membuka <b>3 soal English</b> dalam {QUIZ_SECONDS} detik.
              Jawaban benar memberi <b>+{QUIZ_BONUS} poin</b>. Kalau nada emas
              terlewat, kuis tetap muncul tapi tanpa bonus. Kuisnya ada petunjuk
              dan penjelasan bahasa Indonesia, jadi tenang saja!
            </p>
          </div>
          <div className="card-cartoon p-5">
            <h2 className="text-lg font-black text-pink-200">3 · Lanjut lagi 🎶</h2>
            <p className="mt-2 text-sm leading-6">
              Setelah kuis, lagu lanjut dengan hitung mundur 3-2-1. Selesaikan
              lagu untuk dapat bintang ⭐⭐⭐!
            </p>
          </div>
        </div>

        {/* Materi */}
        <div className="card-cartoon mt-6 border-cyan-200/70 p-5">
          <p className="text-xs font-bold tracking-[0.25em] text-cyan-200">MATERI</p>
          <h2 className="mt-1 text-2xl font-black">
            Talking about Future Activities using <span className="text-yellow-300">“will”</span>
          </h2>
          <p className="mt-2 text-sm">
            <b>Will</b> artinya <b>“akan”</b>. Dipakai untuk kegiatan, rencana,
            prediksi, dan janji di masa depan. Will sama untuk semua pelaku
            (I, you, he, she, it, we, they).
          </p>

          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl bg-emerald-400/20 p-3">
              <p className="font-black text-emerald-200">✅ Kalimat biasa</p>
              <p className="text-sm">Subject + <b>will</b> + V1 (kata kerja dasar)</p>
              <p className="mt-1 text-sm font-bold">I will play football tomorrow.</p>
              <p className="text-xs italic text-cyan-100">🇮🇩 Besok saya akan bermain sepak bola.</p>
            </div>
            <div className="rounded-2xl bg-rose-400/20 p-3">
              <p className="font-black text-rose-200">❌ Kalimat negatif</p>
              <p className="text-sm">Subject + <b>will not (won&apos;t)</b> + V1</p>
              <p className="mt-1 text-sm font-bold">She won&apos;t be late.</p>
              <p className="text-xs italic text-cyan-100">🇮🇩 Dia tidak akan terlambat.</p>
            </div>
            <div className="rounded-2xl bg-sky-400/20 p-3">
              <p className="font-black text-sky-200">❓ Kalimat tanya</p>
              <p className="text-sm"><b>Will</b> + Subject + V1 ...?</p>
              <p className="mt-1 text-sm font-bold">Will you help me? — Yes, I will. / No, I won&apos;t.</p>
              <p className="text-xs italic text-cyan-100">🇮🇩 Maukah kamu membantuku? — Ya. / Tidak.</p>
            </div>
            <div className="rounded-2xl bg-yellow-300/20 p-3">
              <p className="font-black text-yellow-200">⏰ Kata waktu masa depan</p>
              <p className="text-sm">
                tomorrow (besok) • tonight (nanti malam) • next week (minggu depan) •
                next year (tahun depan) • after school (sepulang sekolah)
              </p>
            </div>
          </div>
        </div>

        {/* Demo interaktif */}
        <div className="card-cartoon mt-6 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold tracking-[0.25em] text-yellow-300">MODE LATIHAN</p>
              <h2 className="mt-1 text-2xl font-black">Coba Mainkan! 🎮</h2>
            </div>
            <div className="flex gap-2">
              <div className="rounded-xl bg-cyan-300/25 px-3 py-2 text-sm font-bold">Hit: {demoHits}</div>
              <div className="rounded-xl bg-yellow-300/25 px-3 py-2 text-sm font-bold">Bonus: +{demoBonus}</div>
            </div>
          </div>

          <p className="mt-3 text-sm">
            Tekan tombol yang menyala. Tekan 4 nada, lalu tangkap nada emas untuk
            mencoba kuis!
          </p>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => setDemoSoundOn((previous) => !previous)}
              aria-pressed={demoSoundOn}
              className="btn-3d btn-ghost px-3 py-1.5 text-xs"
            >
              {demoSoundOn ? "🔊 Suara: Nyala" : "🔇 Suara: Mati"}
            </button>
          </div>

          {demoQuiz && (
            <div className="mt-4 rounded-2xl border-2 border-yellow-200/70 bg-indigo-950/60 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="rounded-full bg-yellow-300 px-3 py-1 text-xs font-black text-indigo-950">
                  ★ LATIHAN KUIS
                </span>
                <span className="text-xs text-white/70">1 soal · tanpa timer</span>
              </div>
              <QuizCard
                key={demoQuiz.id}
                question={demoQuiz}
                status={demoStatus}
                wrongCount={demoWrong}
                locked={demoLocked}
                bonusText={`+${QUIZ_BONUS} poin bonus!`}
                isLast
                onSubmit={submitDemoAnswer}
                onNext={closeDemoQuiz}
              />
            </div>
          )}

          <div
            className={`relative mt-4 h-64 overflow-hidden rounded-2xl border-4 border-white/40 bg-indigo-950/70 ${
              demoQuiz ? "hidden" : ""
            }`}
          >
            <div className="absolute inset-0 grid grid-cols-4">
              {LANES.map((lane) => (
                <div
                  key={lane.key}
                  className="border-r border-white/10 last:border-r-0"
                  style={{ background: `${lane.color}14` }}
                />
              ))}
            </div>

            <div
              key={`${demoStep}-${demoTargetKey}`}
              className="absolute top-0 flex h-9 w-[20%] items-center justify-center rounded-xl border-2 border-white text-lg font-black text-white"
              style={{
                left: `${demoLaneIndex * 25 + 2.5}%`,
                animation: "demo-fall 2.8s linear infinite",
                background: demoIsGolden
                  ? "linear-gradient(180deg,#fde047,#f59e0b)"
                  : `linear-gradient(180deg, ${LANES[demoLaneIndex].color}, ${LANES[demoLaneIndex].dark})`,
                color: demoIsGolden ? "#7c2d12" : "#fff",
                boxShadow: demoIsGolden
                  ? "0 0 20px rgba(253,224,71,.9)"
                  : `0 0 16px ${LANES[demoLaneIndex].glow}`,
              }}
            >
              {demoIsGolden ? "★" : demoTargetKey}
            </div>

            <div className="absolute inset-x-0 top-[72%] border-t-4 border-white/90 shadow-[0_0_14px_rgba(255,255,255,0.8)]" />
            <div className="absolute inset-x-0 top-[77%] text-center text-[10px] font-black tracking-[0.3em] text-white/70">
              GARIS TARGET
            </div>
            <div className="absolute inset-x-0 bottom-2 text-center text-xs font-bold text-white/80">
              Tekan: <span className="text-yellow-300">{demoTargetKey}</span>
              {demoIsGolden && <span className="ml-2 text-yellow-200">★ Nada emas: buka kuis!</span>}
            </div>
          </div>

          <div className={`mt-4 grid grid-cols-4 gap-2 sm:gap-3 ${demoQuiz ? "hidden" : ""}`}>
            {LANES.map((lane, index) => {
              const isTarget = lane.key === demoTargetKey;
              const isActive = demoActiveKey === lane.key;
              return (
                <button
                  key={lane.key}
                  type="button"
                  onClick={() => handleDemoKey(lane.key)}
                  className={`rounded-2xl border-4 px-2 py-4 text-white transition duration-150 active:scale-95 ${
                    isTarget ? "anim-glow border-yellow-200" : "border-white/50"
                  } ${isActive ? "scale-95 brightness-125" : ""}`}
                  style={{
                    background: `linear-gradient(180deg, ${lane.color}, ${lane.dark})`,
                    boxShadow: `0 5px 0 ${lane.dark}`,
                    opacity: isTarget || isActive ? 1 : 0.6,
                  }}
                >
                  <span className="block text-2xl font-black">{lane.key}</span>
                  <span className="mt-1 block text-[10px] font-bold opacity-80">
                    {DEMO_PITCHES[index]}
                  </span>
                </button>
              );
            })}
          </div>

          <div
            aria-live="polite"
            className="mt-4 rounded-xl bg-black/25 p-3 text-center text-sm font-bold text-cyan-100"
          >
            {demoFeedback}
          </div>

          <button
            type="button"
            onClick={() => {
              setDemoHits(0);
              setDemoStep(0);
              setDemoBonus(0);
              setDemoActiveKey("");
              setDemoQuiz(null);
              setDemoStatus("idle");
              setDemoWrong(0);
              setDemoLocked(false);
              setDemoFeedback("Latihan diulang! Tekan tombol yang menyala.");
            }}
            className="btn-3d btn-ghost mt-3 w-full px-4 py-2 text-sm"
          >
            ↻ Ulangi Latihan
          </button>
        </div>

        <button
          onClick={() => setScreen("songs")}
          className="btn-3d btn-green mt-8 w-full px-6 py-4 text-xl"
        >
          Aku Siap — Pilih Lagu →
        </button>
      </Screen>
    );
  }

  /* ================================================================== */
  /*  PILIH LAGU                                                         */
  /* ================================================================== */
  if (screen === "songs") {
    return (
      <Screen className="max-w-5xl px-5 py-8 pb-40">
        <button
          onClick={() => setScreen("menu")}
          className="btn-3d btn-ghost mb-6 px-4 py-2 text-sm"
        >
          ← Menu Utama
        </button>

        <p className="text-xs font-bold tracking-[0.3em] text-yellow-300">PILIH TRACK</p>
        <h1 className="fk-title mt-2 text-5xl font-black">Pilih Lagumu 🎵</h1>
        <p className="mt-2 text-white/90">
          Setiap lagu punya nada dan irama berbeda. Durasinya sekitar 1–2 menit!
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {songs.map((item, index) => {
            const selected = selectedSongId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setSelectedSongId(item.id)}
                aria-pressed={selected}
                className={`overflow-hidden rounded-3xl border-4 p-0 text-left transition duration-200 hover:-translate-y-1 ${
                  selected ? "anim-glow scale-[1.03] border-yellow-200" : "border-white/50"
                }`}
                style={{
                  background: `linear-gradient(135deg, ${item.colors[0]}, ${item.colors[1]})`,
                  boxShadow: "0 6px 0 rgba(0,0,0,0.3)",
                }}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-white/90 text-3xl ${selected ? "anim-bob" : ""}`}>
                      {item.icon}
                    </div>
                    <span className="rounded-full bg-black/25 px-3 py-1 text-xs font-bold">
                      #{String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h2 className="mt-4 text-xl font-black drop-shadow">{item.title}</h2>
                  <p className="text-sm font-medium text-white/90">{item.tagline}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                    <span className="rounded-full bg-black/25 px-3 py-1">⏱ {formatDuration(item.duration)}</span>
                    <span className="rounded-full bg-black/25 px-3 py-1">🥁 {item.bpm} BPM</span>
                    <span className="rounded-full bg-black/25 px-3 py-1">🎹 {item.notes.length} nada</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="fixed inset-x-0 bottom-0 z-20 border-t-4 border-white/40 bg-indigo-950/90 p-4 backdrop-blur">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/90 text-2xl">
                {song.icon}
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-widest text-yellow-300">LAGU TERPILIH</p>
                <p className="text-lg font-black">{song.title}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setScreen("game");
                void startGame();
              }}
              className="btn-3d btn-green px-8 py-3 text-lg"
            >
              Main Sekarang ▶
            </button>
          </div>
        </div>
      </Screen>
    );
  }

  /* ================================================================== */
  /*  GAMEPLAY                                                           */
  /* ================================================================== */
  const showOverlay = !isPlaying && !isQuizOpen && !isCountdownActive;

  return (
    <Screen className="max-w-xl px-3 py-4">
      {/* Bar atas */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <button onClick={() => leaveGame("songs")} className="btn-3d btn-ghost px-3 py-2 text-sm">
          ← Keluar
        </button>
        <div className="min-w-0 text-center">
          <p className="truncate text-lg font-black">{song.icon} {song.title}</p>
          <p className="text-[11px] font-bold text-white/70">{song.bpm} BPM · {formatDuration(song.duration)}</p>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => setBackingOn((previous) => !previous)}
            aria-pressed={backingOn}
            title="Musik latar"
            className="btn-3d btn-ghost px-3 py-2 text-sm"
          >
            {backingOn ? "🎵" : "🔇"}
          </button>
          <button
            onClick={pauseGame}
            disabled={!isPlaying}
            title="Jeda"
            className="btn-3d btn-yellow px-3 py-2 text-sm"
          >
            ⏸
          </button>
        </div>
      </div>

      {/* HUD */}
      <div className="mb-3 grid grid-cols-3 gap-2">
        <HudStat label="SKOR" value={score.toLocaleString("id-ID")} />
        <HudStat label={multiplier > 1 ? `COMBO x${multiplier}` : "COMBO"} value={combo.toString()} accent="#f9a8d4" />
        <HudStat label="AKURASI" value={`${accuracy}%`} accent="#86efac" />
      </div>

      <div className="mb-3 h-4 overflow-hidden rounded-full border-2 border-white/50 bg-black/30">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-pink-300 to-yellow-300"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Papan nada */}
      <div
        className="relative mx-auto select-none overflow-hidden rounded-3xl border-4 border-white/70 bg-indigo-950/80 shadow-[0_8px_0_rgba(0,0,0,0.3)]"
        style={{ height: BOARD_HEIGHT }}
      >
        {/* Jalur (bisa disentuh) */}
        {LANES.map((lane, index) => (
          <div
            key={lane.key}
            onPointerDown={(event) => {
              event.preventDefault();
              handleKeyPress(lane.key);
            }}
            className="absolute bottom-0 top-0 touch-none"
            style={{
              left: `${index * 25}%`,
              width: "25%",
              background: index % 2 === 0 ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.025)",
              borderRight: index < 3 ? "2px solid rgba(255,255,255,0.1)" : "none",
            }}
          >
            <span
              className="absolute left-1/2 top-2 -translate-x-1/2 text-sm font-black"
              style={{ color: lane.color, opacity: 0.5 }}
            >
              {lane.key}
            </span>
          </div>
        ))}

        {/* Garis & lingkaran target */}
        <div
          className="pointer-events-none absolute inset-x-0 z-10 border-t-4 border-white/90 shadow-[0_0_14px_rgba(255,255,255,0.7)]"
          style={{ top: TARGET_Y }}
        />
        {LANES.map((lane, index) => (
          <div
            key={`target-${lane.key}`}
            className="pointer-events-none absolute z-10 rounded-full border-4 border-dashed"
            style={{
              left: `${index * 25 + 12.5}%`,
              top: TARGET_Y,
              width: 58,
              height: 58,
              transform: "translate(-50%,-50%)",
              borderColor: lane.color,
              background: `${lane.color}26`,
            }}
          />
        ))}

        {/* Efek tekan & hit */}
        {effects.map((effect) => {
          const lane = LANES[effect.lane];
          const centerX = `${effect.lane * 25 + 12.5}%`;
          if (effect.kind === "press") {
            return (
              <div
                key={effect.id}
                className="fx-beam pointer-events-none absolute z-10"
                style={{
                  left: `${effect.lane * 25}%`,
                  width: "25%",
                  top: 0,
                  height: BOARD_HEIGHT - PAD_H,
                  background: `linear-gradient(to top, ${lane.glow}, transparent 70%)`,
                }}
              />
            );
          }
          if (effect.kind === "miss") {
            return (
              <div
                key={effect.id}
                className="fx-beam pointer-events-none absolute z-10"
                style={{
                  left: `${effect.lane * 25}%`,
                  width: "25%",
                  top: TARGET_Y - 40,
                  height: 80,
                  background: "radial-gradient(circle, rgba(244,63,94,0.6), transparent 70%)",
                }}
              />
            );
          }
          return (
            <div key={effect.id} className="pointer-events-none absolute z-30" style={{ left: centerX, top: TARGET_Y }}>
              <div
                className="fx-ring absolute rounded-full border-4"
                style={{
                  width: 70,
                  height: 70,
                  borderColor: effect.kind === "perfect" ? "#fde047" : "#67e8f9",
                  boxShadow: `0 0 20px ${lane.glow}`,
                }}
              />
              <div
                className="fx-beam absolute -translate-x-1/2 -translate-y-1/2 text-3xl"
                style={{ opacity: 1 }}
              >
                {effect.kind === "perfect" ? "✨" : "⭐"}
              </div>
            </div>
          );
        })}

        {/* Nada jatuh */}
        {song.notes.map((note, index) => {
          if (noteStatus[index] === "hit") return null;
          const center = ((elapsed - (noteTimes[index] - TRAVEL_TIME)) / TRAVEL_TIME) * TARGET_Y;
          if (center < -NOTE_H || center > BOARD_HEIGHT - PAD_H + NOTE_H / 2) return null;

          const lane = LANES[note.lane];
          const missed = noteStatus[index] === "miss";
          return (
            <div
              key={`${song.id}-${index}`}
              className="pointer-events-none absolute left-0 top-0 z-20 flex justify-center"
              style={{
                width: "25%",
                height: NOTE_H,
                marginLeft: `${note.lane * 25}%`,
                transform: `translateY(${center - NOTE_H / 2}px)`,
                opacity: missed ? 0.35 : 1,
                filter: missed ? "grayscale(1)" : "none",
              }}
            >
              <div
                className={`flex h-full w-[86%] items-center justify-center rounded-2xl border-[3px] border-white text-xl font-black ${
                  note.isQuestion ? "golden-note" : ""
                }`}
                style={
                  note.isQuestion
                    ? {
                        background: "linear-gradient(180deg,#fef08a,#f59e0b)",
                        color: "#7c2d12",
                        boxShadow: "0 0 22px rgba(253,224,71,0.95), inset 0 3px 0 rgba(255,255,255,0.6)",
                      }
                    : {
                        background: `linear-gradient(180deg, ${lane.color}, ${lane.dark})`,
                        color: "#fff",
                        boxShadow: `0 0 14px ${lane.glow}, inset 0 3px 0 rgba(255,255,255,0.45)`,
                      }
                }
              >
                {note.isQuestion ? "★" : lane.key}
              </div>
            </div>
          );
        })}

        {/* Tuts piano di bawah */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-30 grid grid-cols-4 gap-1.5 bg-indigo-950 p-1.5"
          style={{ height: PAD_H }}
        >
          {LANES.map((lane, index) => {
            const pressed = activeKey === lane.key;
            return (
              <div
                key={lane.key}
                className="flex flex-col items-center justify-between rounded-2xl border-4 border-white/80 py-2 text-white transition-transform duration-100"
                style={{
                  background: `linear-gradient(180deg, ${lane.color}, ${lane.dark})`,
                  boxShadow: pressed ? `0 0 24px ${lane.glow}` : `0 5px 0 ${lane.dark}`,
                  transform: pressed ? "translateY(4px) scale(0.96)" : "none",
                  filter: pressed ? "brightness(1.25)" : "none",
                }}
              >
                <span className="text-xs font-bold opacity-90">{song.lanePitches[index]}</span>
                <span className="text-3xl font-black drop-shadow">{lane.key}</span>
              </div>
            );
          })}
        </div>

        {/* Combo besar */}
        {combo >= 3 && (
          <div
            key={combo}
            className="anim-pop pointer-events-none absolute inset-x-0 top-8 z-30 text-center"
          >
            <p className="text-5xl font-black text-yellow-300 drop-shadow-[0_3px_0_rgba(0,0,0,0.5)]">{combo}</p>
            <p className="text-xs font-black tracking-[0.3em] text-white">COMBO</p>
          </div>
        )}

        {/* Penilaian */}
        {judge && (
          <div
            key={judge.id}
            className="fx-judge pointer-events-none absolute inset-x-0 z-40 text-center text-4xl font-black drop-shadow-[0_3px_0_rgba(0,0,0,0.5)]"
            style={{
              top: 170,
              color:
                judge.type === "Perfect" ? "#fde047" : judge.type === "Good" ? "#67e8f9" : "#fda4af",
            }}
          >
            {judge.type === "Perfect" ? "PERFECT!" : judge.type === "Good" ? "GOOD!" : "MISS"}
          </div>
        )}

        {/* Hitung mundur */}
        {isCountdownActive && (
          <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-indigo-950/50">
            <div className="text-center">
              <p className="text-lg font-black tracking-widest text-yellow-300">BERSIAP!</p>
              <p key={countdown} className="anim-count fk-title text-9xl font-black">
                {countdown > 0 ? countdown : "GO!"}
              </p>
            </div>
          </div>
        )}

        {/* Overlay jeda / selesai */}
        {showOverlay && (
          <div className="absolute inset-0 z-50 flex items-center justify-center overflow-y-auto bg-indigo-950/90 p-5 backdrop-blur-sm">
            {isFinished ? (
              <div className="anim-pop w-full max-w-sm text-center">
                <div className="flex justify-center gap-2 text-6xl">
                  {[1, 2, 3].map((n) => (
                    <span
                      key={n}
                      className={n <= stars ? "anim-star" : "opacity-25 grayscale"}
                      style={{ animationDelay: `${n * 0.25}s` }}
                    >
                      ⭐
                    </span>
                  ))}
                </div>
                <h2 className="fk-title mt-3 text-4xl font-black">Lagu Selesai!</h2>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-bold">
                  <div className="card-cartoon p-2">Skor<br /><span className="text-xl text-yellow-300">{score.toLocaleString("id-ID")}</span></div>
                  <div className="card-cartoon p-2">Akurasi<br /><span className="text-xl text-green-300">{accuracy}%</span></div>
                  <div className="card-cartoon p-2">Combo terbaik<br /><span className="text-xl text-pink-300">{bestCombo}</span></div>
                  <div className="card-cartoon p-2">Perfect<br /><span className="text-xl text-cyan-300">{perfectCount}</span></div>
                </div>
                <p className="mt-3 rounded-xl bg-white/15 p-2 text-sm font-bold">
                  📘 Kuis benar: {quizRight} dari {quizAsked}
                </p>
                <div className="mt-4 grid gap-2">
                  <button onClick={() => void startGame()} className="btn-3d btn-green px-4 py-3 text-lg">
                    ↻ Main Lagi
                  </button>
                  <button onClick={() => leaveGame("songs")} className="btn-3d btn-purple px-4 py-3">
                    🎵 Pilih Lagu Lain
                  </button>
                  <button onClick={() => leaveGame("menu")} className="btn-3d btn-ghost px-4 py-2 text-sm">
                    Menu Utama
                  </button>
                </div>
              </div>
            ) : isPaused ? (
              <div className="anim-pop w-full max-w-xs text-center">
                <div className="text-6xl">⏸</div>
                <h2 className="fk-title mt-2 text-4xl font-black">Jeda</h2>
                <div className="mt-5 grid gap-2">
                  <button onClick={resumeGame} className="btn-3d btn-green px-4 py-3 text-lg">
                    ▶ Lanjut Main
                  </button>
                  <button onClick={() => void startGame()} className="btn-3d btn-yellow px-4 py-3">
                    ↻ Ulang dari Awal
                  </button>
                  <button onClick={() => leaveGame("songs")} className="btn-3d btn-ghost px-4 py-2 text-sm">
                    Pilih Lagu Lain
                  </button>
                </div>
              </div>
            ) : (
              <div className="anim-pop w-full max-w-xs text-center">
                <div className="anim-bob text-6xl">🎹</div>
                <h2 className="fk-title mt-2 text-3xl font-black">Siap Main?</h2>
                <button onClick={() => void startGame()} className="btn-3d btn-green mt-5 w-full px-4 py-3 text-lg">
                  ▶ Mulai
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <p aria-live="polite" className="mt-3 min-h-6 text-center text-sm font-bold text-white/90">
        {message}
      </p>
      <p className="mt-1 text-center text-xs font-semibold text-white/65">
        Tekan A S K L atau sentuh jalurnya · Nada ★ emas = kuis English
      </p>

      {/* Kuis (layar penuh agar mudah dibaca) */}
      {isQuizOpen && quizQuestion && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-indigo-950/90 p-3 backdrop-blur-md sm:items-center">
          <div className="card-cartoon my-auto w-full max-w-lg border-yellow-200/80 bg-indigo-900/90 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full bg-yellow-300 px-3 py-1.5 text-xs font-black text-indigo-950">
                ★ KUIS ENGLISH
              </span>
              <div
                className={`rounded-2xl border-2 px-3 py-1 text-center ${
                  quizTimeLeft <= 10
                    ? "anim-shake border-rose-300 bg-rose-500/30 text-rose-100"
                    : "border-cyan-200 bg-cyan-300/20 text-cyan-100"
                }`}
                aria-label={`${quizTimeLeft} detik tersisa`}
              >
                <p className="text-[10px] font-bold tracking-widest">WAKTU</p>
                <p className="text-xl font-black tabular-nums">{quizTimeLeft}s</p>
              </div>
            </div>

            <div className="mt-3 h-3 overflow-hidden rounded-full bg-black/30">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  quizTimeLeft <= 10 ? "bg-rose-400" : "bg-gradient-to-r from-yellow-300 to-orange-400"
                }`}
                style={{ width: `${(quizTimeLeft / QUIZ_SECONDS) * 100}%` }}
              />
            </div>

            <div className="mt-3 flex items-center justify-between text-xs font-bold">
              <span>SOAL {currentQuestionIndex + 1} / {quizQuestions.length}</span>
              <span className="text-white/70">
                {quizRewardEnabled ? `Benar = +${QUIZ_BONUS} poin ⭐` : "Tanpa bonus (nada terlewat)"}
              </span>
            </div>
            <div className="mt-1.5 flex gap-1.5">
              {quizQuestions.map((q, index) => (
                <div
                  key={q.id}
                  className={`h-2 flex-1 rounded-full ${
                    index < currentQuestionIndex
                      ? "bg-emerald-400"
                      : index === currentQuestionIndex
                        ? "bg-yellow-300"
                        : "bg-white/20"
                  }`}
                />
              ))}
            </div>

            <div className="mt-4">
              <QuizCard
                key={quizQuestion.id}
                question={quizQuestion}
                status={quizStatus}
                wrongCount={quizWrongCount}
                locked={quizLocked}
                bonusText={quizRewardEnabled ? `+${QUIZ_BONUS} poin bonus!` : undefined}
                isLast={currentQuestionIndex + 1 >= quizQuestions.length}
                onSubmit={submitAnswer}
                onNext={nextQuestion}
              />
            </div>
            <p className="mt-3 text-center text-[11px] text-white/60">
              Waktu berhenti sebentar saat kamu membaca penjelasan. ⏱
            </p>
          </div>
        </div>
      )}
    </Screen>
  );
}
