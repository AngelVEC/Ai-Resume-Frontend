import { useEffect, useRef, useState, useCallback } from 'react'
import { ATSScorePreview, SectionEditorPreview, ChatPreview, TemplatePreview } from './TourDemoOverlay'
import styles from './Tour.module.css'

// ---------------------------------------------------------------------------
// Tour steps
// ---------------------------------------------------------------------------
export const TOUR_STEPS = [
  // ── Resume inputs ──────────────────────────────────────────────────────────
  {
    id: 'welcome',
    target: null,
    title: '👋 Welcome to Resume AI',
    content: 'This quick tour will walk you through every feature — from tailoring your resume to generating a cover letter. You can skip at any time.',
    placement: 'center',
  },
  {
    id: 'upload',
    target: 'tour-upload',
    title: '📄 Upload your resume',
    content: 'Click here to upload your existing resume as a PDF or DOCX file. This is the base we\'ll tailor for each job.',
    placement: 'right',
  },
  {
    id: 'jd',
    target: 'tour-jd',
    title: '📋 Paste the job description',
    content: 'Copy the full job description from the job posting and paste it here. The more detail, the better the tailoring.',
    placement: 'right',
  },
  {
    id: 'extra',
    target: 'tour-extra',
    title: '✏️ Add extra instructions',
    content: 'Optionally guide the AI — for example: "keep to 1 page", "emphasise leadership", or "use a formal tone".',
    placement: 'right',
  },
  {
    id: 'analyse',
    target: 'tour-analyse',
    title: '📊 Check your ATS match score',
    content: 'Before generating, click "Analyse match" to see how well your resume matches the job description — with a score, strengths, gaps, and missing keywords.',
    placement: 'top',
    demoComponent: 'ats-score',
    landscapeHint: true,
  },
  {
    id: 'generate',
    target: 'tour-generate',
    title: '⚡ Generate your tailored resume',
    content: 'Click this to send everything to the AI. Your resume streams in on the right — tailored to the job description.',
    placement: 'top',
  },
  // ── AI output ──────────────────────────────────────────────────────────────
  {
    id: 'output',
    target: 'tour-output',
    title: '✨ Your tailored resume',
    content: 'The AI-generated resume appears here, formatted and ready to use. You can copy it, download as DOCX, check its ATS score, or generate a cover letter.',
    placement: 'left',
    switchTab: 'output',
  },
  {
    id: 'chat',
    target: 'tour-chat',
    title: '💬 Refine with chat',
    content: 'Not happy with something? Ask the AI to refine it — "make the summary shorter", "add more keywords", or anything else. Your messages appear on the right.',
    placement: 'top',
    demoComponent: 'chat',
    switchTab: 'output',
    landscapeHint: true,
  },
  {
    id: 'edit-sections',
    target: 'tour-output',
    title: '🗂️ Edit section by section',
    content: 'Switch to "Edit sections" view to edit each part of your resume individually. You can type changes manually or use the AI to rewrite just that section.',
    placement: 'left',
    demoComponent: 'sections',
    switchTab: 'output',
    landscapeHint: true,
  },
  {
    id: 'templates',
    target: 'tour-output',
    title: '📥 Download with templates',
    content: 'Click "Download DOCX" to pick from 3 templates — Minimal, Modern, or Traditional — before downloading your resume as a Word file.',
    placement: 'left',
    demoComponent: 'templates',
    switchTab: 'output',
    landscapeHint: true,
  },
  // ── Cover letter ───────────────────────────────────────────────────────────
  {
    id: 'cover-letter-intro',
    target: null,
    title: '✉️ Cover Letter Generator',
    content: 'Resume AI can also generate a personalised cover letter based on your resume and job description. Let\'s see how it works!',
    placement: 'center',
  },
  {
    id: 'cover-letter-btn',
    target: 'tour-cover-letter-btn',
    title: '📨 Open the Cover Letter tool',
    content: 'After generating your resume, this button appears in the output header. Click it to open the Cover Letter modal.',
    placement: 'bottom',
    switchTab: 'output',
  },
  {
    id: 'cover-letter-modal',
    target: 'tour-cl-modal',
    title: '🪟 The Cover Letter modal',
    content: 'Your cover letter generates instantly. Each version is unique — swipe or drag left/right to browse through different versions.',
    placement: 'center',
    openModal: true,
  },
  {
    id: 'cover-letter-new',
    target: 'tour-cl-new',
    title: '🔄 Generate new versions',
    content: 'Not happy with this one? Click "New version" to generate another. You can keep as many versions as you like and pick your favourite.',
    placement: 'bottom',
    openModal: true,
  },
  {
    id: 'cover-letter-actions',
    target: 'tour-cl-actions',
    title: '📥 Copy or download',
    content: 'Copy the cover letter as clean plain text, or download it as a Word DOCX — ready to attach to your application.',
    placement: 'top',
    openModal: true,
  },
  {
    id: 'done',
    target: null,
    title: '🎉 You\'re all set!',
    content: 'That\'s the full tour! Upload your resume, generate a tailored version, refine it section by section, and grab a cover letter — all in one place. Good luck! 🚀',
    placement: 'center',
    closeModal: true,
  },
  {
    id: 'revisit',
    target: 'tour-how-it-works',
    title: '🔁 Want to revisit the tour?',
    content: 'Click this "How it works" button anytime to replay the tour from the beginning.',
    placement: 'bottom',
  },
]

