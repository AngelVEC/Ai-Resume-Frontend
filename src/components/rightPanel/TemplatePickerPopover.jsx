import { useEffect, useRef, useState } from 'react'
import { TEMPLATES, downloadAsDocx } from '../../utils/useDownloadDocx'
import styles from './TemplatePickerPopover.module.css'

function TemplatePreview({ template }) {
  const isModern = template.id === 'modern'
  const isTraditional = template.id === 'traditional'
  return (
    <div className={styles.preview}>
      <div className={styles.previewName} style={{
        background: isModern ? template.preview.accent : 'transparent',
        color: isModern ? '#fff' : '#111',
        textAlign: isTraditional ? 'center' : 'left',
        padding: isModern ? '2px 4px' : '0',
        fontFamily: isModern ? 'Arial' : isTraditional ? 'Georgia' : 'inherit',
        borderBottom: isTraditional ? '1.5px double #111' : 'none',
        marginBottom: 4,
      }}>John Doe</div>
      <div className={styles.previewSection} style={{
        borderLeft: isModern ? `2px solid ${template.preview.accent}` : 'none',
        borderTop: isTraditional ? '1px solid #111' : 'none',
        borderBottom: isTraditional ? '1px solid #111' : 'none',
        paddingLeft: isModern ? 4 : 0,
        color: isModern ? template.preview.accent : '#333',
        textAlign: isTraditional ? 'center' : 'left',
        textTransform: 'uppercase',
        fontSize: 7,
        letterSpacing: '0.04em',
      }}>Experience</div>
      {[70, 90, 55].map((w, i) => (
        <div key={i} className={styles.previewLine} style={{ width: `${w}%` }} />
      ))}
    </div>
  )
}

// Rendered inline (no portal) — positioned via absolute CSS on parent wrapper
export default function TemplatePickerPopover({ markdownText, filename, onClose, direction = 'down' }) {
  const [selected, setSelected] = useState('minimal')
  const [downloading, setDownloading] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    function handleKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  async function handleDownload() {
    setDownloading(true)
    try {
      await downloadAsDocx(markdownText, filename, selected)
      onClose()
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div
      className={styles.popover}
      ref={ref}
      style={direction === 'up' ? { bottom: 'calc(100% + 6px)', top: 'auto', left: 'auto', right: 0 } : undefined}
    >
      <div className={styles.popoverHeader}>
        <span className={styles.popoverTitle}>Choose a template</span>
        <button className={styles.closeBtn} onClick={onClose}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      <div className={styles.templates}>
        {TEMPLATES.map(t => (
          <button
            key={t.id}
            className={`${styles.templateCard} ${selected === t.id ? styles.selected : ''}`}
            onClick={() => setSelected(t.id)}
          >
            <TemplatePreview template={t} />
            <div className={styles.templateName}>{t.name}</div>
            <div className={styles.templateDesc}>{t.description}</div>
            {selected === t.id && (
              <div className={styles.checkmark}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5.5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>

      <div className={styles.popoverFooter}>
        <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
        <button className={styles.downloadBtn} onClick={handleDownload} disabled={downloading}>
          {downloading ? (
            <><span className={styles.spinner} /> Saving…</>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M6.5 2v6M4 6l2.5 2.5L9 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 10h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              Download DOCX
            </>
          )}
        </button>
      </div>
    </div>
  )
}