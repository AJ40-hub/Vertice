import { getSupabaseAdmin } from '../server/_supabaseAdmin'

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('archives')
      .select('*')
      .eq('is_active', true)
      .order('created_at')

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ archives: data || [] })
  } catch (error) {
    console.error('archives endpoint error:', error)
    return res.status(500).json({ error: 'Unexpected server error' })
  }
}
