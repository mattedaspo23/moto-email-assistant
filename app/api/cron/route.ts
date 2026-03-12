import cron from 'node-cron'
import { storeInboundEmail } from '@/lib/db-adapter'
import { parseIncomingEmail } from '@/lib/email-parser'
import { pollUnreadMessages } from '@/lib/imap-client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error'
}

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return true
  }

  return request.headers.get('authorization') === `Bearer ${cronSecret}`
}

async function handleCron(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const schedule = process.env.CRON_SCHEDULE ?? '*/5 * * * *'

  if (!cron.validate(schedule)) {
    return Response.json(
      {
        success: false,
        error: `Invalid CRON_SCHEDULE: ${schedule}`,
      },
      { status: 500 }
    )
  }

  try {
    const messages = await pollUnreadMessages(10)
    const processed: Array<{ uid: number; from: string; subject: string }> = []

    for (const message of messages) {
      const parsed = await parseIncomingEmail(message.raw)
      const { error } = await storeInboundEmail({
        uid: message.uid,
        email: parsed,
      })

      if (error) {
        throw error
      }

      processed.push({
        uid: message.uid,
        from: parsed.from,
        subject: parsed.subject,
      })
    }

    return Response.json({
      success: true,
      schedule,
      processedCount: processed.length,
      messages: processed,
    })
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  return handleCron(request)
}

export async function POST(request: Request) {
  return handleCron(request)
}
