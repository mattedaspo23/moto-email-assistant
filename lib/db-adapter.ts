import type { ParsedIncomingEmail } from '@/lib/email-parser'
import { getSupabaseAdmin } from '@/lib/supabase'

export interface MotoAvailability {
  available: boolean
  record: Record<string, unknown>
}

export interface ReplyLogPayload {
  to: string
  subject: string
  templateName: string
  metadata?: Record<string, unknown>
}

export interface InboundEmailPayload {
  uid: number
  email: ParsedIncomingEmail
}

function getTableName(name: 'moto' | 'incoming' | 'reply') {
  if (name === 'moto') {
    return process.env.MOTO_TABLE ?? 'moto'
  }

  if (name === 'incoming') {
    return process.env.SUPABASE_INBOUND_TABLE ?? 'incoming_emails'
  }

  return process.env.SUPABASE_REPLY_LOG_TABLE ?? 'email_replies'
}

export async function getMotoAvailability(motoCode: string) {
  const supabaseAdmin = getSupabaseAdmin()
  const { data, error } = await supabaseAdmin
    .from(getTableName('moto'))
    .select('*')
    .or(`code.eq.${motoCode},slug.eq.${motoCode},id.eq.${motoCode}`)
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  const record = data as Record<string, unknown>
  const available =
    Boolean(record.available) ||
    Boolean(record.is_available) ||
    Boolean(record.disponibile)

  return {
    available,
    record,
  } satisfies MotoAvailability
}

export async function storeInboundEmail(payload: InboundEmailPayload) {
  const supabaseAdmin = getSupabaseAdmin()

  return supabaseAdmin.from(getTableName('incoming')).upsert(
    {
      imap_uid: payload.uid,
      message_id: payload.email.messageId,
      from_email: payload.email.from,
      to_emails: payload.email.to,
      subject: payload.email.subject,
      text_body: payload.email.text,
      html_body: payload.email.html,
      sent_at: payload.email.sentAt,
      attachments: payload.email.attachments,
      payload: payload.email,
    },
    {
      onConflict: 'imap_uid',
    }
  )
}

export async function saveReplyLog(payload: ReplyLogPayload) {
  const supabaseAdmin = getSupabaseAdmin()

  return supabaseAdmin.from(getTableName('reply')).insert({
    recipient_email: payload.to,
    subject: payload.subject,
    template_name: payload.templateName,
    metadata: payload.metadata ?? {},
  })
}
