import React, { useState, useEffect, useRef } from 'react'
import { Search } from 'lucide-react'
import { fetchMovieCatalog, getTmdbPoster } from '../services/api'

export default function GuessInput({ onSubmit, disabled, isSubmitting, guesses = [] }) {
  const [query, setQuery] = useState('')
  const [catalog, setCatalog] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [errorMsg, setErrorMsg] = useState('')
  const [dropdownPos, setDropdownPos] = useState('bottom')
  const [posters, setPosters] = useState({}) // Cache for posters: { id: url }
  const dropdownRef = useRef(null)

  // Fetch catalog on mount
  useEffect(() => {
    fetchMovieCatalog().then(data => setCatalog(data || []))
  }, [])

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Dynamic dropdown positioning
  useEffect(() => {
    if (showDropdown && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom

      // If there's less than ~320px below (about 4-5 items) and more space above, flip to top
      if (spaceBelow < 320 && rect.top > spaceBelow) {
        setDropdownPos('top')
      } else {
        setDropdownPos('bottom')
      }
    }
  }, [showDropdown, suggestions.length])

  // Filter catalog and fetch posters
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([])
      return
    }

    const lowerQuery = query.toLowerCase()
    const guessedTitles = guesses.map(g => g.title.toLowerCase())
    const matches = catalog
      .filter(m => m.title.toLowerCase().includes(lowerQuery) && !guessedTitles.includes(m.title.toLowerCase()))
      .slice(0, 5) // Show top 5 matches

    setSuggestions(matches)
    setFocusedIndex(-1) // reset focus when suggestions change

    // Fetch posters for matches if not cached
    matches.forEach(m => {
      if (!posters[m.id]) {
        getTmdbPoster(m.title, m.release_year).then(url => {
          if (url) {
            setPosters(prev => ({ ...prev, [m.id]: url }))
          }
        })
      }
    })
  }, [query, catalog, posters])

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmedQuery = query.trim()
    if (!trimmedQuery || isSubmitting) return

    const lowerQuery = trimmedQuery.toLowerCase()

    if (guesses.some(g => g.title.toLowerCase() === lowerQuery)) {
      setErrorMsg('Already guessed!')
      return
    }

    const matchedMovie = catalog.find(m => m.title.toLowerCase() === lowerQuery)
    if (!matchedMovie) {
      setErrorMsg('Movie not found!')
      return
    }

    setErrorMsg('')
    onSubmit(matchedMovie.title)
    setQuery('')
    setShowDropdown(false)
  }

  const handleSelect = (movie) => {
    setQuery(movie.title)
    setShowDropdown(false)
    onSubmit(movie.title)
    setQuery('')
  }

  return (
    <div className="relative w-full max-w-lg mx-auto" ref={dropdownRef}>
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setErrorMsg('')
            setShowDropdown(true)
          }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              if (!showDropdown) setShowDropdown(true)
              setFocusedIndex(prev => Math.min(prev + 1, suggestions.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setFocusedIndex(prev => Math.max(prev - 1, -1))
            } else if (e.key === 'Enter') {
              if (showDropdown && focusedIndex >= 0 && suggestions[focusedIndex]) {
                e.preventDefault()
                handleSelect(suggestions[focusedIndex])
              }
            } else if (e.key === 'Escape') {
              setShowDropdown(false)
              setFocusedIndex(-1)
            }
          }}
          disabled={disabled || isSubmitting}
          placeholder="Guess the movie..."
          className="w-full bg-surface border border-white/10 rounded-full py-4 pl-6 pr-14 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#E50914] focus:border-transparent transition-all disabled:opacity-50 text-lg shadow-xl"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={disabled || !query.trim() || isSubmitting}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-[#E50914] text-white rounded-full hover:bg-[#E50914]/90 transition-colors disabled:opacity-50 disabled:hover:bg-[#E50914]"
        >
          <Search className="w-5 h-5" />
        </button>
      </form>

      {errorMsg && (
        <div className="absolute top-full mt-2 w-full text-center text-error text-sm font-medium animate-pulse">
          {errorMsg}
        </div>
      )}

      {/* Autocomplete Dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <div className={`absolute ${dropdownPos === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 right-0 bg-surface/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50 divide-y divide-white/5`}>
          {suggestions.map((movie, index) => (
            <div
              key={movie.id}
              onClick={() => handleSelect(movie)}
              className={`flex items-center gap-4 p-3 cursor-pointer transition-colors ${
                focusedIndex === index ? 'bg-white/20' : 'hover:bg-white/10'
              }`}
            >
              <div className="w-10 h-14 bg-black rounded shrink-0 overflow-hidden shadow">
                {posters[movie.id] ? (
                  <img src={posters[movie.id]} alt={movie.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/20 text-xs text-center">No Img</div>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-white font-medium">{movie.title}</span>
                <span className="text-white/50 text-sm">{movie.release_year}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}