const STORAGE_KEY = 'resume-ai-tour-done'

// ---------------------------------------------------------------------------
// Demo preview positioning — shows dummy data preview near the bubble
// ---------------------------------------------------------------------------
function DemoPreview({ component, bubbleRect }) {
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current || !bubbleRect) return
    const pw = ref.current.offsetWidth || 340
    const ph = ref.current.offsetHeight || 300
    const vw = window.innerWidth
    const vh = window.innerHeight
    const isMobile = vw <= 768

    let left, top

    if (isMobile) {
      // On mobile: full width, centred, placed above the bubble
      // to avoid overlapping with the app content below
      left = Math.max(8, (vw - pw) / 2)
      // Try above bubble first
      top = bubbleRect.top - ph - 12
      // If not enough space above, clamp to safe zone below header (~100px)
      if (top < 100) top = Math.min(bubbleRect.bottom + 8, vh - ph - 8)
      // Final clamp
      top = Math.max(8, Math.min(top, vh - ph - 8))
    } else {
      // Desktop: place to the left of bubble, else right
      left = bubbleRect.left - pw - 12
      if (left < 8) left = bubbleRect.right + 12
      if (left + pw > vw - 8) left = Math.max(8, vw - pw - 8)

      // Bottom-align with bubble bottom, then clamp so it never goes off-screen
      top = bubbleRect.bottom - ph
      if (top < 8) top = 8
      if (top + ph > vh - 8) top = vh - ph - 8
    }

    setPos({ top, left })
  }, [bubbleRect])

  const componentMap = {
    'ats-score': ATSScorePreview,
    'sections': SectionEditorPreview,
    'chat': ChatPreview,
    'templates': TemplatePreview,
  }

  const Component = componentMap[component]
  if (!Component) return null

  return (
    <div ref={ref} style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 400 }}>
      <Component />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Spotlight
