const endpoints = [
  { path: '/api/test', label: 'Test connessioni' },
  { path: '/api/cron', label: 'Polling IMAP' },
  { path: '/api/send-reply', label: 'Invio reply SMTP (POST)' },
  { path: '/api/moto', label: 'Query tabella moto' },
]

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Next.js 14 + App Router</p>
        <h1>Moto Email Assistant</h1>
        <p className="lede">
          Base project pronta per polling IMAP, parsing email, invio SMTP e
          persistenza su Supabase.
        </p>
      </section>

      <section className="panel">
        <h2>Endpoint disponibili</h2>
        <ul className="endpoint-list">
          {endpoints.map((endpoint) => (
            <li key={endpoint.path}>
              <code>{endpoint.path}</code>
              <span>{endpoint.label}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
