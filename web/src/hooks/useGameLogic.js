import { useState, useEffect } from 'react'

export function useGameLogic(gameId) {
  const [guesses, setGuesses] = useState([])
  const [timestamps, setTimestamps] = useState([])
  const [gameState, setGameState] = useState('PLAYING') // 'PLAYING', 'WON', 'LOST'

  useEffect(() => {
    if (!gameId) return

    // Load from local storage
    const stored = localStorage.getItem(`framedle_${gameId}`)
    if (stored) {
      const parsed = JSON.parse(stored)
      setGuesses(parsed.guesses || [])
      setTimestamps(parsed.timestamps || [])
      setGameState(parsed.gameState || 'PLAYING')
    }
  }, [gameId])

  useEffect(() => {
    if (!gameId) return
    // Save to local storage
    localStorage.setItem(`framedle_${gameId}`, JSON.stringify({ guesses, timestamps, gameState }))
  }, [guesses, timestamps, gameState, gameId])

  const addGuess = (guessTitle, isCorrect) => {
    if (gameState !== 'PLAYING') return

    const newGuesses = [...guesses, { title: guessTitle, isCorrect }]
    setGuesses(newGuesses)

    if (isCorrect) {
      setGameState('WON')
    } else if (newGuesses.length >= 5) {
      setGameState('LOST')
    }
  }

  const addTimestamp = (ts) => {
    if (gameState !== 'PLAYING') return
    setTimestamps([...timestamps, ts])
  }

  return {
    guesses,
    timestamps,
    gameState,
    addGuess,
    addTimestamp
  }
}