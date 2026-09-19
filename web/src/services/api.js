import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function getTodayGame() {
  const { data, error } = await supabase
    .from('today_game_info')
    .select('*')
    .single()

  if (error) {
    console.error('Error fetching today game:', error)
    return null
  }
  return data
}

export async function submitGuess(gameId, guessTitle) {
  const { data, error } = await supabase.rpc('guess_movie', { p_game_id: gameId, p_guess_title: guessTitle })

  if (error) {
    console.error('Error validating guess:', error)
    return false
  }
  return data 
}

export async function fetchMovieCatalog() {
  const { data, error } = await supabase
    .from('public_movie_catalog')
    .select('*')
  
  if (error) {
    console.error('Error fetching catalog:', error)
    return []
  }
  return data
}

export async function revealAnswer() {
  const { data, error } = await supabase.rpc('reveal_answer')
  if (error || !data || data.length === 0) return null
  return data[0]
}

// Simple TMDB wrapper to get a poster URL
export async function getTmdbPoster(title, year) {
  const apiKey = import.meta.env.VITE_TMDB_API_KEY
  if (!apiKey) return null
  
  try {
    const query = encodeURIComponent(title)
    const yearParam = year ? `&primary_release_year=${year}` : ''
    const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${query}${yearParam}`)
    const data = await res.json()
    
    if (data.results && data.results.length > 0 && data.results[0].poster_path) {
      return `https://image.tmdb.org/t/p/w200${data.results[0].poster_path}`
    }
    return null
  } catch (err) {
    console.error('TMDB fetch error:', err)
    return null
  }
}

export async function getHints(gameId, guessCount) {
  const { data, error } = await supabase.rpc('get_hints', { p_game_id: gameId, p_guess_count: guessCount })
  if (error) {
    console.error('Error fetching hints:', error)
    return null
  }
  return data
}