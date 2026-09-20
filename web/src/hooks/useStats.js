import { useState, useEffect } from 'react'

const initialStats = {
  gamesPlayed: 0,
  wins: 0,
  currentStreak: 0,
  maxStreak: 0,
  distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
  lastPlayedGameId: null,
  lastWinDate: null
}

export function useStats() {
  const [stats, setStats] = useState(initialStats)

  // Load on mount
  useEffect(() => {
    const stored = localStorage.getItem('framedle_global_stats')
    if (stored) {
      try {
        setStats({ ...initialStats, ...JSON.parse(stored) })
      } catch (e) {
        console.error("Error parsing stats", e)
      }
    }
  }, [])

  const recordGameResult = (gameId, gameDate, isWin, guessCount) => {
    if (!gameId || !gameDate) return

    setStats(prev => {
      // Prevent double counting if they reload the page on the same day
      if (prev.lastPlayedGameId === gameId) return prev

      let newStreak = prev.currentStreak

      if (isWin) {
        if (prev.lastWinDate) {
          // Check if gameDate is exactly 1 day after lastWinDate
          const current = new Date(gameDate)
          const previous = new Date(prev.lastWinDate)
          const diffTime = Math.abs(current - previous)
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

          if (diffDays === 1) {
            newStreak += 1
          } else if (diffDays > 1) {
            newStreak = 1 // Streak broken
          }
        } else {
          newStreak = 1
        }
      } else {
        newStreak = 0 // Streak broken on loss
      }

      const newStats = {
        ...prev,
        gamesPlayed: prev.gamesPlayed + 1,
        wins: prev.wins + (isWin ? 1 : 0),
        currentStreak: newStreak,
        maxStreak: Math.max(prev.maxStreak, newStreak),
        lastPlayedGameId: gameId,
        lastWinDate: isWin ? gameDate : prev.lastWinDate
      }

      if (isWin && guessCount >= 1 && guessCount <= 5) {
        newStats.distribution = {
          ...prev.distribution,
          [guessCount]: (prev.distribution[guessCount] || 0) + 1
        }
      }

      localStorage.setItem('framedle_global_stats', JSON.stringify(newStats))
      return newStats
    })
  }

  return { stats, recordGameResult }
}
