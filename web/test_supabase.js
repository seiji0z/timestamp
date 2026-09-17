import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in web/.env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testSupabase() {
  console.log('--- Testing Supabase Connection & Access Controls ---')

  // 1. Try to query the movies table directly (Should Fail due to RLS)
  console.log('\n1. Testing RLS on `movies` table...')
  const { data: movies, error: moviesError } = await supabase.from('movies').select('*')
  if (moviesError) {
    console.log('✅ Success: Blocked from reading `movies` directly (RLS is working).')
    console.log(`   Error details: ${moviesError.message}`)
  } else if (movies && movies.length === 0) {
    console.log('✅ Success: Blocked from reading `movies` directly (RLS is working - returned empty array).')
  } else {
    console.error('❌ FAIL: Able to read `movies` directly! RLS is not configured correctly.')
    console.error(movies)
  }

  // 2. Try to query the today_game_info view (Should Succeed)
  console.log('\n2. Testing `today_game_info` view...')
  const { data: todayGame, error: gameError } = await supabase.from('today_game_info').select('*').single()
  if (gameError) {
    console.log(`⚠️ Note: Could not get today's game. This might just mean you haven't inserted a game for today's date yet.`)
    console.log(`   Error details: ${gameError.message}`)
  } else {
    console.log('✅ Success: Fetched today\'s game info!')
    console.log(todayGame)
    if (todayGame.title) {
        console.error('❌ FAIL: The view exposed the movie title! It should only expose game_id, runtime, and r2_folder_name.')
    }
  }

  // 3. Test the guess_movie RPC function (Only if we got a game)
  if (todayGame) {
      console.log(`\n3. Testing guess_movie RPC for game_id: ${todayGame.game_id}...`)
      
      // Test incorrect guess
      const { data: wrongGuess, error: rpcError1 } = await supabase.rpc('guess_movie', {
        p_game_id: todayGame.game_id,
        p_guess_title: 'Wrong Movie Title'
      })
      console.log(`   Guess "Wrong Movie Title": ${wrongGuess ? '✅ True' : '❌ False'}`)

      // Since we don't know the actual title here, we can't test a correct guess automatically.
      console.log('   (To test a correct guess, manually insert a guess matching the title you put in the database.)')
  }

  console.log('\n---------------------------------------------------')
}

testSupabase()
