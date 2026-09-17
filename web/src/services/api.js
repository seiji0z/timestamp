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
  const { data, error } = await supabase.rpc('guess_movie', {
    p_game_id: gameId,
    p_guess_title: guessTitle
  })

  if (error) {
    console.error('Error validating guess:', error)
    return false
  }
  return data
}