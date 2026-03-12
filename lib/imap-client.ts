import Imap from 'imap'

export interface ImapMessagePayload {
  uid: number
  raw: Buffer
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

function getImapConfig(): Imap.Config {
  const rejectUnauthorized = parseBoolean(
    process.env.IMAP_TLS_REJECT_UNAUTHORIZED,
    true
  )

  return {
    user: requireEnv('IMAP_USER'),
    password: requireEnv('IMAP_PASSWORD'),
    host: requireEnv('IMAP_HOST'),
    port: Number(process.env.IMAP_PORT ?? 993),
    tls: parseBoolean(process.env.IMAP_TLS, true),
    tlsOptions: {
      rejectUnauthorized,
    },
  }
}

export function createImapClient() {
  return new Imap(getImapConfig())
}

export function connectImap(client: Imap) {
  return new Promise<void>((resolve, reject) => {
    const handleReady = () => {
      cleanup()
      resolve()
    }

    const handleError = (error: Error) => {
      cleanup()
      reject(error)
    }

    const cleanup = () => {
      client.removeListener('ready', handleReady)
      client.removeListener('error', handleError)
    }

    client.once('ready', handleReady)
    client.once('error', handleError)
    client.connect()
  })
}

export function openInbox(client: Imap, mailbox = 'INBOX') {
  return new Promise<Imap.Box>((resolve, reject) => {
    client.openBox(mailbox, false, (error, box) => {
      if (error) {
        reject(error)
        return
      }

      resolve(box)
    })
  })
}

export function searchUnreadMessageIds(client: Imap) {
  return new Promise<number[]>((resolve, reject) => {
    client.search(['UNSEEN'], (error, results) => {
      if (error) {
        reject(error)
        return
      }

      resolve(results)
    })
  })
}

export function fetchMessageByUid(client: Imap, uid: number) {
  return new Promise<ImapMessagePayload>((resolve, reject) => {
    const chunks: Buffer[] = []
    let resolvedUid = uid
    let completed = false
    const fetcher = client.fetch(uid, { bodies: '', markSeen: false })

    fetcher.on('message', (message: Imap.ImapMessage) => {
      message.on('attributes', (attributes: Imap.ImapMessageAttributes) => {
        resolvedUid = attributes.uid
      })

      message.on('body', (stream: NodeJS.ReadableStream) => {
        stream.on('data', (chunk: Buffer | string) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        })
      })

      message.once('end', () => {
        completed = true
        resolve({
          uid: resolvedUid,
          raw: Buffer.concat(chunks),
        })
      })
    })

    fetcher.once('error', reject)
    fetcher.once('end', () => {
      if (!completed) {
        reject(new Error(`Unable to fetch message ${uid}`))
      }
    })
  })
}

export async function pollUnreadMessages(limit = 10) {
  const client = createImapClient()

  try {
    await connectImap(client)
    await openInbox(client)

    const unreadIds = await searchUnreadMessageIds(client)
    const targetIds = unreadIds.slice(-limit)
    const messages: ImapMessagePayload[] = []

    for (const uid of targetIds) {
      messages.push(await fetchMessageByUid(client, uid))
    }

    return messages
  } finally {
    client.end()
  }
}

export async function testImapConnection() {
  const client = createImapClient()

  try {
    const box = await connectImap(client).then(() => openInbox(client))
    return {
      ok: true as const,
      mailbox: box.name,
      unreadCount: box.messages.unseen ?? 0,
    }
  } finally {
    client.end()
  }
}
