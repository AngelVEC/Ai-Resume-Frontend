import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { downloadAsDocx } from '../../utils/useDownloadDocx'
import CoverLetterModal from './CoverLetterModal'
import RightScorePanel from '../resume/RightScorePanel'
import TemplatePickerPopover from './TemplatePickerPopover'
import SectionEditor from '../resume/SectionEditor'
import styles from './RightPanel.module.css'

function DownloadButton({ content, filename = 'tailored-resume.docx', popoverDirection = 'down' }) {
  const [showPicker, setShowPicker] = useState(false)

  return (
    <div style={{ position: 'relative' }}>
      <button
        className={styles.downloadBtn}
        onClick={() => setShowPicker(v => !v)}
        title="Download as DOCX"
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <path d="M6.5 2v6M4 6l2.5 2.5L9 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 10h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
        Download DOCX
      </button>
      {showPicker && (
        <TemplatePickerPopover
          markdownText={content}
          filename={filename}
          direction={popoverDirection}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}

function stripMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')   // **bold** → bold
    .replace(/\*(.+?)\*/g, '$1')        // *italic* → italic
    .replace(/^#{1,6}\s+/gm, '')        // ## Heading → Heading
    .replace(/^[-*•]\s+/gm, '• ')       // - bullet → • bullet
    .replace(/^\s*\n/gm, '\n')          // remove blank lines with spaces
    .trim()
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(stripMarkdown(text)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button className={styles.copyBtn} onClick={copy} title="Copy to clipboard">
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
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function Message({ role, content, isStreaming, onCoverLetter, onCheckScore, chatEnabled, hasResumeText }) {
  return (
    <div className={role === 'assistant' ? styles.aiBubble : styles.userBubble}>
      {role === 'user' && <span className={styles.userLabel}>You</span>}
      {role === 'assistant' && (
        <div className={styles.aiHeader}>
          <span className={styles.aiTag}>AI</span>
          {!isStreaming && content && <CopyButton text={content} />}
          {!isStreaming && content && <DownloadButton content={content} />}
          {!isStreaming && content && chatEnabled && (
            <button
              id="tour-cover-letter-btn"
              className={styles.coverLetterBtn}
              onClick={onCoverLetter}
              disabled={!hasResumeText}
              title={hasResumeText ? 'Generate cover letter' : 'Please regenerate your resume first'}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <rect x="1.5" y="2.5" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M1.5 5l5 3 5-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Cover Letter
            </button>
          )}
          {!isStreaming && content && chatEnabled && (
            <button className={styles.atsBtn} onClick={onCheckScore} title="Check ATS match score">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M4 7l1.5 1.5L9 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              ATS Score
            </button>
          )}
        </div>
      )}
      <div className={styles.messageText}>
        {isStreaming
          ? <pre className={styles.streamingPre}>{content}<span className={styles.cursor} /></pre>
          : <ReactMarkdown>{content}</ReactMarkdown>
        }
      </div>
    </div>
  )
}

export default function RightPanel({ messages, streaming, streamingText, chatEnabled, onSendMessage, chatLoading, resumeText, jobDescription, tourCoverLetter, onTourCoverLetterClose }) {
  const chatRef = useRef(null)
  const inputRef = useRef(null)
  const [showCoverLetter, setShowCoverLetter] = useState(false)
  const [scoreTarget, setScoreTarget] = useState(null)
  const [view, setView] = useState('ai')
  const [editedResumeText, setEditedResumeText] = useState(null)

  // Get the latest assistant message content
  const latestAssistantMsg = messages.filter(m => m.role === 'assistant').slice(-1)[0]?.content || ''

  // When a new assistant message arrives, reset editedResumeText so section editor uses the latest
  const prevLatestRef = useRef('')
  useEffect(() => {
    if (latestAssistantMsg && latestAssistantMsg !== prevLatestRef.current) {
      prevLatestRef.current = latestAssistantMsg
      setEditedResumeText(null) // reset edits when AI generates new version
    }
  }, [latestAssistantMsg])

  // Allow tour to open the cover letter modal
  useEffect(() => {
    if (tourCoverLetter) setShowCoverLetter(true)
    else setShowCoverLetter(false)
  }, [tourCoverLetter])

  // Reset score panel when a new resume is generated
  useEffect(() => {
    if (messages.length === 0) {
      setScoreTarget(null)
      setView('ai')
      setEditedResumeText(null)
    }
  }, [messages])

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [messages, streamingText])

  const handleSend = () => {
    const text = inputRef.current?.value?.trim()
    if (!text || chatLoading) return
    onSendMessage(text, editedResumeText || null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isEmpty = messages.length === 0 && !streamingText

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.headerLabel}>AI output</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {chatEnabled && (
            <div className={styles.viewToggle}>
              <button
                className={`${styles.viewBtn} ${view === 'ai' ? styles.viewBtnActive : ''}`}
                onClick={() => setView('ai')}
              >AI view</button>
              <button
                className={`${styles.viewBtn} ${view === 'sections' ? styles.viewBtnActive : ''}`}
                onClick={() => setView('sections')}
              >✏️ Edit sections</button>
            </div>
          )}
          <span className={styles.badge}>02</span>
        </div>
      </div>

      {/* Section Editor view */}
      {view === 'sections' && chatEnabled && messages.length > 0 && (
        <div className={styles.chatArea} style={{ overflow: 'auto' }}>
          <SectionEditor
            key={latestAssistantMsg}
            resumeText={editedResumeText || latestAssistantMsg}
            jobDescription={jobDescription}
            onResumeChange={(newText) => setEditedResumeText(newText)}
          />
          {editedResumeText && (
            <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--accent)', flex: 1 }}>✓ Resume updated with your edits</span>
              <div style={{ position: 'relative' }}>
                <DownloadButton content={editedResumeText} filename="tailored-resume-edited.docx" popoverDirection="up" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI view */}
      {view === 'ai' && (
        <>
      <div className={styles.chatArea} ref={chatRef} id="tour-output">
        {isEmpty ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path d="M16 4C9.373 4 4 9.373 4 16s5.373 12 12 12 12-5.373 12-12S22.627 4 16 4z" stroke="currentColor" strokeWidth="1.2" opacity="0.3"/>
                <path d="M11 16h10M16 11v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3"/>
              </svg>
            </div>
            <p className={styles.emptyTitle}>Your tailored resume will appear here</p>
            <p className={styles.emptyHint}>Fill in the left panel and click Generate</p>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => {
              const isLatestAssistant = msg.role === 'assistant' && i === messages.map(m => m.role).lastIndexOf('assistant')
              const displayContent = (isLatestAssistant && editedResumeText) ? editedResumeText : msg.content
              return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column' }}>
                <Message
                  role={msg.role}
                  content={displayContent}
                  isStreaming={false}
                  onCoverLetter={() => setShowCoverLetter(true)}
                  onCheckScore={() => setScoreTarget(displayContent)}
                  chatEnabled={chatEnabled}
                  hasResumeText={!!resumeText}
                />
                {msg.role === 'assistant' && scoreTarget && scoreTarget === displayContent && jobDescription && (
                  <RightScorePanel
                    generatedText={stripMarkdown(displayContent)}
                    jobDescription={jobDescription}
                    onClose={() => setScoreTarget(null)}
                  />
                )}
              </div>
            )})}
            {streamingText && (
              <Message role="assistant" content={streamingText} isStreaming={streaming} />
            )}
          </>
        )}
      </div>

      <div className={styles.inputArea} id="tour-chat">
        {!chatEnabled && (
          <p className={styles.inputHint}>Generate a resume first to unlock the chat</p>
        )}
        <div className={styles.inputRow}>
          <textarea
            ref={inputRef}
            className={styles.chatInput}
            rows={2}
            placeholder={chatEnabled ? 'Ask AI to refine the resume… (Shift+Enter for new line)' : 'Chat unlocks after generating…'}
            disabled={!chatEnabled || chatLoading}
            onKeyDown={handleKeyDown}
          />
          <button
            className={styles.sendBtn}
            onClick={handleSend}
            disabled={!chatEnabled || chatLoading}
          >
            {chatLoading ? (
              <span className={styles.spinner} />
            ) : (
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M13 7.5L2 2l2.5 5.5L2 13l11-5.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        </div>
      </div>
        </>
      )}

      {showCoverLetter && (
        <CoverLetterModal
          resumeText={resumeText}
          jobDescription={jobDescription}
          isTourPreview={!!tourCoverLetter && !resumeText}
          onClose={() => { setShowCoverLetter(false); onTourCoverLetterClose?.() }}
        />
      )}
    </div>
  )
}