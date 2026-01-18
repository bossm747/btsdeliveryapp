import { useState, useEffect } from "react";
import btsLogo from "@/assets/btslogo.png";

interface PreloaderProps {
  onLoadComplete: () => void;
}

export default function Preloader({ onLoadComplete }: PreloaderProps) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"loading" | "exit">("loading");
  const [captionIndex, setCaptionIndex] = useState(0);

  const captions = [
    "Initializing BTS Delivery...",
    "Loading delicious possibilities...",
    "Connecting to restaurants...",
    "Preparing your experience...",
    "Almost ready to serve!"
  ];

  const foodEmojis = ["🍕", "🍔", "🍟", "🌮", "🍜", "🍱", "🍣", "🥘", "🍝", "🍖"];

  // Progress animation - completes in 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2; // 50 steps * 100ms = 5 seconds
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Caption rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setCaptionIndex(prev => (prev + 1) % captions.length);
    }, 800);

    return () => clearInterval(interval);
  }, []);

  // Trigger exit and completion
  useEffect(() => {
    if (progress >= 100) {
      setPhase("exit");
      const timeout = setTimeout(() => {
        onLoadComplete();
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [progress, onLoadComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-gradient-to-br from-orange-600 via-green-800 to-yellow-600 overflow-hidden transition-opacity duration-500 ${
        phase === "exit" ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Floating food emojis background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {foodEmojis.map((emoji, i) => (
          <div
            key={i}
            className="absolute text-4xl md:text-6xl opacity-20 animate-bounce"
            style={{
              left: `${5 + i * 9}%`,
              top: `${10 + (i % 4) * 20}%`,
              animationDelay: `${i * 0.3}s`,
              animationDuration: `${2 + (i % 3)}s`
            }}
          >
            {emoji}
          </div>
        ))}
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-4">
        {/* Logo container with animation */}
        <div
          className={`relative transition-all duration-700 ease-out ${
            phase === "exit"
              ? "translate-x-[100vw] rotate-[360deg] scale-50 opacity-0"
              : "translate-x-0 rotate-0 scale-100 opacity-100"
          }`}
        >
          {/* Pulsing glow effect */}
          <div className="absolute inset-0 bg-orange-500/30 blur-3xl animate-pulse rounded-full scale-150" />

          {/* Logo circle */}
          <div className="relative w-48 h-48 md:w-64 md:h-64 rounded-full bg-white shadow-2xl p-6 flex items-center justify-center animate-pulse">
            <img
              src={btsLogo}
              alt="BTS Delivery"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Caption */}
        <div className="mt-8 text-center">
          <h2 className="text-xl md:text-2xl font-bold text-white mb-2 transition-opacity duration-300">
            {captions[captionIndex]}
          </h2>
          <p className="text-white/70 text-sm md:text-base">
            {progress < 100 ? "🚀 Getting everything ready..." : "✨ Welcome to BTS Delivery!"}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mt-8 w-64 md:w-80">
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 via-yellow-500 to-green-500 rounded-full transition-all duration-100 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-white/60 text-xs text-center mt-2">{Math.round(progress)}%</p>
        </div>

        {/* Loading dots */}
        <div className="mt-6 flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 bg-white/60 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
