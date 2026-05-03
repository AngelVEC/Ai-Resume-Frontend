import { useState, useRef, useEffect } from 'react'
import { parseResumeSections, buildResumeText } from '../../utils/resumeSections'
import styles from './SectionEditor.module.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

// ---------------------------------------------------------------------------
// Stream helper
// ---------------------------------------------------------------------------
async function streamEditSection(sectionTitle, sectionContent, instruction, jobDescription, onChunk) {
  const response = await fetch(`${API_BASE}/edit-section`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      section_title: sectionTitle,
      section_content: sectionContent,
      instruction,
      job_description: jobDescription,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(err.detail || `Server error ${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let fullText = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    for (const line of decoder.decode(value, { stream: true }).split('\n')) {
      if (!line.startsWith('data: ')) continue
      try {
        const payload = JSON.parse(line.slice(6))
        if (payload.error) { const e = new Error(payload.message || payload.error); e.structured = payload; throw e }
        if (payload.text) { fullText += payload.text; onChunk(fullText) }
      } catch (e) { if (e.structured) throw e }
    }
  }
  return fullText
}

// ---------------------------------------------------------------------------
// Single section card
// ---------------------------------------------------------------------------
function SectionCard({ section, jobDescription, onSave }) {
  const [editing, setEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(section.content)
  const [instruction, setInstruction] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [streaming, setStreaming] = useState('')
  const [error, setError] = useState(null)
  const [hovered, setHovered] = useState(false)
  const taRef = useRef(null)

  function openEdit() {
    setEditedContent(section.content)
    setInstruction('')
    setStreaming('')
    setError(null)
    setEditing(true)
    setTimeout(() => taRef.current?.focus(), 60)
  }

  function handleSave() {
    onSave({ ...section, content: editedContent })
    setEditing(false)
  }

  function handleCancel() {
    setEditing(false)
    setEditedContent(section.content)
    setStreaming('')
    setError(null)
  }

  async function handleAsk() {
    if (!instruction.trim() || aiLoading) return
    setAiLoading(true)
    setStreaming('')
    setError(null)
    try {
      const result = await streamEditSection(
        section.title, editedContent, instruction, jobDescription,
        (t) => setStreaming(t),
      )
      setEditedContent(result.trim())
      setStreaming('')
      setInstruction('')
    } catch (e) {
      setError(e.structured?.message || e.message)
    } finally {
      setAiLoading(false)
    }
  }

  if (!editing) {
    return (
      <div
        className={`${styles.card} ${hovered ? styles.cardHovered : ''}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className={styles.cardHead}>
          <span className={styles.cardTitle}>{section.title}</span>
          <button
            className={`${styles.editBtn} ${hovered ? styles.editVisible : ''}`}
            onClick={openEdit}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M7.5 1.5l2 2-6 6H1.5v-2l6-6z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Edit
          </button>
        </div>
        <div className={styles.cardBody}>
          {section.content.split('\n').map((line, i) => {
            const t = line.trim()
            if (!t) return <div key={i} className={styles.spacer} />
            if (t.startsWith('* ') || t.startsWith('- ') || t.startsWith('• ')) {
              return <div key={i} className={styles.bullet}>• {t.slice(2)}</div>
            }
            return <div key={i} className={styles.bodyLine}>{t}</div>
          })}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.cardEditing}>
      <div className={styles.cardHead}>
        <span className={styles.cardTitle}>{section.title}</span>
        <span className={styles.editingBadge}>✏️ Editing</span>
      </div>

      <textarea
        ref={taRef}
        className={styles.contentTa}
        value={streaming || editedContent}
        onChange={(e) => !aiLoading && setEditedContent(e.target.value)}
        rows={Math.max(4, (editedContent || '').split('\n').length + 2)}
        disabled={aiLoading}
        readOnly={aiLoading && !!streaming}
      />

      <div className={styles.aiRow}>
        <input
          className={styles.instrInput}
          placeholder='Ask AI… e.g. "make this more concise" or "add more keywords"'
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
          disabled={aiLoading}
        />
        <button className={styles.askBtn} onClick={handleAsk} disabled={!instruction.trim() || aiLoading}>
          {aiLoading
            ? <span className={styles.spinner} />
            : <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M11.5 6.5A5 5 0 111.5 6.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <path d="M9 1l2 2-2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
          }
          {aiLoading ? 'Rewriting…' : 'Ask AI'}
        </button>
      </div>

      {error && <div className={styles.errMsg}>⚠️ {error}</div>}

      <div className={styles.editActions}>
        <button className={styles.cancelBtn} onClick={handleCancel}>Cancel</button>
        <button className={styles.saveBtn} onClick={handleSave} disabled={aiLoading}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Save section
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main SectionEditor
// ---------------------------------------------------------------------------
export default function SectionEditor({ resumeText, jobDescription, onResumeChange }) {
  const [parsed] = useState(() => parseResumeSections(resumeText))
  const [header] = useState(parsed.header)
  const [sections, setSections] = useState(parsed.sections)

  function handleSave(updated) {
    const next = sections.map(s => s.id === updated.id ? updated : s)
    setSections(next)
    onResumeChange(buildResumeText(header, next))
  }

  return (
    <div className={styles.editor}>
      {/* Header block */}
      {header && (
        <div className={styles.headerBlock}>
          {header.split('\n').map((line, i) => (
            <div key={i} className={i === 0 ? styles.nameLine : styles.contactLine}>{line.trim()}</div>
          ))}
        </div>
      )}

      {sections.length === 0 && (
        <div className={styles.noSections}>Could not detect sections — try switching back to AI view.</div>
      )}

      {sections.map(s => (
        <SectionCard
          key={s.id}
          section={s}
          jobDescription={jobDescription}
          onSave={handleSave}
        />
      ))}
    </div>
  )
}
