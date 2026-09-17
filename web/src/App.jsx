import React, { useState, useEffect } from 'react'
import { Film } from 'lucide-react'
import ImageView from './components/ImageView'
import Timestamp from './components/Timestamp'
import GuessInput from './components/GuessInput'
import ShareStats from './components/ShareStats'
import Modal from './components/Modal'
import { getTodayGame, submitGuess, revealAnswer, getTmdbPoster } from './services/api'
import { useGameLogic } from './hooks/useGameLogic'

export default function App() {
  const [gameInfo, setGameInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentTimestamp, setCurrentTimestamp] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showModal, setShowModal] = useState(false)
  
  // Game state stored in localStorage
  const { guesses, gameState, addGuess, resetGame } = useGameLogic()

  // Answer state for game over
  const [answerData, setAnswerData] = useState(null)
  const [answerPoster, setAnswerPoster] = useState(null)

  // Fetch today's game on mount
  useEffect(() => {
    async function loadGame() {
      const info = await getTodayGame()
      if (info) {
        setGameInfo(info)
        // If not playing (won/lost), show the end modal immediately on load
        if (gameState !== 'PLAYING') {
          setShowModal(true)
        } else {
          // Initialize to middle of the movie if no guesses yet
          if (guesses.length === 0) {
            setCurrentTimestamp(Math.floor(info.runtime_seconds / 2))
          }
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

  const handleGuessSubmit = async (guessTitle) => {
    setIsSubmitting(true)
    const isCorrect = await submitGuess(guessTitle)
    setIsSubmitting(false)

    addGuess(guessTitle, isCorrect)
    
    // Automatically show modal if game ends after this guess
    if (isCorrect || guesses.length === 4) { // 4 because state hasn't updated to 5 yet
      setTimeout(() => setShowModal(true), 1500)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
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
    <div className="min-h-screen bg-background flex flex-col font-sans">
      
      {/* Header */}
      <header className="flex-none p-4 md:p-6 flex items-center justify-between border-b border-white/5 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Film className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">Framedle</h1>
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
        <div className="mb-8">
          <ImageView
            r2FolderName={gameInfo.r2_folder_name}
            timestampSeconds={currentTimestamp}
          />
        </div>

        {/* Controls */}
        <div className="space-y-6">
          <Timestamp
            valueSeconds={currentTimestamp}
            onChange={setCurrentTimestamp}
            disabled={gameState !== 'PLAYING'}
            minSeconds={300} // Skip first 5 mins (hide possible title card)
            maxSeconds={gameInfo.runtime_seconds - 600} // Skip last 10 mins (hide possible ending titles)
          />

          <GuessInput
            onSubmit={handleGuessSubmit}
            disabled={gameState !== 'PLAYING'}
            isSubmitting={isSubmitting}
          />
        </div>

      </main>

      {/* Game Over / Info Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={gameState === 'PLAYING' ? 'How to Play' : (gameState === 'WON' ? 'You Won!' : 'Game Over')}
      >
        {gameState === 'PLAYING' ? (
          <div className="space-y-4 text-white/80 leading-relaxed">
            <p>1. Type a timestamp (HH:MM:SS) to jump around the movie.</p>
            <p>2. Look at the frame and try to guess the movie title.</p>
            <p>3. You have 5 guesses. Use the autocomplete to find valid movies.</p>
            <p className="text-sm text-white/50 mt-4 border-t border-white/10 pt-4">
              * A new movie is automatically selected every day at Midnight UTC.
            </p>
          </div>
        ) : (
          <div className="space-y-6 text-center pt-2">
            
            {/* The Answer Reveal */}
            {answerData && (
              <div className="flex flex-col items-center justify-center mb-6 p-4 bg-surface/50 rounded-xl border border-white/5">
                <p className="text-sm text-white/50 mb-3 uppercase tracking-widest">Today's Movie</p>
                {answerPoster && (
                  <img src={answerPoster} alt={answerData.title} className="w-32 h-48 object-cover rounded shadow-lg mb-4" />
                )}
                <h2 className="text-2xl font-bold text-white">{answerData.title}</h2>
                <p className="text-white/50">{answerData.release_year}</p>
              </div>
            )}

            <p className="text-lg">
              {gameState === 'WON'
                ? `You guessed the movie in ${guesses.length} ${guesses.length === 1 ? 'try' : 'tries'}!`
                : 'Better luck next time!'}
            </p>

            <ShareStats guesses={guesses} gameState={gameState} />
          </div>
        )}
      </Modal>
    </div>
  )
}