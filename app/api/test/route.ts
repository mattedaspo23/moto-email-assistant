import { testImapConnection } from '@/lib/imap-client'
import { verifySmtpConnection } from '@/lib/smtp-sender'
import { getSupabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error'
}

export async function GET() {
  const results: Record<string, unknown> = {}
  const motoTable = process.env.MOTO_TABLE ?? 'moto'

  try {
    const { error, count } = await getSupabaseAdmin()
      .from(motoTable)
      .select('*', { count: 'exact', head: true })

    if (error) {
      throw error
    }

    results.supabase = {
      ok: true,
      table: motoTable,
      rowCount: count ?? 0,
    }
  } catch (error) {
    results.supabase = {
      ok: false,
      error: getErrorMessage(error),
    }
  }

  try {
    results.imap = await testImapConnection()
  } catch (error) {
    results.imap = {
      ok: false,
      error: getErrorMessage(error),
    }
  }

  try {
    await verifySmtpConnection()
    results.smtp = { ok: true }
  } catch (error) {
    results.smtp = {
      ok: false,
      error: getErrorMessage(error),
    }
  }

  const success = ['supabase', 'imap', 'smtp'].every((key) => {
    const entry = results[key] as { ok?: boolean } | undefined
    return entry?.ok === true
  })

  return Response.json(
    {
      success,
      results,
    },
    { status: success ? 200 : 500 }
  )
}
