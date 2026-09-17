import React, { useState } from 'react'
import { Send, Loader2 } from 'lucide-react'

export default function GuessInput({ onSubmit, disabled, isSubmitting }) {
  const [guess, setGuess] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!guess.trim() || disabled || isSubmitting) return
    onSubmit(guess.trim())
    setGuess('')
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-sm mx-auto mt-4">
      <input
        type="text"
        disabled={disabled || isSubmitting}
        className="w-full bg-surface/50 border border-white/10 rounded-lg py-3 pl-4 pr-12 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        placeholder={disabled ? "Game Over" : "Guess the movie..."}
        value={guess}
        onChange={(e) => setGuess(e.target.value)}
      />
      <button
        type="submit"
        disabled={!guess.trim() || disabled || isSubmitting}
        className="absolute inset-y-0 right-0 flex items-center pr-3 text-white/50 hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Send className="h-5 w-5" />
        )}
      </button>
    </form>
  )
}