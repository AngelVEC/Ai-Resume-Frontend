import { useRef, useState, useEffect } from 'react'
import ScorePanel from '../resume/ScorePanel'
import styles from './LeftPanel.module.css'

export default function LeftPanel({ onGenerate, loading }) {
  const fileRef = useRef(null)
  const jdRef = useRef(null)
  const extraRef = useRef(null)
  const fileStateRef = useRef({ file: null })
  const scorePanelRef = useRef(null)

  const [hasFile, setHasFile] = useState(false)
  const [hasJD, setHasJD] = useState(false)
  const [scoreKey, setScoreKey] = useState(0)
  const [analysing, setAnalysing] = useState(false)
  const [showScore, setShowScore] = useState(false)

  // Clear all inputs on mount so browser-cached values don't mismatch React state
  useEffect(() => {
    if (fileRef.current) fileRef.current.value = ''
    if (jdRef.current) jdRef.current.value = ''
    if (extraRef.current) extraRef.current.value = ''
    fileStateRef.current.file = null
    // Reset upload zone appearance
    const zone = document.getElementById('upload-zone')
    const label = document.getElementById('file-label')
    const hint = document.getElementById('file-hint')
    if (zone) zone.classList.remove(styles.hasFile)
    if (label) label.textContent = 'Click or drag to upload'
    if (hint) hint.textContent = 'PDF or DOCX · max 5 MB'
  }, [])

  const canAnalyse = hasFile && hasJD && !loading

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    fileStateRef.current.file = file
    const label = document.getElementById('file-label')
    const hint = document.getElementById('file-hint')
    if (label) label.textContent = file.name
    if (hint) hint.textContent = `${(file.size / 1024).toFixed(0)} KB · ready`
    document.getElementById('upload-zone').classList.add(styles.hasFile)
    setHasFile(true)
    setShowScore(false) // reset score on new file
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) {
      fileStateRef.current.file = file
      const label = document.getElementById('file-label')
      const hint = document.getElementById('file-hint')
      if (label) label.textContent = file.name
      if (hint) hint.textContent = `${(file.size / 1024).toFixed(0)} KB · ready`
      document.getElementById('upload-zone').classList.add(styles.hasFile)
      setHasFile(true)
      setShowScore(false)
    }
  }

  const handleSubmit = () => {
    const file = fileStateRef.current.file
    const jd = jdRef.current?.value?.trim()
    if (!file) { alert('Please upload your resume (PDF or DOCX).'); return }
    if (!jd) { alert('Please paste a job description.'); return }
    onGenerate({ file, jobDescription: jd, extraPrompt: extraRef.current?.value || '' })
  }

  const handleAnalyse = () => {
    const jd = jdRef.current?.value?.trim()
    if (!fileStateRef.current.file || !jd) return
    setScoreKey(k => k + 1) // remount ScorePanel to re-trigger
    setShowScore(true)
    setAnalysing(true)
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.headerLabel}>Your inputs</span>
        <span className={styles.badge}>01</span>
      </div>

      <div className={styles.body}>
        {/* Upload */}
        <div className={styles.field} id="tour-upload">
          <label className={styles.label}>Resume file</label>
          <div
            id="upload-zone"
            className={styles.uploadZone}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <div className={styles.uploadIcon}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 13V4M10 4L7 7M10 4L13 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 14v1a2 2 0 002 2h10a2 2 0 002-2v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span id="file-label" className={styles.uploadTitle}>Click or drag to upload</span>
            <span id="file-hint" className={styles.uploadHint}>PDF or DOCX · max 5 MB</span>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>
        </div>

        {/* Job description */}
        <div className={styles.field} id="tour-jd">
          <label className={styles.label}>Job description</label>
          <textarea
            ref={jdRef}
            className={styles.textarea}
            rows={7}
            placeholder="Paste the full job description here…"
            onChange={(e) => {
              setHasJD(!!e.target.value.trim())
              setShowScore(false) // reset score when JD changes
            }}
          />
        </div>

        {/* Extra prompt */}
        <div className={styles.field} id="tour-extra">
          <label className={styles.label}>
            Extra instructions
            <span className={styles.optional}>optional</span>
          </label>
          <textarea
            ref={extraRef}
            className={styles.textarea}
            rows={2}
            placeholder="e.g. Keep it to 1 page, emphasise leadership skills…"
          />
        </div>

        {/* Score panel — shown after analyse */}
        {showScore && (
          <ScorePanel
            key={scoreKey}
            resumeFile={fileStateRef.current.file}
            jobDescription={jdRef.current?.value}
            onScoreReady={() => setAnalysing(false)}
            onError={() => setAnalysing(false)}
          />
        )}
      </div>

      <div className={styles.footer} id="tour-generate">
        {/* Analyse button */}
        <button
          className={styles.analyseBtn}
          onClick={handleAnalyse}
          disabled={!canAnalyse || analysing}
          id="tour-analyse"
          title={!canAnalyse ? 'Upload a resume and paste a job description first' : ''}
        >
          {analysing ? (
            <span className={styles.btnInner}>
              <span className={styles.spinnerDark} />
              Analysing…
            </span>
          ) : (
            <span className={styles.btnInner}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M4 7l1.5 1.5L9 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Analyse match
            </span>
          )}
        </button>

        {/* Generate button */}
        <button
          className={styles.generateBtn}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <span className={styles.btnInner}>
              <span className={styles.spinner} />
              Generating…
            </span>
          ) : (
            <span className={styles.btnInner}>
              Generate tailored resume
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          )}
        </button>
      </div>
    </div>
  )
}