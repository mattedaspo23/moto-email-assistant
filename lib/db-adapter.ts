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

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

export async function getMotoAvailability(motoCode: string) {
  const supabaseAdmin = getSupabaseAdmin()
  const motoTable = getTableName('moto')
  const checks: Array<[column: string, value: string]> = [
    ['code', motoCode],
    ['slug', motoCode],
  ]

  if (looksLikeUuid(motoCode)) {
    checks.push(['id', motoCode])
  }

  for (const [column, value] of checks) {
    const { data, error } = await supabaseAdmin
      .from(motoTable)
      .select('*')
      .eq(column, value)
      .limit(1)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!data) {
      continue
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

  return null
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

export async function pingSupabaseAuth() {
  const supabaseAdmin = getSupabaseAdmin()
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1,
  })

  if (error) {
    throw error
  }

  return {
    ok: true as const,
    sampledUsers: data.users.length,
  }
}

export async function getTableStatus(tableName: string) {
  const supabaseAdmin = getSupabaseAdmin()
  const { count, error } = await supabaseAdmin
    .from(tableName)
    .select('*', { count: 'exact', head: true })

  if (error) {
    return {
      ok: false,
      error: error.message,
      code: error.code ?? null,
      rowCount: null,
    }
  }

  return {
    ok: true,
    error: null,
    code: null,
    rowCount: count ?? 0,
  }
}

export function getConfiguredTables() {
  return {
    moto: getTableName('moto'),
    incoming: getTableName('incoming'),
    reply: getTableName('reply'),
  }
}
