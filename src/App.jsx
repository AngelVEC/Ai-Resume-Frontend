import { useState } from 'react'
import LeftPanel from './components/leftPanel/LeftPanel'
import RightPanel from './components/rightPanel/RightPanel'
import ErrorToast from './components/ErrorToast'
import Tour, { useTour } from './components/guideTour/Tour'
import styles from './App.module.css'

// importing env variable
const API_BASE = import.meta.env.VITE_API_URL || ''

export default function App() {
  const [messages, setMessages] = useState([])
  const [streamingText, setStreamingText] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [chatLoading, setChatLoading] = useState(false)
  const [chatEnabled, setChatEnabled] = useState(false)
  const [resumeText, setResumeText] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [activeTab, setActiveTab] = useState('input')
  const [apiError, setApiError] = useState(null)
  const [tourCoverLetter, setTourCoverLetter] = useState(false)
  const { showTour, startTour, endTour } = useTour()

  // -------------------------------------------------------------------------
  // Read an SSE stream, calling onChunk per text chunk, returns full text (it's for the reply that generated from AI response)
  // -------------------------------------------------------------------------
  async function readStream(response, onChunk) {
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let fullText = ''
    let resumeTextFromServer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const raw = decoder.decode(value, { stream: true })
      for (const line of raw.split('\n')) {
        if (!line.startsWith('data: ')) continue
        try {
          const payload = JSON.parse(line.slice(6))
          // Structured error from backend (rate limit, auth, etc.)
          if (payload.error) {
            const err = new Error(payload.message || payload.error)
            err.structured = payload  // attach full error object
            throw err
          }
          if (payload.text) { fullText += payload.text; onChunk(fullText) }
          if (payload.done && payload.resume_text) resumeTextFromServer = payload.resume_text
        } catch (e) {
          if (e.structured) throw e  // re-throw structured errors
          // ignore JSON parse errors on incomplete SSE lines
        }
      }
    }
    return { fullText, resumeTextFromServer }
  }

  // -------------------------------------------------------------------------
  // Generate — POST /generate with FormData
  // -------------------------------------------------------------------------
  async function handleGenerate({ file, jobDescription: jd, extraPrompt }) {
    setLoading(true)
    setStreaming(true)
    setStreamingText('')
    setMessages([])
    setJobDescription(jd)
    setChatEnabled(false)

    const formData = new FormData()
    formData.append('resume', file)
    formData.append('job_description', jd)
    formData.append('extra_prompt', extraPrompt)

    try {
      const response = await fetch(`${API_BASE}/generate`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: 'Unknown error' }))
        setApiError({ error: 'server_error', title: 'Request failed', message: err.detail || `Server error ${response.status}` })
        return
      }

      const { fullText, resumeTextFromServer } = await readStream(response, (text) => {
        setStreamingText(text)
      })

      setMessages([{ role: 'assistant', content: fullText }])
      setStreamingText('')
      if (resumeTextFromServer) setResumeText(resumeTextFromServer)
      setChatEnabled(true)
      setActiveTab('output')
    } catch (err) {
      setApiError(err.structured || { error: 'unknown_error', title: 'Something went wrong', message: err.message })
      setStreamingText('')
    } finally {
      setLoading(false)
      setStreaming(false)
    }
  }

  // -------------------------------------------------------------------------
  // Chat — POST /chat with JSON
  // -------------------------------------------------------------------------
  async function handleSendMessage(text, editedContent = null) {
    // If user has made section edits, replace the last assistant message with edited version
    // so the AI refines the edited resume, not the original
    const baseMessages = editedContent
      ? messages.map((m, i) => {
          const isLastAssistant = m.role === 'assistant' && i === messages.map(x => x.role).lastIndexOf('assistant')
          return isLastAssistant ? { ...m, content: editedContent } : m
        })
      : messages

    const userMsg = { role: 'user', content: text }
    const updatedMessages = [...baseMessages, userMsg]
    setMessages(updatedMessages)
    setChatLoading(true)
    setStreaming(true)
    setStreamingText('')

    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          resume_text: resumeText,
          job_description: jobDescription,
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: 'Unknown error' }))
        setApiError({ error: 'server_error', title: 'Request failed', message: err.detail || `Server error ${response.status}` })
        return
      }

      const { fullText } = await readStream(response, (text) => {
        setStreamingText(text)
      })

      setMessages([...updatedMessages, { role: 'assistant', content: fullText }])
      setStreamingText('')
    } catch (err) {
      setApiError(err.structured || { error: 'unknown_error', title: 'Something went wrong', message: err.message })
      setStreamingText('')
    } finally {
      setChatLoading(false)
      setStreaming(false)
    }
  }

  return (
    <div className={styles.app}>
      <header className={styles.topBar}>
        <div className={styles.logo}>
          <span className={styles.logoMark}>✦</span>
          <span>Resume AI</span>
        </div>
        <span className={styles.topHint}>Tailored resumes in seconds</span>
        <button id="tour-how-it-works" className={styles.tourBtn} onClick={startTour} title="How it works">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M7 6.5v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            <circle cx="7" cy="4.5" r="0.75" fill="currentColor"/>
          </svg>
          How it works
        </button>
      </header>

      {/* Mobile tab switcher */}
      <div className={styles.tabBar}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'input' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('input')}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <rect x="1.5" y="1.5" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M4 5h5M4 7.5h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          Your Inputs
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'output' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('output')}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M2 6.5h9M7 3l4 3.5L7 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          AI Output
          {messages.length > 0 && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />}
        </button>
      </div>

      <main className={styles.splitScreen}>
        <div className={activeTab === 'input' ? styles.activePanel : ''}>
          <LeftPanel onGenerate={handleGenerate} loading={loading} />
        </div>
        <div className={activeTab === 'output' ? styles.activePanel : ''}>
          <RightPanel
            messages={messages}
            streaming={streaming}
            streamingText={streamingText}
            chatEnabled={chatEnabled}
            onSendMessage={handleSendMessage}
            chatLoading={chatLoading}
            resumeText={resumeText}
            jobDescription={jobDescription}
            tourCoverLetter={tourCoverLetter}
            onTourCoverLetterClose={() => setTourCoverLetter(false)}
          />
        </div>
      </main>

      {showTour && (
        <Tour
          onDone={endTour}
          onOpenCoverLetter={() => { setActiveTab('output'); setTourCoverLetter(true) }}
          onCloseCoverLetter={() => setTourCoverLetter(false)}
        />
      )}
      <ErrorToast error={apiError} onDismiss={() => setApiError(null)} />
    </div>
  )
}