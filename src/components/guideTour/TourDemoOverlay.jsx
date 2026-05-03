import styles from './TourDemoOverlay.module.css'

// ---------------------------------------------------------------------------
// Dummy data
// ---------------------------------------------------------------------------
const DUMMY_SCORE = {
  score: 82,
  summary: 'Strong match — your Python & AI background aligns well with the role.',
  strengths: [
    'Python backend experience directly matches requirements',
    'LLM integration and Gemini API usage highlighted',
    'Cloud infrastructure (AWS, Docker) clearly demonstrated',
  ],
  gaps: [
    'No mention of TypeScript (listed in JD)',
    'Team leadership experience could be stronger',
  ],
  keywords: ['TypeScript', 'CI/CD', 'Kubernetes', 'Agile', 'REST API'],
}

const DUMMY_RESUME_SECTIONS = [
  { title: 'PROFESSIONAL SUMMARY', content: 'Software Engineering Graduate with Python backend and AI integration experience...' },
  { title: 'TECHNICAL SKILLS', content: '• Python (Flask, Quart), JavaScript (React, Next.js)\n• LLM Integration (Gemini, GPT), Prompt Engineering\n• AWS (EC2), Azure, Docker, Vercel' },
  { title: 'PROFESSIONAL EXPERIENCE', content: 'DummyExample Ltd. | Software Developer | Auckland, NZ' },
  { title: 'EDUCATION', content: 'Master of Information Technology | Auckland study college | 2099–2100' },
]

const DUMMY_CHAT = [
  { role: 'assistant', text: 'Here is your tailored resume based on the job description...' },
  { role: 'user', text: 'Can you make the summary more concise?' },
  { role: 'assistant', text: 'Done! I\'ve shortened the summary to 2 sentences highlighting your core strengths.' },
]

// ---------------------------------------------------------------------------
// Score ring component
// ---------------------------------------------------------------------------
function ScoreRing({ score }) {
  const size = 64
  const stroke = 5
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 80 ? '#d4ff6e' : score >= 60 ? '#4a9eff' : '#f0a500'

  return (
    <div className={styles.ringWrap}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className={styles.ringLabel}>
        <span style={{ fontSize: 16, fontWeight: 700, color }}>{score}</span>
        <span style={{ fontSize: 9, color: 'var(--text-3)' }}>%</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ATS Score preview
// ---------------------------------------------------------------------------
export function ATSScorePreview() {
  return (
    <div className={styles.preview} id="tour-score-preview">
      <div className={styles.previewHeader}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.1"/>
          <path d="M3.5 6.5l1.5 1.5L8.5 4.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        ATS Match Score
        <span className={styles.dummyBadge}>preview</span>
      </div>
      <div className={styles.scoreRow}>
        <ScoreRing score={DUMMY_SCORE.score} />
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#d4ff6e', marginBottom: 3 }}>Strong match</div>
          <div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.5 }}>{DUMMY_SCORE.summary}</div>
        </div>
      </div>
      <div className={styles.sectionRow}>
        <div className={styles.sectionTitle}><span className={styles.dot} style={{ background: '#d4ff6e' }} />Strengths</div>
        {DUMMY_SCORE.strengths.map((s, i) => <div key={i} className={styles.strengthItem}>{s}</div>)}
      </div>
      <div className={styles.sectionRow}>
        <div className={styles.sectionTitle}><span className={styles.dot} style={{ background: '#f0a500' }} />Gaps</div>
        {DUMMY_SCORE.gaps.map((g, i) => <div key={i} className={styles.gapItem}>{g}</div>)}
      </div>
      <div className={styles.sectionRow}>
        <div className={styles.sectionTitle}><span className={styles.dot} style={{ background: '#4a9eff' }} />Missing keywords</div>
        <div className={styles.keywords}>
          {DUMMY_SCORE.keywords.map((k, i) => <span key={i} className={styles.keyword}>{k}</span>)}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section editor preview
// ---------------------------------------------------------------------------
export function SectionEditorPreview() {
  return (
    <div className={styles.preview} id="tour-sections-preview">
      <div className={styles.previewHeader}>
        ✏️ Edit sections
        <span className={styles.dummyBadge}>preview</span>
      </div>
      <div className={styles.sectionCards}>
        {DUMMY_RESUME_SECTIONS.map((s, i) => (
          <div key={i} className={`${styles.sectionCard} ${i === 1 ? styles.sectionCardEditing : ''}`}>
            <div className={styles.sectionCardHead}>
              <span className={styles.sectionCardTitle}>{s.title}</span>
              {i === 1
                ? <span className={styles.editingBadge}>✏️ Editing</span>
                : <span className={styles.editBtnDummy}>Edit</span>
              }
            </div>
            {i === 1 && (
              <>
                <div className={styles.dummyTextarea}>{s.content}</div>
                <div className={styles.dummyAiRow}>
                  <div className={styles.dummyInput}>e.g. "add TypeScript and CI/CD keywords"</div>
                  <div className={styles.dummyAskBtn}>Ask AI</div>
                </div>
              </>
            )}
            {i !== 1 && (
              <div className={styles.sectionCardBody}>
                {s.content.split('\n').slice(0, 2).map((l, j) => (
                  <div key={j} className={styles.sectionLine}>{l.trim()}</div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Chat preview
// ---------------------------------------------------------------------------
export function ChatPreview() {
  return (
    <div className={styles.preview} id="tour-chat-preview">
      <div className={styles.previewHeader}>
        💬 Chat to refine
        <span className={styles.dummyBadge}>preview</span>
      </div>
      <div className={styles.chatMessages}>
        {DUMMY_CHAT.map((m, i) => (
          <div key={i} className={m.role === 'user' ? styles.chatUser : styles.chatAI}>
            {m.role === 'user' && <div className={styles.youLabel}>YOU</div>}
            {m.role === 'assistant' && <span className={styles.aiTag}>AI</span>}
            <div className={m.role === 'user' ? styles.chatBubbleUser : styles.chatBubbleAI}>
              {m.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Template picker preview
// ---------------------------------------------------------------------------
export function TemplatePreview() {
  return (
    <div className={styles.preview} id="tour-template-preview">
      <div className={styles.previewHeader}>
        📥 Download templates
        <span className={styles.dummyBadge}>preview</span>
      </div>
      <div className={styles.templateRow}>
        {[
          { name: 'Minimal', color: '#555', selected: true },
          { name: 'Modern', color: '#1B4FBB', selected: false },
          { name: 'Traditional', color: '#111', selected: false },
        ].map((t, i) => (
          <div key={i} className={`${styles.templateCard} ${t.selected ? styles.templateSelected : ''}`}>
            <div className={styles.templateDoc}>
              <div className={styles.templateName} style={{ color: t.color, borderBottom: `1.5px solid ${t.color}`, textAlign: t.name === 'Traditional' ? 'center' : 'left' }}>
                Jane Doe
              </div>
              <div className={styles.templateSection} style={{
                color: t.color,
                borderLeft: t.name === 'Modern' ? `2px solid ${t.color}` : 'none',
                textAlign: t.name === 'Traditional' ? 'center' : 'left',
              }}>
                EXPERIENCE
              </div>
              {[70, 90, 55].map((w, j) => (
                <div key={j} className={styles.templateLine} style={{ width: `${w}%` }} />
              ))}
            </div>
            <div className={styles.templateLabel}>{t.name}</div>
            {t.selected && <div className={styles.templateCheck}>✓</div>}
          </div>
        ))}
      </div>
    </div>
  )
}
