import React, { useState, useEffect } from 'react'
import { Clock, Info } from 'lucide-react'

export default function Timestamp({ valueSeconds, onChange, disabled, minSeconds, maxSeconds }) {
  const [inputValue, setInputValue] = useState('')

  // Convert seconds to HH:MM:SS for display
  useEffect(() => {
    if (valueSeconds === undefined || valueSeconds === null) {
      setInputValue('')
      return
    }
    const h = Math.floor(valueSeconds / 3600).toString().padStart(2, '0')
    const m = Math.floor((valueSeconds % 3600) / 60).toString().padStart(2, '0')
    const s = (valueSeconds % 60).toString().padStart(2, '0')

    // Only show hours if it's > 0 to keep it clean, but for movies standard is HH:MM:SS
    setInputValue(`${h}:${m}:${s}`)
  }, [valueSeconds])

  const handleBlur = (e) => {
    let val = e.target.value.trim()
    if (!val) return

    // Parse MM:SS or HH:MM:SS
    const parts = val.split(':').map(n => parseInt(n) || 0)
    let seconds = 0
    if (parts.length === 3) {
      seconds = parts[0] * 3600 + parts[1] * 60 + parts[2]
    } else if (parts.length === 2) {
      seconds = parts[0] * 60 + parts[1]
    } else if (parts.length === 1) {
      seconds = parts[0] // user just typed seconds
    }

    // Clamp to maxSeconds if provided
    if (maxSeconds !== undefined && seconds > maxSeconds) {
      seconds = maxSeconds
    }

    // Clamp to minSeconds if provided
    if (minSeconds !== undefined && seconds < minSeconds) {
      seconds = minSeconds
    }

    if (onChange && seconds !== valueSeconds) {
      onChange(seconds)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleBlur(e)
    }
  }

  return (
    <div className="relative w-full max-w-sm mx-auto">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Clock className="h-5 w-5 text-white/40" />
        </div>
        <input
          type="text"
          disabled={disabled}
          className="w-full bg-surface/50 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#E50914] focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="HH:MM:SS (e.g. 01:15:30)"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
      </div>
    </div>
  )
}