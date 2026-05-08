import neo4j from 'neo4j-driver'

const SCHEMA = `
Neo4j graph schema — Mailchimp media intelligence:

Node labels:
- Content  { id, title, body, source_type, date, url }
  source_type values: "owned_blog" | "owned_social" | "paid" | "earned"
- Source   { name, type }
- Theme    { name }
  Theme names: "Email Marketing / Deliverability", "AI & Revenue Intelligence",
  "Ecommerce Revenue / ROI", "Marketing Automation", "SMB Growth",
  "Audience & List Building", "SMS Marketing"

Relationships:
- (Content)-[:MENTIONS_THEME]->(Theme)
- (Content)-[:FROM_SOURCE]->(Source)
- (Content)-[:ECHOES]->(Content)  — owned/paid → earned, indicates topical echo

Counts: 593 earned, 60 owned_blog, 20 paid, 3 owned_social content nodes.
`

const CYPHER_SYSTEM = `You generate Cypher queries for a Neo4j knowledge graph about Mailchimp's media presence.
${SCHEMA}
Rules:
- Respond with ONLY a valid Cypher query. No markdown, no explanation, no code fences.
- Always include LIMIT (max 50) unless doing aggregate-only queries.
- For comparisons across source_type, use collect() or count() with grouping.
- Prefer returning named columns (AS keyword) for readability.`

async function callLLM(prompt, system) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      temperature: 0.1,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message ?? JSON.stringify(data))
  return data.choices[0].message.content.trim()
}

export async function POST(req) {
  const { question } = await req.json()
  if (!question?.trim()) {
    return Response.json({ error: 'No question provided' }, { status: 400 })
  }

  const driver = neo4j.driver(
    process.env.NEO4J_URI,
    neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD),
    { disableLosslessIntegers: true }
  )

  try {
    // Step 1: generate Cypher
    let cypher = await callLLM(question, CYPHER_SYSTEM)
    // strip any accidental markdown fences
    cypher = cypher.replace(/^```[\w]*\n?/m, '').replace(/```$/m, '').trim()

    // Step 2: run against Neo4j
    const session = driver.session({ database: process.env.NEO4J_DATABASE })
    let records
    try {
      const result = await session.run(cypher)
      records = result.records.map(r => {
        const row = {}
        r.keys.forEach(k => {
          const v = r.get(k)
          row[k] = v && typeof v === 'object' && v.properties ? v.properties : v
        })
        return row
      })
    } finally {
      await session.close()
    }

    // Step 3: interpret
    const interpretPrompt = `Question: "${question}"

Cypher used:
${cypher}

Raw results (${records.length} rows):
${JSON.stringify(records, null, 2)}

Write a clear, direct answer to the question using these results. Lead with the key insight. Where numbers are relevant, include them. Keep it under 150 words.`

    const answer = await callLLM(interpretPrompt, 'You are a media intelligence analyst. Answer concisely and directly.')

    return Response.json({ answer, cypher, records })
  } catch (err) {
    const msg = err.message ?? ''
    const paused = msg.includes('ECONNREFUSED') || msg.includes('ServiceUnavailable') || msg.includes('connect')
    return Response.json({
      error: paused
        ? 'The database is paused. Resume it at console.neo4j.io then try again.'
        : `Query error: ${msg}`,
    }, { status: 500 })
  } finally {
    await driver.close()
  }
}
