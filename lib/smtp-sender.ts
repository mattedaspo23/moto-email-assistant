import nodemailer from 'nodemailer'
import nunjucks from 'nunjucks'
import path from 'path'

export interface SendReplyEmailInput {
  to: string
  subject: string
  templateName: string
  context: Record<string, unknown>
}

function requireEnv(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing env.${name}`)
  }

  return value
}

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) {
    return fallback
  }

  return value === 'true'
}

const templatesPath = path.join(process.cwd(), 'templates')
const templateEnvironment = nunjucks.configure(templatesPath, {
  autoescape: true,
  noCache: true,
})

export function createSmtpTransport() {
  return nodemailer.createTransport({
    host: requireEnv('SMTP_HOST'),
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: parseBoolean(process.env.SMTP_SECURE, false),
    auth: {
      user: requireEnv('SMTP_USER'),
      pass: requireEnv('SMTP_PASSWORD'),
    },
  })
}

export async function verifySmtpConnection() {
  const transport = createSmtpTransport()
  await transport.verify()
}

export async function sendReplyEmail(input: SendReplyEmailInput) {
  const transport = createSmtpTransport()
  const html = templateEnvironment.render(input.templateName, input.context)

  return transport.sendMail({
    from: process.env.SMTP_FROM ?? requireEnv('SMTP_USER'),
    to: input.to,
    subject: input.subject,
    html,
  })
}
