'use client'

import { useState } from 'react'

const EXAMPLES = [
  'Which themes appear in paid ads but not in earned coverage?',
  'What is the echo ratio for each theme across owned and earned?',
  'Which owned blog posts are echoed most in earned media?',
  'Compare AI coverage across owned, earned and paid channels',
  'What sources publish the most earned content about Mailchimp?',
]

const s = {
  page: { maxWidth: 760, margin: '0 auto', padding: '48px 24px 80px' },
  header: { marginBottom: 40 },
  badge: {
    display: 'inline-block', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
    textTransform: 'uppercase', color: '#888', marginBottom: 12,
  },
  title: { fontSize: 28, fontWeight: 700, color: '#fff', lineHeight: 1.2, marginBottom: 8 },
  sub: { fontSize: 14, color: '#666' },
  form: { marginBottom: 32 },
  inputWrap: {
    display: 'flex', gap: 8, background: '#1a1a1a',
    border: '1px solid #2a2a2a', borderRadius: 10, padding: 6,
  },
  input: {
    flex: 1, background: 'transparent', border: 'none', outline: 'none',
    color: '#e8e8e8', fontSize: 15, padding: '8px 10px',
  },
  btn: {
    background: '#fff', color: '#000', border: 'none', borderRadius: 7,
    padding: '8px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
    whiteSpace: 'nowrap', flexShrink: 0,
  },
  btnDisabled: { opacity: 0.4, cursor: 'not-allowed' },
  examples: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  chip: {
    fontSize: 12, color: '#888', background: '#1a1a1a',
    border: '1px solid #2a2a2a', borderRadius: 20,
    padding: '5px 12px', cursor: 'pointer',
  },
  result: { marginTop: 8 },
  answer: {
    background: '#141414', border: '1px solid #222', borderRadius: 10,
    padding: '20px 22px', marginBottom: 16, lineHeight: 1.7, fontSize: 15,
  },
  cypher: { marginBottom: 16 },
  cypherToggle: {
    fontSize: 12, color: '#555', cursor: 'pointer', userSelect: 'none',
    display: 'inline-flex', alignItems: 'center', gap: 4,
  },
  cypherCode: {
    marginTop: 8, background: '#111', border: '1px solid #1f1f1f',
    borderRadius: 8, padding: '12px 14px', fontFamily: 'monospace',
    fontSize: 12, color: '#aaa', whiteSpace: 'pre-wrap', overflowX: 'auto',
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: {
    textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #222',
    color: '#666', fontWeight: 500, fontSize: 11, textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  td: { padding: '8px 12px', borderBottom: '1px solid #1a1a1a', color: '#ccc' },
  tableWrap: {
    background: '#111', border: '1px solid #1f1f1f',
    borderRadius: 8, overflow: 'hidden', marginTop: 8,
  },
  error: {
    background: '#1a0f0f', border: '1px solid #3a1a1a',
    borderRadius: 10, padding: '16px 20px', color: '#f87171', fontSize: 14,
  },
  loading: { display: 'flex', alignItems: 'center', gap: 10, color: '#555', fontSize: 14 },
  dot: { width: 6, height: 6, borderRadius: '50%', background: '#444', animation: 'pulse 1.2s infinite' },
  sectionLabel: { fontSize: 11, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 },
}

function Spinner() {
  return (
    <div style={s.loading}>
      <style>{`@keyframes pulse { 0%,100%{opacity:.3} 50%{opacity:1} }`}</style>
      <span style={s.dot} />
      <span style={{ ...s.dot, animationDelay: '0.2s' }} />
      <span style={{ ...s.dot, animationDelay: '0.4s' }} />
      <span>Querying graph...</span>
    </div>
  )
}

function DataTable({ records }) {
  if (!records?.length) return null
  const keys = Object.keys(records[0])
  return (
    <div>
      <div style={s.sectionLabel}>Raw data ({records.length} rows)</div>
      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr>{keys.map(k => <th key={k} style={s.th}>{k}</th>)}</tr>
          </thead>
          <tbody>
            {records.map((row, i) => (
              <tr key={i}>
                {keys.map(k => (
                  <td key={k} style={s.td}>
                    {typeof row[k] === 'object' ? JSON.stringify(row[k]) : String(row[k] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function Home() {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [showCypher, setShowCypher] = useState(false)

  async function ask(q) {
    const text = q ?? question
    if (!text.trim() || loading) return
    setLoading(true)
    setResult(null)
    setError(null)
    setShowCypher(false)
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text }),
      })
      const data = await res.json()
      if (data.error) setError(data.error)
      else setResult(data)
    } catch {
      setError('Network error — please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div style={s.badge}>Mailchimp · Media Intelligence</div>
        <h1 style={s.title}>Ask the knowledge graph</h1>
        <p style={s.sub}>676 content nodes across owned, earned and paid — queryable in plain English.</p>
      </header>

      <div style={s.form}>
        <div style={s.inputWrap}>
          <input
            style={s.input}
            placeholder="e.g. Which themes in paid ads are missing from earned coverage?"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && ask()}
            disabled={loading}
          />
          <button
            style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }}
            onClick={() => ask()}
            disabled={loading}
          >
            Ask
          </button>
        </div>
        <div style={s.examples}>
          {EXAMPLES.map(e => (
            <span key={e} style={s.chip} onClick={() => { setQuestion(e); ask(e) }}>{e}</span>
          ))}
        </div>
      </div>

      {loading && <Spinner />}

      {error && <div style={s.error}>{error}</div>}

      {result && (
        <div style={s.result}>
          <div style={s.answer}>{result.answer}</div>

          <div style={s.cypher}>
            <span style={s.cypherToggle} onClick={() => setShowCypher(v => !v)}>
              {showCypher ? '▾' : '▸'} Cypher query
            </span>
            {showCypher && <pre style={s.cypherCode}>{result.cypher}</pre>}
          </div>

          <DataTable records={result.records} />
        </div>
      )}
    </div>
  )
}
