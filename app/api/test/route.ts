import { testImapConnection } from '@/lib/imap-client'
import { verifySmtpConnection } from '@/lib/smtp-sender'
import {
  getConfiguredTables,
  getTableStatus,
  pingSupabaseAuth,
} from '@/lib/db-adapter'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error'
}

export async function GET() {
  const results: Record<string, unknown> = {}
  const tables = getConfiguredTables()

  try {
    const auth = await pingSupabaseAuth()
    const tableResults = {
      moto: await getTableStatus(tables.moto),
      incoming: await getTableStatus(tables.incoming),
      reply: await getTableStatus(tables.reply),
    }
    const missingTables = Object.entries(tableResults)
      .filter(([, value]) => !value.ok)
      .map(([key]) => key)

    results.supabase = {
      ok: missingTables.length === 0,
      auth,
      tables,
      tableResults,
      missingTables,
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
