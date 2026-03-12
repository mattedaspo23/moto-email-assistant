import { simpleParser, type AddressObject, type Attachment } from 'mailparser'

export interface ParsedIncomingEmail {
  messageId: string | null
  subject: string
  from: string
  to: string[]
  text: string
  html: string
  sentAt: string | null
  attachments: Array<{
    filename: string | null
    contentType: string
    size: number
  }>
}

function normalizeAddresses(addresses: AddressObject | AddressObject[] | undefined) {
  const list = Array.isArray(addresses)
    ? addresses
    : addresses
      ? [addresses]
      : []

  return list.flatMap((entry) =>
    entry.value
      .map((address) => address.address ?? '')
      .filter((address): address is string => Boolean(address))
  )
}

export async function parseIncomingEmail(source: Buffer | string) {
  const parsed = await simpleParser(source)

  return {
    messageId: parsed.messageId ?? null,
    subject: parsed.subject ?? '',
    from: parsed.from?.text ?? '',
    to: normalizeAddresses(parsed.to),
    text: parsed.text ?? '',
    html: typeof parsed.html === 'string' ? parsed.html : '',
    sentAt: parsed.date?.toISOString() ?? null,
    attachments: parsed.attachments.map((attachment: Attachment) => ({
      filename: attachment.filename ?? null,
      contentType: attachment.contentType,
      size: attachment.size,
    })),
  } satisfies ParsedIncomingEmail
}
