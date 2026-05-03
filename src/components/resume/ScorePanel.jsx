import { useState, useEffect } from 'react'
import styles from './ScorePanel.module.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

// ---------------------------------------------------------------------------
// Score ring SVG
// ---------------------------------------------------------------------------
function ScoreRing({ score }) {
  const size = 80
  const stroke = 6
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ

  const color = score >= 80 ? '#d4ff6e' : score >= 60 ? '#4a9eff' : score >= 40 ? '#f0a500' : '#ff6b6b'

  return (
    <div className={styles.ringWrap}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        {/* Progress */}
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.3s ease' }}
        />
      </svg>
      <div className={styles.ringLabel}>
        <span className={styles.ringScore} style={{ color }}>{score}</span>
        <span className={styles.ringPct}>%</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Score label
// ---------------------------------------------------------------------------
function ScoreLabel({ score }) {
  if (score >= 80) return <span className={styles.labelStrong}>Strong match</span>
  if (score >= 60) return <span className={styles.labelGood}>Good match</span>
  if (score >= 40) return <span className={styles.labelModerate}>Moderate match</span>
  return <span className={styles.labelWeak}>Weak match</span>
}

// ---------------------------------------------------------------------------
// Main ScorePanel
// ---------------------------------------------------------------------------
export default function ScorePanel({ resumeFile, jobDescription, onScoreReady }) {
  const [state, setState] = useState('loading')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(true)

  // Auto-trigger on mount
  useEffect(() => { analyse() }, [])

  async function analyse() {
    if (!resumeFile || !jobDescription?.trim()) return
    setState('loading')
    setError(null)

    try {
      // We need resume text — upload the file to /analyse
      const formData = new FormData()
      formData.append('resume', resumeFile)
      formData.append('job_description', jobDescription)

      const response = await fetch(`${API_BASE}/analyse`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: 'Unknown error' }))
        throw new Error(err.detail || `Server error ${response.status}`)
      }

      // Read SSE stream and accumulate JSON
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let raw = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          try {
            const payload = JSON.parse(line.slice(6))
            if (payload.error) throw new Error(payload.message || payload.error)
            if (payload.text) raw += payload.text
          } catch (e) {
            if (e.message && !e.message.includes('JSON')) throw e
          }
        }
      }

      // Parse the JSON result — strip any markdown fences
      const clean = raw.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      setResult(parsed)
      setState('done')
      setExpanded(true)
      onScoreReady?.(parsed.score)
    } catch (err) {
      setError(err.message)
      setState('error')
    }
  }

  return (
    <div className={styles.panel} id="tour-score">
      {/* Header */}
      <div className={styles.panelHeader} onClick={() => state === 'done' && setExpanded(e => !e)}>
        <span className={styles.panelTitle}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M4 7l1.5 1.5L9 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          ATS Match Score
        </span>
        {state === 'loading' && <span className={styles.spinner} />}
        {state === 'done' && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>

      {/* Loading */}
      {state === 'loading' && (
        <div className={styles.loadingBody}>
          <div className={styles.loadingBar}><div className={styles.loadingFill} /></div>
          <span className={styles.loadingText}>Analysing match…</span>
        </div>
      )}

      {/* Error */}
      {state === 'error' && (
        <div className={styles.errorBody}>
          <span className={styles.errorMsg}>⚠️ {error}</span>
          <button className={styles.retryBtn} onClick={analyse}>Retry</button>
        </div>
      )}

      {/* Result */}
      {state === 'done' && result && expanded && (
        <div className={styles.resultBody}>
          {/* Score + summary */}
          <div className={styles.scoreRow}>
            <ScoreRing score={result.score} />
            <div className={styles.scoreMeta}>
              <ScoreLabel score={result.score} />
              <p className={styles.summary}>{result.summary}</p>
            </div>
          </div>

          {/* Strengths */}
          {result.strengths?.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>
                <span className={styles.dot} style={{ background: '#d4ff6e' }} />
                Strengths
              </div>
              <ul className={styles.list}>
                {result.strengths.map((s, i) => (
                  <li key={i} className={styles.strengthItem}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Gaps */}
          {result.gaps?.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>
                <span className={styles.dot} style={{ background: '#f0a500' }} />
                Gaps to address
              </div>
              <ul className={styles.list}>
                {result.gaps.map((g, i) => (
                  <li key={i} className={styles.gapItem}>{g}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Missing keywords */}
          {result.keywords?.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>
                <span className={styles.dot} style={{ background: '#4a9eff' }} />
                Missing keywords
              </div>
              <div className={styles.keywords}>
                {result.keywords.map((k, i) => (
                  <span key={i} className={styles.keyword}>{k}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Export the analyse trigger so LeftPanel can call it
export { ScorePanel }