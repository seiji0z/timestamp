import React, { useState } from 'react';
import { Calendar, Film, User } from 'lucide-react';

export default function Hints({ hints }) {
  const [revealed, setRevealed] = useState({
    decade: false,
    genre: false,
    director: false
  });

  if (!hints || Object.keys(hints).length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 w-full mb-4">
      {hints.decade && (
        <HintBadge
          label="Decade"
          value={`${hints.decade}s`}
          isRevealed={revealed.decade}
          onReveal={() => setRevealed(prev => ({ ...prev, decade: true }))}
          icon={<Calendar className="w-4 h-4" />}
          colorTheme="blue"
        />
      )}
      {hints.genre && (
        <HintBadge
          label="Genre"
          value={hints.genre}
          isRevealed={revealed.genre}
          onReveal={() => setRevealed(prev => ({ ...prev, genre: true }))}
          icon={<Film className="w-4 h-4" />}
          colorTheme="purple"
        />
      )}
      {hints.director && (
        <HintBadge
          label="Director"
          value={hints.director}
          isRevealed={revealed.director}
          onReveal={() => setRevealed(prev => ({ ...prev, director: true }))}
          icon={<User className="w-4 h-4" />}
          colorTheme="amber"
        />
      )}
    </div>
  );
}

function HintBadge({ label, value, isRevealed, onReveal, icon, colorTheme }) {

  const themes = {
    blue: {
      revealed: 'bg-blue-500/30 text-blue-100 border-blue-500/30',
      unrevealed: 'bg-blue-500/20 text-blue-200 border-blue-500/50 shadow-[0_0_12px_rgba(59,130,246,0.6)] animate-pulse hover:bg-blue-500/30 cursor-pointer'
    },
    purple: {
      revealed: 'bg-purple-500/30 text-purple-100 border-purple-500/30',
      unrevealed: 'bg-purple-500/20 text-purple-200 border-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.6)] animate-pulse hover:bg-purple-500/30 cursor-pointer'
    },
    amber: {
      revealed: 'bg-amber-500/30 text-amber-100 border-amber-500/30',
      unrevealed: 'bg-amber-500/20 text-amber-200 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.6)] animate-pulse hover:bg-amber-500/30 cursor-pointer'
    }
  };

  const theme = themes[colorTheme] || themes.blue;

  if (isRevealed) {
    return (
      <div className={`flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-sm transition-all duration-300 ${theme.revealed}`}>
        <span className="opacity-80">{icon}</span>
        <span className="font-semibold tracking-wide text-sm animate-in fade-in zoom-in duration-300">{value}</span>
      </div>
    );
  }

  return (
    <button
      onClick={onReveal}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-sm transition-all duration-300 outline-none ${theme.unrevealed}`}
      title={`Reveal ${label} Hint`}
    >
      <span className="opacity-90">{icon}</span>
      <span className="font-medium tracking-wide text-xs">
        Hint Unlocked! <span className="opacity-70 font-normal">({label})</span>
      </span>
    </button>
  );
}
