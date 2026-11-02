import React, { useEffect, useState } from "react";

export const ScoreRing = ({
  initialScore = 54,
  targetScore = 91,
  size = 140,
  strokeWidth = 10,
  label = "SEO Health",
  animate = true,
}) => {
  const [animatedScore, setAnimatedScore] = useState(initialScore);

  useEffect(() => {
    if (!animate) {
      return;
    }

    const duration = 1200;
    const startTime = performance.now();

    const updateScore = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.round(initialScore + (targetScore - initialScore) * ease);
      setAnimatedScore(current);

      if (progress < 1) {
        requestAnimationFrame(updateScore);
      }
    };

    const handle = requestAnimationFrame(updateScore);
    return () => cancelAnimationFrame(handle);
  }, [initialScore, targetScore, animate]);

  const score = animate ? animatedScore : targetScore;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div
      className="relative flex flex-col items-center justify-center select-none"
      style={{ width: size, height: size }}
      aria-label={`${label} score: ${score} out of 100`}
    >
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-black/5 dark:text-white/10"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#score-gradient)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="none"
          style={{ transition: "stroke-dashoffset 200ms ease" }}
        />
        <defs>
          <linearGradient id="score-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-sans font-extrabold text-3xl tracking-tighter text-slate-900 dark:text-white">
          {score}
        </span>
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          / 100
        </span>
      </div>
    </div>
  );
};