// ---------------------------------------------------------------------------
function Spotlight({ rect, padding = 8 }) {
  if (!rect) return <div className={styles.overlayFull} />
  const x = rect.left - padding
  const y = rect.top - padding
  const w = rect.width + padding * 2
  const h = rect.height + padding * 2
  return (
    <svg className={styles.spotlight} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <mask id="spotlight-mask">
          <rect width="100%" height="100%" fill="white" />
          <rect x={x} y={y} width={w} height={h} rx="10" fill="black" />
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="rgba(0,0,0,0.65)" mask="url(#spotlight-mask)" />
      <rect x={x} y={y} width={w} height={h} rx="10" fill="none" stroke="rgba(212,255,110,0.5)" strokeWidth="1.5" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Bubble
// ---------------------------------------------------------------------------
function Bubble({ step, rect, stepIndex, totalSteps, onNext, onPrev, onSkip, onGoTo, onBubbleRect, demoComponent }) {
  const bubbleRef = useRef(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const [arrowPos, setArrowPos] = useState(null)
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768

  const componentMap = {
    'ats-score': ATSScorePreview,
    'sections': SectionEditorPreview,
    'chat': ChatPreview,
    'templates': TemplatePreview,
  }
  const InlineDemo = isMobile && demoComponent ? componentMap[demoComponent] : null

  useEffect(() => {
    if (!bubbleRef.current) return
    const bw = bubbleRef.current.offsetWidth
    const bh = bubbleRef.current.offsetHeight
    const vw = window.innerWidth
    const vh = window.innerHeight
    const pad = 16

    let top, left

    if (step.placement === 'center' || !rect) {
      top = vh / 2 - bh / 2
      left = vw / 2 - bw / 2
      setArrowPos(null)
    } else {
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2

      if (step.placement === 'right') {
        top = Math.min(Math.max(cy - bh / 2, pad), vh - bh - pad)
        left = Math.min(rect.right + 16, vw - bw - pad)
        setArrowPos({ side: 'left', top: cy - top - 8 })
      } else if (step.placement === 'left') {
        top = Math.min(Math.max(cy - bh / 2, pad), vh - bh - pad)
        left = Math.max(rect.left - bw - 16, pad)
        setArrowPos({ side: 'right', top: cy - top - 8 })
      } else if (step.placement === 'top') {
        top = Math.max(rect.top - bh - 16, pad)
        left = Math.min(Math.max(cx - bw / 2, pad), vw - bw - pad)
        setArrowPos({ side: 'bottom', left: cx - left - 8 })
      } else {
        top = Math.min(rect.bottom + 16, vh - bh - pad)
        left = Math.min(Math.max(cx - bw / 2, pad), vw - bw - pad)
        setArrowPos({ side: 'top', left: cx - left - 8 })
      }
    }

    setPos({ top, left })
    onBubbleRect?.({ top, left, width: bw, height: bh, right: left + bw, bottom: top + bh })
  }, [step, rect])

  const isCoverStep = ['cover-letter-intro','cover-letter-btn','cover-letter-modal','cover-letter-new','cover-letter-actions'].includes(step.id)
  const isFirst = stepIndex === 0
  const isLast = stepIndex === totalSteps - 1

  return (
    <div ref={bubbleRef} className={styles.bubble} style={{ top: pos.top, left: pos.left }}>
      {arrowPos && (
        <div className={styles.arrow} style={{
          ...(arrowPos.side === 'left'   && { left: -8,   top: arrowPos.top,  borderRight:  '8px solid var(--surface2)', borderTop: '8px solid transparent', borderBottom: '8px solid transparent' }),
          ...(arrowPos.side === 'right'  && { right: -8,  top: arrowPos.top,  borderLeft:   '8px solid var(--surface2)', borderTop: '8px solid transparent', borderBottom: '8px solid transparent' }),
          ...(arrowPos.side === 'top'    && { top: -8,    left: arrowPos.left, borderBottom: '8px solid var(--surface2)', borderLeft: '8px solid transparent', borderRight: '8px solid transparent' }),
          ...(arrowPos.side === 'bottom' && { bottom: -8, left: arrowPos.left, borderTop:    '8px solid var(--surface2)', borderLeft: '8px solid transparent', borderRight: '8px solid transparent' }),
        }} />
      )}

      <div className={styles.sectionBadge}>
        {isCoverStep
          ? <span className={styles.badgeCover}>✉️ Cover Letter</span>
          : <span className={styles.badgeResume}>📄 Resume</span>
        }
      </div>

      <div className={styles.progress}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <button key={i}
            className={`${styles.dot} ${i === stepIndex ? styles.dotActive : i < stepIndex ? styles.dotDone : ''}`}
            onClick={() => onGoTo(i)}
            title={`Step ${i + 1}`}
          />
        ))}
      </div>

      <div className={styles.bubbleTitle}>{step.title}</div>
      <div className={styles.bubbleContent}>{step.content}</div>

      {/* Landscape hint — only show on mobile portrait */}
      {step.landscapeHint && (
        <div className={styles.landscapeHint}>
          📱 Tip: rotate to landscape for a better view of this feature
        </div>
      )}

      {/* On mobile, show demo inline inside bubble instead of floating separately */}
      {InlineDemo && (
        <div className={styles.inlineDemo}>
          <InlineDemo />
        </div>
      )}

      <div className={styles.bubbleFooter}>
        <button className={styles.skipBtn} onClick={onSkip}>{isLast ? 'Close' : 'Skip tour'}</button>
        <div className={styles.navBtns}>
          {!isFirst && <button className={styles.prevBtn} onClick={onPrev}>← Prev</button>}
          <button className={styles.nextBtn} onClick={onNext}>{isLast ? 'Done 🎉' : 'Next →'}</button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Tour
// ---------------------------------------------------------------------------
export default function Tour({ onDone, onOpenCoverLetter, onCloseCoverLetter, onSwitchTab }) {
  const [stepIndex, setStepIndex] = useState(0)
  const [rect, setRect] = useState(null)
  const [visible, setVisible] = useState(false)
  const [bubbleRect, setBubbleRect] = useState(null)

  const step = TOUR_STEPS[stepIndex]

  const measureTarget = useCallback(() => {
    if (!step.target) { setRect(null); return }
    const el = document.getElementById(step.target)
    if (!el) { setRect(null); return }
    const r = el.getBoundingClientRect()
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height, bottom: r.bottom, right: r.right })
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [step])

  useEffect(() => {
    if (step.openModal) onOpenCoverLetter?.()
    if (step.switchTab) onSwitchTab?.(step.switchTab)
    const t = setTimeout(() => { measureTarget(); setVisible(true) }, step.openModal ? 400 : 80)
    return () => clearTimeout(t)
  }, [stepIndex])

  useEffect(() => {
    window.addEventListener('resize', measureTarget)
    return () => window.removeEventListener('resize', measureTarget)
  }, [measureTarget])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') finish() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  function handleGoTo(index) {
    if (index === stepIndex) return
    const target = TOUR_STEPS[index]
    if (target.openModal) onOpenCoverLetter?.()
    if (target.closeModal) onCloseCoverLetter?.()
    setVisible(false)
    setTimeout(() => { setStepIndex(index); setVisible(true) }, 150)
  }

  function handleNext() {
    const cur = TOUR_STEPS[stepIndex]
    if (cur.closeModal) onCloseCoverLetter?.()
    if (stepIndex < TOUR_STEPS.length - 1) {
      setVisible(false)
      setTimeout(() => { setStepIndex(s => s + 1); setVisible(true) }, 150)
    } else {
      finish()
    }
  }

  function handlePrev() {
    const cur = TOUR_STEPS[stepIndex]
    if (cur.closeModal) onCloseCoverLetter?.()
    if (stepIndex > 0) {
      setVisible(false)
      setTimeout(() => { setStepIndex(s => s - 1); setVisible(true) }, 150)
    }
  }

  function finish() {
    localStorage.setItem(STORAGE_KEY, 'true')
    onCloseCoverLetter?.()
    setVisible(false)
    setTimeout(onDone, 200)
  }

  return (
    <div className={`${styles.tourRoot} ${visible ? styles.tourVisible : ''}`}>
      <Spotlight rect={rect} />
      <Bubble
        step={step}
        rect={rect}
        stepIndex={stepIndex}
        totalSteps={TOUR_STEPS.length}
        onNext={handleNext}
        onPrev={handlePrev}
        onSkip={finish}
        onGoTo={handleGoTo}
        onBubbleRect={setBubbleRect}
        demoComponent={step.demoComponent}
      />
      {/* Only show floating demo preview on desktop */}
      {step.demoComponent && bubbleRect && window.innerWidth > 768 && (
        <DemoPreview component={step.demoComponent} bubbleRect={bubbleRect} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useTour() {
  const [showTour, setShowTour] = useState(false)
  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setShowTour(true)
  }, [])
  return {
    showTour,
    startTour: () => { localStorage.removeItem(STORAGE_KEY); setShowTour(true) },
    endTour: () => setShowTour(false),
  }
}