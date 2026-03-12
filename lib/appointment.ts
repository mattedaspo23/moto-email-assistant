export type ReplyTemplateName =
  | 'reply-available.njk'
  | 'reply-unavailable.njk'

export interface AppointmentRequest {
  available: boolean
  customerName?: string
  motoName: string
  requestedDate?: string
  notes?: string
}

export interface AppointmentReply {
  subject: string
  templateName: ReplyTemplateName
  context: Record<string, string>
}

function formatRequestedDate(value: string | undefined) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function buildAppointmentReply(input: AppointmentRequest) {
  const requestedDate = formatRequestedDate(input.requestedDate)
  const customerName = input.customerName?.trim() || 'Cliente'
  const notes = input.notes?.trim() || ''
  const signature = process.env.SHOP_SIGNATURE || 'Moto Email Assistant'

  if (input.available) {
    return {
      subject: `Disponibilita confermata per ${input.motoName}`,
      templateName: 'reply-available.njk',
      context: {
        customerName,
        motoName: input.motoName,
        requestedDate,
        notes,
        signature,
      },
    } satisfies AppointmentReply
  }

  return {
    subject: `Aggiornamento disponibilita per ${input.motoName}`,
    templateName: 'reply-unavailable.njk',
    context: {
      customerName,
      motoName: input.motoName,
      requestedDate,
      notes,
      signature,
    },
  } satisfies AppointmentReply
}
