import { buildAppointmentReply } from '@/lib/appointment'
import { getMotoAvailability, saveReplyLog } from '@/lib/db-adapter'
import { sendReplyEmail } from '@/lib/smtp-sender'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface SendReplyBody {
  to: string
  motoName: string
  available?: boolean
  motoCode?: string
  customerName?: string
  requestedDate?: string
  notes?: string
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error'
}

function isSendReplyBody(value: unknown): value is SendReplyBody {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate.to === 'string' &&
    typeof candidate.motoName === 'string' &&
    (candidate.available === undefined ||
      typeof candidate.available === 'boolean') &&
    (candidate.motoCode === undefined || typeof candidate.motoCode === 'string') &&
    (candidate.customerName === undefined ||
      typeof candidate.customerName === 'string') &&
    (candidate.requestedDate === undefined ||
      typeof candidate.requestedDate === 'string') &&
    (candidate.notes === undefined || typeof candidate.notes === 'string')
  )
}

export async function POST(request: Request) {
  let payload: unknown

  try {
    payload = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!isSendReplyBody(payload)) {
    return Response.json(
      {
        error:
          'Body must include at least "to" and "motoName". "available" is optional if "motoCode" is provided.',
      },
      { status: 400 }
    )
  }

  try {
    let available = payload.available
    let availabilitySource = 'request'

    if (typeof available !== 'boolean' && payload.motoCode) {
      const motoAvailability = await getMotoAvailability(payload.motoCode)
      available = motoAvailability?.available
      availabilitySource = 'database'
    }

    if (typeof available !== 'boolean') {
      return Response.json(
        {
          error:
            'Unable to determine moto availability. Provide "available" or a valid "motoCode".',
        },
        { status: 400 }
      )
    }

    const reply = buildAppointmentReply({
      available,
      customerName: payload.customerName,
      motoName: payload.motoName,
      requestedDate: payload.requestedDate,
      notes: payload.notes,
    })

    const info = await sendReplyEmail({
      to: payload.to,
      subject: reply.subject,
      templateName: reply.templateName,
      context: reply.context,
    })

    const { error } = await saveReplyLog({
      to: payload.to,
      subject: reply.subject,
      templateName: reply.templateName,
      metadata: {
        availabilitySource,
        motoCode: payload.motoCode ?? null,
        motoName: payload.motoName,
      },
    })

    return Response.json({
      success: true,
      messageId: info.messageId,
      templateName: reply.templateName,
      availabilitySource,
      logSaved: !error,
      warning: error?.message ?? null,
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
