"use client";

import { useState, type CSSProperties } from "react";
import type { EnglishQuestion } from "@/types/game";
import { isCorrectAnswer } from "@/data/questions";

type Props = {
  question: EnglishQuestion;
  status: "idle" | "wrong" | "correct";
  wrongCount: number;
  locked: boolean;
  bonusText?: string;
  isLast: boolean;
  onSubmit: (answer: string) => void;
  onNext: () => void;
};

const TYPE_LABEL: Record<EnglishQuestion["type"], string> = {
  "multiple-choice": "📝 Pilih jawaban yang benar",
  "complete-sentence": "✏️ Lengkapi kalimatnya",
  "sentence-builder": "🧩 Susun kata jadi kalimat",
  "true-false": "✅❌ Benar atau Salah?",
};

const OPTION_COLORS = ["#f472b6", "#fbbf24", "#4ade80", "#38bdf8"];

export default function QuizCard({
  question,
  status,
  wrongCount,
  locked,
  bonusText,
  isLast,
  onSubmit,
  onNext,
}: Props) {
  const [words, setWords] = useState<string[]>([]);
  const [wrongPicked, setWrongPicked] = useState<string[]>([]);

  const options = question.options ?? [];
  const isBuilder = question.type === "sentence-builder";
  const isTF = question.type === "true-false";

  const pick = (option: string) => {
    if (locked) return;
    if (!isCorrectAnswer(option, question)) {
      setWrongPicked((previous) =>
        previous.includes(option) ? previous : [...previous, option],
      );
    }
    onSubmit(option);
  };

  const submitSentence = () => {
    if (locked || words.length === 0) return;
    onSubmit(words.join(" "));
  };

  return (
    <div className="anim-pop w-full">
      {/* Rumus selalu terlihat */}
      <div className="mb-3 rounded-2xl border-2 border-yellow-200/70 bg-yellow-300/20 px-3 py-2 text-center text-sm font-bold text-yellow-100">
        💡 <span className="text-white">will</span> = akan &nbsp;•&nbsp; Subject +{" "}
        <span className="text-white">will</span> + V1 (kata kerja dasar)
      </div>

      <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-bold tracking-wide">
        {TYPE_LABEL[question.type]}
      </span>

      <h3 className="mt-3 text-xl font-bold leading-snug sm:text-2xl">
        {question.question}
      </h3>

      {question.translation && (
        <p className="mt-2 rounded-xl bg-black/25 px-3 py-2 text-sm italic text-cyan-100">
          🇮🇩 {question.translation}
        </p>
      )}

      {isBuilder ? (
        <div className="mt-4">
          <div className="flex min-h-14 flex-wrap gap-2 rounded-2xl border-2 border-dashed border-white/50 bg-black/25 p-3">
            {words.length === 0 ? (
              <span className="text-sm text-white/60">
                Ketuk kata di bawah untuk menyusun kalimat 👇
              </span>
            ) : (
              words.map((word, index) => (
                <button
                  key={`${word}-${index}`}
                  type="button"
                  disabled={locked}
                  onClick={() =>
                    setWords((previous) => previous.filter((_, i) => i !== index))
                  }
                  className="btn-3d btn-cyan px-3 py-1 text-sm"
                >
                  {word} ✕
                </button>
              ))
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {options.map((word, index) => {
              const used = words.filter((item) => item === word).length;
              const total = options
                .slice(0, index + 1)
                .filter((item) => item === word).length;
              const available = used < total;
              return (
                <button
                  key={`${word}-${index}`}
                  type="button"
                  disabled={!available || locked}
                  onClick={() => setWords((previous) => [...previous, word])}
                  className="btn-3d btn-yellow px-4 py-2 text-base"
                >
                  {word}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={locked}
              onClick={() => setWords([])}
              className="btn-3d btn-ghost px-4 py-3 text-sm"
            >
              Hapus
            </button>
            <button
              type="button"
              disabled={words.length === 0 || locked}
              onClick={submitSentence}
              className="btn-3d btn-green flex-1 px-4 py-3 text-base"
            >
              Cek Kalimat ✔
            </button>
          </div>
        </div>
      ) : (
        <div className={`mt-4 grid gap-3 ${isTF ? "grid-cols-2" : ""}`}>
          {options.map((option, index) => {
            const isWrong = wrongPicked.includes(option);
            const label = isTF
              ? option === "True"
                ? "✔ True (Benar)"
                : "✘ False (Salah)"
              : option;
            const colorClass = isTF
              ? option === "True"
                ? "btn-green"
                : "btn-red"
              : "";
            return (
              <button
                key={option}
                type="button"
                disabled={locked || isWrong}
                onClick={() => pick(option)}
                className={`btn-3d ${colorClass} flex items-center gap-3 px-4 py-3 text-left text-base ${
                  isWrong ? "line-through" : ""
                }`}
                style={
                  isTF
                    ? undefined
                    : ({ "--c": OPTION_COLORS[index % 4], "--d": "rgba(0,0,0,0.35)" } as CSSProperties)
                }
              >
                {!isTF && (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/80 text-sm font-black text-indigo-900">
                    {index + 1}
                  </span>
                )}
                <span className={isTF ? "w-full text-center" : ""}>{label}</span>
              </button>
            );
          })}
        </div>
      )}

      {status === "wrong" && (
        <div
          key={wrongCount}
          aria-live="polite"
          className="anim-shake mt-4 rounded-2xl border-2 border-orange-200/70 bg-orange-400/25 p-3 text-sm"
        >
          <p className="font-black">Belum tepat, coba lagi ya! 💪</p>
          <p className="text-xs text-white/80">(Not quite — try again!)</p>
          {question.hint && (
            <p className="mt-2 rounded-xl bg-black/25 p-2 font-semibold text-yellow-100">
              💡 Petunjuk: {question.hint}
            </p>
          )}
        </div>
      )}

      {status === "correct" && (
        <div
          aria-live="polite"
          className="anim-pop mt-4 rounded-2xl border-2 border-emerald-200/80 bg-emerald-400/25 p-3 text-sm"
        >
          <p className="text-lg font-black">🎉 Benar! (Correct!)</p>
          {bonusText && (
            <p className="font-bold text-yellow-200">⭐ {bonusText}</p>
          )}
          <p className="mt-2 font-semibold">
            Jawaban: <span className="text-yellow-100">{question.correctAnswer}</span>
          </p>
          {question.explanationId && (
            <p className="mt-2 rounded-xl bg-black/25 p-2">
              📘 {question.explanationId}
            </p>
          )}
          <p className="mt-2 text-xs text-white/80">🇬🇧 {question.explanation}</p>
          <button
            type="button"
            onClick={onNext}
            className="btn-3d btn-yellow mt-3 w-full px-4 py-3 text-base"
          >
            {isLast ? "Selesai ✔" : "Lanjut ▶"}
          </button>
        </div>
      )}
    </div>
  );
}
