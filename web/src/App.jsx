import React, { useState, useEffect } from 'react'
import { Info } from 'lucide-react'
import ImageView from './components/ImageView'
import Timestamp from './components/Timestamp'
import GuessInput from './components/GuessInput'
import ShareStats from './components/ShareStats'
import Modal from './components/Modal'
import Hints from './components/Hints'
import { getTodayGame, submitGuess, revealAnswer, getTmdbPoster, getHints, submitTelemetry, getGlobalStats } from './services/api'
import { useGameLogic } from './hooks/useGameLogic'
import { useStats } from './hooks/useStats'
import StatsDisplay from './components/StatsDisplay'

export default function App() {
  const [gameInfo, setGameInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [frameLoadError, setFrameLoadError] = useState(false)
  const [shakeError, setShakeError] = useState(false)
  const [globalStats, setGlobalStats] = useState(null)

  // Game state stored in localStorage
  const { guesses, timestamps, gameState, addGuess, addTimestamp, replaceLastTimestamp } = useGameLogic(gameInfo?.game_id)
  const { stats, recordGameResult } = useStats()

  const currentTimestamp = timestamps.length > 0 ? timestamps[timestamps.length - 1] : null
  const displayTimestamp = timestamps.length > guesses.length ? currentTimestamp : null

  // Answer state for game over
  const [answerData, setAnswerData] = useState(null)
  const [answerPoster, setAnswerPoster] = useState(null)
  const [hints, setHints] = useState({})

  // Fetch today's game on mount
  useEffect(() => {
    async function loadGame() {
      const info = await getTodayGame()
      if (info) {
        setGameInfo(info)
        // If not playing (won/lost), show the end modal immediately on load
        if (gameState !== 'PLAYING') {
          setShowModal(true)
        }
      }
      setLoading(false)
    }
    loadGame()
  }, [gameState, guesses.length])

  // Fetch answer when game is over
  useEffect(() => {
    if (gameState !== 'PLAYING' && !answerData) {
      revealAnswer().then(data => {
        if (data) {
          setAnswerData(data)
          getTmdbPoster(data.title, data.release_year).then(url => {
            if (url) setAnswerPoster(url)
          })
        }
      })
    }
  }, [gameState, answerData])

  // Fetch hints based on incorrect guesses
  useEffect(() => {
    if (gameInfo && guesses.length >= 2) {
      getHints(gameInfo.game_id, guesses.length).then(data => {
        if (data) setHints(data)
      })
    }
  }, [guesses.length, gameInfo])

  // Handle game end: save local stats and fetch global telemetry
  useEffect(() => {
    if (gameInfo && (gameState === 'WON' || gameState === 'LOST')) {
      const isWin = gameState === 'WON'
      const finalGuessCount = isWin ? guesses.length : 6

      // Local Stats
      recordGameResult(gameInfo.game_id, gameInfo.game_date, isWin, finalGuessCount)

      // Global Telemetry
      const submitAndFetch = async () => {
        const telemetryFlag = `framedle_telemetry_${gameInfo.game_id}`
        if (!localStorage.getItem(telemetryFlag)) {
          await submitTelemetry(gameInfo.game_id, finalGuessCount)
          localStorage.setItem(telemetryFlag, 'true')
        }
        const gStats = await getGlobalStats(gameInfo.game_id)
        setGlobalStats(gStats)
      }
      submitAndFetch()
    }
  }, [gameState, gameInfo]) // Only triggers when gameState changes

  const handleGuessSubmit = async (guessTitle) => {
    setIsSubmitting(true)
    const isCorrect = await submitGuess(gameInfo.game_id, guessTitle)
    setIsSubmitting(false)

    if (!isCorrect && !gameState === 'WON') {
      setShakeError(true)
      setTimeout(() => setShakeError(false), 500)
    } else if (!isCorrect && guesses.length < 5) {
      setShakeError(true)
      setTimeout(() => setShakeError(false), 500)
    }

    addGuess(guessTitle, isCorrect)
    setFrameLoadError(false) // reset error on new guess round

    // Automatically show modal if game ends after this guess
    if (isCorrect || guesses.length === 4) { // 4 because state hasn't updated to 5 yet
      setTimeout(() => setShowModal(true), 1500)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6">
        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="timestamp! Logo" className="h-20 w-20 object-contain animate-pulse" />
        <h1 className="text-3xl font-bold tracking-tight font-gilroy text-[#FAF9F6]">timestamp!</h1>
        <div className="w-8 h-8 border-4 border-[#E50914] border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!gameInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-white/50">
        No game available today.
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-background text-white flex flex-col font-sans transition-all overflow-x-hidden ${shakeError ? 'animate-error-shake' : ''}`}>

      {/* Header */}
      <header className="flex-none p-4 md:p-6 flex items-center justify-between border-b border-white/5 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="timestamp! Logo" className="h-8 w-8 object-contain" />
          <h1 className="text-2xl font-bold tracking-tight font-gilroy text-[#FAF9F6]">timestamp!</h1>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-full transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-6 flex flex-col justify-center">

        {/* Guesses Status */}
        <div className="flex justify-center space-x-2 mb-6">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`h-2 w-12 rounded-full transition-colors ${i < guesses.length
                ? (guesses[i].isCorrect ? 'bg-success' : 'bg-error')
                : 'bg-surface border border-white/10'
                }`}
            />
          ))}
        </div>

        {/* Cinematic Frame */}
        <div className="mb-6">
          <ImageView
            r2FolderName={gameInfo.r2_folder_name}
            timestampSeconds={displayTimestamp}
            gameInfo={gameInfo}
            guessesCount={guesses.length}
            onError={() => setFrameLoadError(true)}
          />
        </div>

        {/* Controls */}
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <Timestamp
              valueSeconds={currentTimestamp}
              onChange={(val) => {
                if (frameLoadError) {
                  replaceLastTimestamp(val)
                  setFrameLoadError(false)
                } else if (timestamps.length <= guesses.length) {
                  addTimestamp(val)
                }
              }}
              disabled={gameState !== 'PLAYING' || (timestamps.length > guesses.length && !frameLoadError)}
              minSeconds={330} // Skip first 5:30 mins
              maxSeconds={(() => {
                const rawRatio = gameInfo.frame_count / gameInfo.runtime_seconds
                let exactRatio = 1.0
                if (rawRatio < 0.75) exactRatio = 0.5
                else if (rawRatio < 1.5) exactRatio = 1.0
                else exactRatio = 2.0

                const runtimeMax = gameInfo.runtime_seconds - 600
                const availableMax = Math.floor(gameInfo.frame_count / exactRatio)
                return Math.min(runtimeMax, availableMax)
              })()}
            />

            <div className="mt-1 text-center text-xs font-medium h-5 flex items-center justify-center transition-all">
              {frameLoadError ? (
                <p className="text-error animate-pulse">
                  That frame couldn't be loaded. Try a different timestamp!
                </p>
              ) : timestamps.length > guesses.length && gameState === 'PLAYING' ? (
                <p className="text-[#E50914] animate-pulse">
                  Submit a guess to unlock your next frame!
                </p>
              ) : gameState === 'PLAYING' ? (
                <p className="text-white/40 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  First & last few mins omitted to avoid possible title/endcard spoilers.
                </p>
              ) : null}
            </div>
          </div>

          <GuessInput
            onSubmit={handleGuessSubmit}
            disabled={gameState !== 'PLAYING'}
            isSubmitting={isSubmitting}
            guesses={guesses}
          />

          <Hints hints={hints} />

        </div>

      </main>

      {/* Footer */}
      <footer className="pb-4 text-center text-xs text-white/30 font-medium tracking-wide">
        created by seiji0z
      </footer>

      {/* Game Over / Info Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={gameState === 'PLAYING' ? 'How to Play' : (gameState === 'WON' ? 'You Won!' : 'Game Over')}
      >
        {gameState === 'PLAYING' ? (
          <div className="space-y-4 text-white/80 leading-relaxed">
            <p>1. Type a timestamp (HH:MM:SS) to jump around the movie. The earliest you can start is 00:05:30 to avoid early title screens. If you enter a time lower than 5:30, it will automatically default to 5:30.</p>
            <p>2. Look at the frame shown at your chosen time and try to guess the movie title.</p>
            <p>3. You have 5 guesses. Use the autocomplete to find valid movies.</p>
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-3 rounded-lg text-sm mt-2">
              <span className="font-semibold block mb-1">⚠️ Note on Timestamps:</span>
              Timestamps are approximate. Due to different theatrical cuts, regional frame rates, and skipped title sequences, the exact frame shown may be slightly shifted from your timestamp.
            </div>
            <p className="text-sm text-white/50 mt-4 border-t border-white/10 pt-4">
              * A new movie is automatically selected every day at Midnight UTC.
            </p>
          </div>
        ) : (
          <div className="space-y-4 text-center">

            {/* The Answer Reveal */}
            {answerData && (
              <div className="flex flex-row items-center justify-center gap-4 mb-2 p-3 bg-surface/50 rounded-xl border border-white/5 mx-auto max-w-sm">
                {answerPoster && (
                  <img src={answerPoster} alt={answerData.title} className="w-16 h-24 object-cover rounded shadow-md" />
                )}
                <div className="flex flex-col text-left">
                  <p className="text-[10px] text-white/50 mb-1 uppercase tracking-widest">Today's Movie</p>
                  <h2 className="text-xl font-bold text-white leading-tight">{answerData.title}</h2>
                  <p className="text-white/50 text-sm mt-1">{answerData.release_year}</p>
                </div>
              </div>
            )}

            <p className="text-lg font-medium">
              {gameState === 'WON'
                ? `You guessed the movie in ${guesses.length} ${guesses.length === 1 ? 'try' : 'tries'}!`
                : 'Better luck next time!'}
            </p>

            <StatsDisplay 
              stats={stats} 
              globalStats={globalStats} 
              gameState={gameState} 
              guesses={guesses} 
            />

            <div>
              <ShareStats guesses={guesses} gameState={gameState} />
            </div>

            <p className="text-xs text-white/50 border-t border-white/10 pt-4 mt-2 font-medium">
              A new movie is selected every day at Midnight UTC. Come back tomorrow!
            </p>
          </div>
        )}
      </Modal>
    </div>
  )
}