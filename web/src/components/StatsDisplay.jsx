import React from 'react'
import { BarChart, Trophy, Target, Flame, Crown } from 'lucide-react'

export default function StatsDisplay({ stats, globalStats, gameState, guesses }) {
  const { gamesPlayed, wins, currentStreak, maxStreak, distribution } = stats || {}
  const winPercent = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0

  // Calculate max distribution value for bar chart scaling
  const maxDist = Math.max(...Object.values(distribution || {}), 1)

  // Calculate global comparison if available
  let globalComparison = null
  if (globalStats && globalStats.total > 0 && gameState === 'WON') {
    const guessCount = guesses.length
    const countForGuess = parseInt(globalStats[guessCount] || 0)
    const percentage = Math.round((countForGuess / globalStats.total) * 100)
    
    // Slight text variations based on percentage
    if (percentage <= 10) {
      globalComparison = `Incredible! Only ${percentage}% of players got it in ${guessCount} today.`
    } else if (percentage <= 30) {
      globalComparison = `Great job! Only ${percentage}% of players got it in ${guessCount} today.`
    } else {
      globalComparison = `You got it in ${guessCount}! ${percentage}% of players did the same today.`
    }
  }

  return (
    <div className="w-full flex flex-col gap-4 my-4 border-t border-white/10 pt-4">
      <div className="flex items-center gap-2 text-lg font-bold mb-1 justify-center">
        <BarChart className="w-4 h-4 text-white/50" />
        Statistics
      </div>

      <div className="flex justify-center gap-4 sm:gap-8">
        <StatBox label="Played" value={gamesPlayed || 0} icon={<Target className="w-4 h-4" />} />
        <StatBox label="Win %" value={winPercent} icon={<Trophy className="w-4 h-4" />} />
        <StatBox label="Streak" value={currentStreak || 0} icon={<Flame className="w-4 h-4 text-orange-400" />} />
        <StatBox label="Max" value={maxStreak || 0} icon={<Crown className="w-4 h-4 text-yellow-400" />} />
      </div>

      <div className="w-full max-w-sm mx-auto px-4">
        <h3 className="text-[10px] font-semibold text-white/50 mb-2 uppercase tracking-wider text-center">Guess Distribution</h3>
        <div className="flex flex-col gap-1.5">
          {[1, 2, 3, 4, 5].map((num) => {
            const count = distribution ? distribution[num] || 0 : 0
            const width = Math.max(7, Math.round((count / maxDist) * 100))
            const isCurrent = gameState === 'WON' && guesses.length === num
            
            return (
              <div key={num} className="flex items-center gap-2 text-sm">
                <div className="w-3 font-bold text-white/50 text-right">{num}</div>
                <div className="flex-1 bg-white/5 rounded-sm overflow-hidden h-5">
                  <div 
                    className={`h-full flex items-center px-2 font-bold justify-end transition-all duration-1000 ${isCurrent ? 'bg-green-500 text-white' : 'bg-white/20 text-white/80'}`}
                    style={{ width: `${width}%` }}
                  >
                    {count > 0 && count}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {globalComparison && (
        <div className="bg-white/5 rounded-lg p-3 text-center text-sm font-medium border border-white/10 text-green-300">
          {globalComparison}
        </div>
      )}
    </div>
  )
}

function StatBox({ label, value, icon }) {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="text-3xl font-bold flex items-center gap-1">{value}</div>
      <div className="text-xs uppercase tracking-wider text-white/50 flex items-center gap-1 mt-1">
        {icon}
        {label}
      </div>
    </div>
  )
}
