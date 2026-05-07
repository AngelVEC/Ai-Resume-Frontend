import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { downloadCoverLetterDocx } from '../../utils/useDownloadDocx'
import styles from './CoverLetterModal.module.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

function stripMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*•]\s+/gm, '• ')
    .replace(/^\s*\n/gm, '\n')
    .trim()
}

async function readStream(response, onChunk) {
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let fullText = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const raw = decoder.decode(value, { stream: true })
    for (const line of raw.split('\n')) {
      if (!line.startsWith('data: ')) continue
      try {
        const payload = JSON.parse(line.slice(6))
        if (payload.error) {
          const err = new Error(payload.message || payload.error)
          err.structured = payload
          throw err
        }
        if (payload.text) { fullText += payload.text; onChunk(fullText) }
      } catch (e) {
        if (e.structured) throw e // re-throw structured errors, ignore parse errors
      }
    }
  }
  return fullText
}

export default function CoverLetterModal({ resumeText, jobDescription, onClose, isTourPreview = false }) {
  const [letters, setLetters] = useState([])
  const [current, setCurrent] = useState(0)
  const [streaming, setStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState(null)

  // Swipe tracking
  const touchStartX = useRef(null)
  const dragStartX = useRef(null)
  const [dragOffset, setDragOffset] = useState(0)
  const [slideDir, setSlideDir] = useState(null) // 'left' | 'right' | null

  // Generate on mount — skip if opened by tour (no real resume yet)
  useEffect(() => {
    if (!isTourPreview) {
      if (!resumeText || !jobDescription) {
        setError({
          error: 'missing_data',
          title: 'Session expired',
          message: 'Your resume data was lost on page refresh. Please re-upload your resume and regenerate before using Cover Letter.',
        })
        return
      }
      generate()
    }
  }, [])

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  async function generate() {
    setStreaming(true)
    setStreamingText('')
    try {
      const response = await fetch(`${API_BASE}/cover-letter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume_text: resumeText, job_description: jobDescription }),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: 'Unknown error' }))
        throw new Error(err.detail || `Server error ${response.status}`)
      }
      const fullText = await readStream(response, (text) => setStreamingText(text))
      setLetters(prev => [...prev, fullText])
      setCurrent(prev => letters.length) // point to new letter
      setStreamingText('')
    } catch (err) {
      const structured = err.structured || { error: 'unknown_error', title: 'Generation failed', message: err.message }
      setError(structured)
    } finally {
      setStreaming(false)
    }
  }

  function goTo(index) {
    if (index < 0 || index >= letters.length) return
    setSlideDir(index > current ? 'left' : 'right')
    setTimeout(() => { setCurrent(index); setSlideDir(null) }, 250)
  }

  function handleGenerateNew() {
    generate().then(() => {
      // auto-navigate to new letter after generation
    })
  }

  // Touch swipe
  function onTouchStart(e) { touchStartX.current = e.touches[0].clientX }
  function onTouchEnd(e) {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) {
      if (diff > 0 && current < letters.length - 1) goTo(current + 1)
      else if (diff < 0 && current > 0) goTo(current - 1)
    }
    touchStartX.current = null
  }

  // Mouse drag swipe
  function onMouseDown(e) { dragStartX.current = e.clientX }
  function onMouseMove(e) {
    if (dragStartX.current === null) return
    setDragOffset(e.clientX - dragStartX.current)
  }
  function onMouseUp(e) {
    if (dragStartX.current === null) return
    const diff = dragStartX.current - e.clientX
    if (Math.abs(diff) > 60) {
      if (diff > 0 && current < letters.length - 1) goTo(current + 1)
      else if (diff < 0 && current > 0) goTo(current - 1)
    }
    dragStartX.current = null
    setDragOffset(0)
  }

  function handleCopy() {
    const text = letters[current]
    if (!text) return
    navigator.clipboard.writeText(stripMarkdown(text)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  async function handleDownload() {
    const text = letters[current]
    if (!text) return
    setDownloading(true)
    try { await downloadCoverLetterDocx(stripMarkdown(text)) }
    finally { setDownloading(false) }
  }

  const displayText = streaming ? streamingText : letters[current]
  const isStreaming = streaming && letters.length === current  // streaming the current slot

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} id="tour-cl-modal">

        {/* Header */}
        <div className={styles.header}>
          <button className={styles.closeBtn} onClick={onClose} title="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
          <div className={styles.headerCenter}>
            <span className={styles.title}>Cover Letter</span>
            {letters.length > 0 && (
              <span className={styles.counter}>{current + 1} / {letters.length}</span>
            )}
          </div>
          <button
            id="tour-cl-new"
            className={styles.newBtn}
            onClick={handleGenerateNew}
            disabled={streaming}
            title="Generate another version"
          >
            {streaming ? (
              <span className={styles.spinner} />
            ) : (
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M11 6.5A4.5 4.5 0 112 6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                <path d="M11 3v3.5H7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
            {streaming ? 'Generating…' : 'New version'}
          </button>
        </div>

        {/* Swipe dots */}
        {letters.length > 1 && (
          <div className={styles.dots}>
            {letters.map((_, i) => (
              <button
                key={i}
                className={`${styles.dot} ${i === current ? styles.dotActive : ''}`}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
        )}

        {/* Content area */}
        <div
          className={`${styles.content} ${slideDir === 'left' ? styles.slideLeft : ''} ${slideDir === 'right' ? styles.slideRight : ''}`}
          style={{ transform: dragOffset ? `translateX(${dragOffset * 0.2}px)` : undefined }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          {isTourPreview ? (
            <div className={styles.loadingState}>
              <span style={{ fontSize: 28 }}>✉️</span>
              <p style={{ color: 'var(--text-2)', textAlign: 'center' }}>
                Cover letters will appear here after you generate a resume.<br/>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>This is a tour preview.</span>
              </p>
            </div>
          ) : error && !streaming ? (
            <div className={styles.loadingState}>
              <span style={{ fontSize: 28 }}>⚠️</span>
              <p style={{ color: 'var(--text-2)', textAlign: 'center', fontSize: 13 }}>
                <strong style={{ color: '#ff6b6b' }}>{error.title}</strong><br/>
                <span style={{ fontSize: 12 }}>{error.message}</span>
              </p>
              <button
                onClick={() => { setError(null); generate() }}
                style={{
                  marginTop: 8,
                  padding: '7px 16px',
                  background: 'var(--accent)',
                  color: 'var(--accent-fg)',
                  border: 'none',
                  borderRadius: 'var(--radius)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Try again
              </button>
            </div>
          ) : (streaming && !streamingText) || (!displayText && !streaming && !error) ? (
            <div className={styles.loadingState}>
              <span className={styles.bigSpinner} />
              <p>Generating your cover letter…</p>
            </div>
          ) : (
            <div className={styles.letterBody}>
              {streaming
                ? <pre className={styles.streamingPre}>{streamingText}<span className={styles.cursor} /></pre>
                : <ReactMarkdown>{letters[current]}</ReactMarkdown>
              }
            </div>
          )}
        </div>

        {/* Swipe hint */}
        {letters.length > 1 && (
          <div className={styles.swipeHint}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6h8M5 3l-3 3 3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Swipe or drag to browse versions
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M10 6H2M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}

        {/* Footer actions */}
        <div className={styles.footer} id="tour-cl-actions">
          <button className={styles.copyBtn} onClick={handleCopy} disabled={!letters[current] || streaming}>
            {copied ? (
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M2 7l3 3 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M2 9V2h7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            )}
            {copied ? 'Copied!' : 'Copy'}
          </button>

          <button className={styles.downloadBtn} onClick={handleDownload} disabled={!letters[current] || streaming || downloading}>
            {downloading ? (
              <span className={styles.spinner} />
            ) : (
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M6.5 2v6M4 6l2.5 2.5L9 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 10h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            )}
            {downloading ? 'Saving…' : 'Download DOCX'}
          </button>
        </div>
      </div>
    </div>
  )
}