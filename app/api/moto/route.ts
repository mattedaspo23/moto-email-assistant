import { getSupabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabaseAdmin = getSupabaseAdmin()
  const motoTable = process.env.MOTO_TABLE ?? 'moto'
  const { data, error } = await supabaseAdmin
    .from(motoTable)
    .select('*')
    .limit(1)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ success: true, data })
}
