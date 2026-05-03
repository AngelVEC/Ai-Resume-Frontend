import { useEffect, useState } from 'react'
import styles from './ErrorToast.module.css'

const ICONS = {
  rate_limit: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M8 5v3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <circle cx="8" cy="11" r="0.8" fill="currentColor"/>
    </svg>
  ),
  auth_error: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 2L2 5v4c0 3 2.5 5 6 6 3.5-1 6-3 6-6V5L8 2z" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M6 8l1.5 1.5L10 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  timeout: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M8 4.5V8l2.5 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  content_blocked: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  default: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 2l6 11H2L8 2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
      <path d="M8 7v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <circle cx="8" cy="11.5" r="0.8" fill="currentColor"/>
    </svg>
  ),
}

export default function ErrorToast({ error, onDismiss }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!error) return
    setVisible(true)
    // Auto-dismiss after 6 seconds (except auth errors — those need manual action)
    if (error.error !== 'auth_error') {
      const t = setTimeout(() => handleDismiss(), 6000)
      return () => clearTimeout(t)
    }
  }, [error])

  function handleDismiss() {
    setVisible(false)
    setTimeout(() => onDismiss(), 300) // wait for fade-out animation
  }

  if (!error) return null

  const icon = ICONS[error.error] || ICONS.default
  const isRetryable = ['rate_limit', 'server_error', 'timeout'].includes(error.error)

  return (
    <div className={`${styles.toast} ${visible ? styles.visible : styles.hidden}`}>
      <div className={styles.icon}>{icon}</div>
      <div className={styles.body}>
        <div className={styles.title}>{error.title || 'Error'}</div>
        <div className={styles.message}>{error.message}</div>
      </div>
      <div className={styles.actions}>
        {isRetryable && (
          <span className={styles.retryHint}>Try again</span>
        )}
        <button className={styles.closeBtn} onClick={handleDismiss}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
