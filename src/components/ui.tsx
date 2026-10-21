import type { ReactNode } from "react";

const STARS = Array.from({ length: 40 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  top: (i * 53 + 7) % 100,
  size: 2 + (i % 3),
  delay: (i % 9) * 0.35,
}));

const FLOATERS = ["♪", "♫", "♬", "♩", "♪", "♫", "♬", "♩", "★", "♪", "♫", "♬"].map(
  (symbol, i) => ({
    symbol,
    left: (i * 83 + 5) % 94,
    delay: -(i * 1.7),
    duration: 12 + (i % 5) * 3,
    size: 22 + (i % 4) * 8,
  }),
);

export function Backdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg,#1e0b5c 0%,#43189c 50%,#7b2ec2 100%)",
      }}
    >
      {STARS.map((star, i) => (
        <span
          key={i}
          className="anim-twinkle absolute rounded-full bg-white"
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: star.size,
            height: star.size,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}
      {FLOATERS.map((item, i) => (
        <span
          key={i}
          className="anim-drift absolute font-black"
          style={{
            left: `${item.left}%`,
            fontSize: item.size,
            color: "rgba(255,255,255,0.18)",
            animationDelay: `${item.delay}s`,
            animationDuration: `${item.duration}s`,
          }}
        >
          {item.symbol}
        </span>
      ))}
      <div className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-fuchsia-400/25 blur-2xl" />
      <div className="absolute -right-20 top-1/3 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
    </div>
  );
}

export function Screen({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main className="font-game relative min-h-screen overflow-x-hidden text-white">
      <Backdrop />
      <div className={`relative z-10 mx-auto w-full ${className}`}>{children}</div>
    </main>
  );
}

export function HudStat({
  label,
  value,
  accent = "#fde047",
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="card-cartoon px-3 py-2 text-center">
      <p className="text-[10px] font-bold tracking-widest text-white/70">{label}</p>
      <p
        className="text-xl font-black tabular-nums sm:text-2xl"
        style={{ color: accent }}
      >
        {value}
      </p>
    </div>
  );
}
