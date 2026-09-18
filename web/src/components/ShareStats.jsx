import React, { useState } from 'react'
import { Share2, Check } from 'lucide-react'

export default function ShareStats({ guesses, gameState }) {
  const [copied, setCopied] = useState(false)

  const handleShare = () => {
    // Generate grid
    // 🟩 for correct, 🟥 for incorrect, ⬛ for unused (up to 5)
    let grid = ''
    for (let i = 0; i < 5; i++) {
      if (i < guesses.length) {
        grid += guesses[i].isCorrect ? '🟩' : '🟥'
      } else {
        grid += '⬛'
      }
    }

    const text = `timestamp!\n${grid}\nPlay at timestamp.com!`

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (gameState === 'PLAYING') return null

  return (
    <button
      onClick={handleShare}
      className="mt-6 flex items-center justify-center space-x-2 w-full max-w-sm mx-auto bg-[#E50914] hover:bg-[#E50914]/90 text-white py-3 px-6 rounded-lg font-semibold transition-all shadow-lg hover:shadow-[#E50914]/20"
    >
      {copied ? (
        <>
          <Check className="h-5 w-5" />
          <span>Copied to Clipboard!</span>
        </>
      ) : (
        <>
          <Share2 className="h-5 w-5" />
          <span>Share Result</span>
        </>
      )}
    </button>
  )
}