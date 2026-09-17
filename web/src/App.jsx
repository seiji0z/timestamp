import React, { useState, useEffect } from 'react'
import { Film, Info } from 'lucide-react'
import ImageView from './components/ImageView'
import Timestamp from './components/Timestamp'
import GuessInput from './components/GuessInput'
import ShareStats from './components/ShareStats'
import Modal from './components/Modal'
import { getTodayGame, submitGuess } from './services/api'
import { useGameLogic } from './hooks/useGameLogic'

function App() {
  const [gameInfo, setGameInfo] = useState(null)
  const [isLoadingGame, setIsLoadingGame] = useState(true)
  const [currentTimestamp, setCurrentTimestamp] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const { guesses, gameState, addGuess } = useGameLogic(gameInfo?.game_id)

  useEffect(() => {
    async function loadGame() {
      const data = await getTodayGame()
      if (data) {
        setGameInfo(data)
        // Auto-show modal if game is over
        const stored = localStorage.getItem(`framedle_${data.game_id}`)
        if (stored) {
          const parsed = JSON.parse(stored)
          if (parsed.gameState !== 'PLAYING') {
            setShowModal(true)
          }
        }
      }
      setIsLoadingGame(false)
    }
    loadGame()
  }, [])

  // Automatically show the modal when game ends
  useEffect(() => {
    if (gameState !== 'PLAYING') {
      setTimeout(() => setShowModal(true), 1500)
    }
  }, [gameState])

  const handleGuessSubmit = async (guessTitle) => {
    if (!gameInfo || gameState !== 'PLAYING') return

    setIsSubmitting(true)
    const isCorrect = await submitGuess(gameInfo.game_id, guessTitle)
    setIsSubmitting(false)

    addGuess(guessTitle, isCorrect)
  }

  if (isLoadingGame) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Film className="h-12 w-12 text-primary animate-pulse" />
      </div>
    )
  }

  if (!gameInfo) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center p-4 text-center">
        <h1 className="text-3xl font-bold mb-2">No Game Today</h1>
        <p className="text-white/60">Please check back later!</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-background relative selection:bg-primary/30">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center space-x-2">
          <Film className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">Framedle</h1>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-full transition-colors"
        >
          <Info className="h-5 w-5" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-6 flex flex-col justify-center">
        
        {/* Guesses Status */}
        <div className="flex justify-center space-x-2 mb-6">
          {[...Array(5)].map((_, i) => (
            <div 
              key={i} 
              className={`h-2 w-12 rounded-full transition-colors ${
                i < guesses.length 
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
            maxSeconds={gameInfo.runtime_seconds}
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
          <div className="space-y-4">
            <p>Guess the movie from the frames.</p>
            <ul className="list-disc pl-5 space-y-2 text-white/70">
              <li>Enter a timestamp to view a specific frame from the movie.</li>
              <li>You have 5 guesses to get the correct title.</li>
              <li>Use your movie knowledge and detective skills!</li>
            </ul>
          </div>
        ) : (
          <div className="space-y-6 text-center pt-2">
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

export default App