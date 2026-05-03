const SECTION_KEYWORDS = [
  'summary', 'professional summary', 'objective', 'profile',
  'skills', 'technical skills', 'core competencies', 'expertise',
  'experience', 'professional experience', 'work experience', 'employment',
  'projects', 'personal projects', 'key projects',
  'education', 'qualifications',
  'certifications', 'certificates', 'awards', 'licences',
  'interests', 'additional information', 'languages',
  'volunteer', 'references',
]

function isAllCaps(line) {
  const t = line.trim()
  if (t.length < 3) return false
  if (t.includes('|')) return false
  const letters = t.replace(/[^a-zA-Z]/g, '')
  return letters.length >= 3 && letters === letters.toUpperCase()
}

function isSectionLine(line) {
  const t = line.trim()
  if (!t) return false
  if (t.startsWith('## ') || t.startsWith('### ')) return true
  if (/^\*\*[^*]+\*\*$/.test(t)) return true
  if (isAllCaps(t)) {
    const lower = t.toLowerCase()
    return SECTION_KEYWORDS.some(k => lower.includes(k))
  }
  return false
}

function cleanHeader(line) {
  return line.trim().replace(/^#{2,3}\s/, '').replace(/\*\*/g, '').trim()
}

export function parseResumeSections(text) {
  const lines = text.split('\n')
  const sections = []
  let currentSection = null
  let headerLines = []

  for (const raw of lines) {
    if (isSectionLine(raw)) {
      if (currentSection) {
        currentSection.content = currentSection.lines.join('\n').trim()
        delete currentSection.lines
        sections.push(currentSection)
      }
      currentSection = {
        id: Math.random().toString(36).slice(2),
        title: cleanHeader(raw),
        rawTitle: raw.trim(),
        lines: [],
      }
    } else if (currentSection) {
      currentSection.lines.push(raw)
    } else {
      headerLines.push(raw)
    }
  }

  if (currentSection) {
    currentSection.content = currentSection.lines.join('\n').trim()
    delete currentSection.lines
    sections.push(currentSection)
  }

  return {
    header: headerLines.join('\n').trim(),
    sections,
  }
}

export function buildResumeText(header, sections) {
  const parts = []
  if (header) parts.push(header)
  for (const s of sections) {
    parts.push(s.rawTitle || s.title.toUpperCase())
    if (s.content) parts.push(s.content)
  }
  return parts.join('\n\n')
}
