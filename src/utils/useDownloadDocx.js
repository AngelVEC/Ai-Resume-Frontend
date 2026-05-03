import {
  Document, Packer, Paragraph, TextRun,
  AlignmentType, BorderStyle,
} from 'docx'
import { saveAs } from 'file-saver'

export const TEMPLATES = [
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Calibri, left-aligned, thin grey dividers',
    preview: { accent: '#555555', font: 'Calibri' },
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Arial, bold blue name & section headers',
    preview: { accent: '#1D4ED8', font: 'Arial' },
  },
  {
    id: 'traditional',
    name: 'Traditional',
    description: 'Times New Roman, centered header, formal',
    preview: { accent: '#1a1a1a', font: 'Times New Roman' },
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function parseInline(text, defaults = {}) {
  const runs = []
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|([^*]+))/g
  let m
  while ((m = regex.exec(text)) !== null) {
    if (m[2]) runs.push(new TextRun({ ...defaults, text: m[2], bold: true }))
    else if (m[3]) runs.push(new TextRun({ ...defaults, text: m[3], italics: true }))
    else if (m[4]) runs.push(new TextRun({ ...defaults, text: m[4] }))
  }
  return runs.length ? runs : [new TextRun({ ...defaults, text })]
}

// Detect a line as a section header:
// 1. Markdown ## / ### heading
// 2. **Bold only** line
// 3. ALL CAPS line (≥ 3 chars, not a bullet, not contact info with | separators)
function isSectionHeader(line, isFirstLine) {
  if (isFirstLine) return false
  const t = line.trim()
  if (!t || t.length < 3) return false
  if (t.startsWith('* ') || t.startsWith('- ') || t.startsWith('• ')) return false
  if (t.startsWith('## ') || t.startsWith('### ')) return true
  if (/^\*\*[^*]+\*\*$/.test(t)) return true
  // ALL CAPS: letters only (ignore digits/punctuation), no pipe separators (contact line)
  const letters = t.replace(/[^a-zA-Z]/g, '')
  if (letters.length >= 3 && letters === letters.toUpperCase() && !t.includes('|')) return true
  return false
}

function cleanSectionText(line) {
  return line.replace(/^#{2,3}\s/, '').replace(/\*\*/g, '').trim()
}

// Classify each line
function classifyLines(md) {
  const lines = md.split('\n')
  let firstNonEmpty = -1
  return lines.map((raw, i) => {
    const line = raw.trimEnd()
    const t = line.trim()
    if (!t) return { line, type: 'empty' }

    // Find first non-empty line → name
    if (firstNonEmpty === -1) {
      firstNonEmpty = i
      // Could start with "# " markdown heading
      if (line.startsWith('# ')) return { line: line.slice(2).trim(), type: 'name' }
      return { line, type: 'name' }
    }

    if (line.startsWith('* ') || line.startsWith('- ') || line.startsWith('• ')) {
      return { line: line.slice(2).trim(), type: 'bullet' }
    }

    if (line.trim() === '---' || line.trim() === '***') {
      return { line, type: 'rule' }
    }

    if (isSectionHeader(line, false)) {
      return { line: cleanSectionText(line), type: 'section' }
    }

    return { line, type: 'body' }
  })
}

// ---------------------------------------------------------------------------
// MINIMAL — Calibri, left-aligned, grey UPPERCASE section headers + underline
// ---------------------------------------------------------------------------
function parseMinimal(md) {
  const out = []
  const font = 'Calibri'

  for (const { line, type } of classifyLines(md)) {
    switch (type) {
      case 'empty':
        out.push(new Paragraph({ spacing: { after: 60 } }))
        break
      case 'name':
        out.push(new Paragraph({
          spacing: { before: 0, after: 80 },
          children: [new TextRun({ text: line, font, bold: true, size: 32, color: '111111' })],
        }))
        break
      case 'section':
        out.push(new Paragraph({
          spacing: { before: 200, after: 60 },
          border: { bottom: { color: 'AAAAAA', style: BorderStyle.SINGLE, size: 4, space: 4 } },
          children: [new TextRun({ text: line.toUpperCase(), font, bold: false, size: 18, color: '666666' })],
        }))
        break
      case 'bullet':
        out.push(new Paragraph({
          bullet: { level: 0 },
          children: parseInline(line, { font, size: 20, color: '222222' }),
          spacing: { after: 40 },
        }))
        break
      case 'rule':
        out.push(new Paragraph({
          border: { bottom: { color: 'DDDDDD', style: BorderStyle.SINGLE, size: 2, space: 2 } },
          spacing: { before: 40, after: 40 },
        }))
        break
      default:
        out.push(new Paragraph({
          children: parseInline(line, { font, size: 20, color: '222222' }),
          spacing: { after: 40 },
        }))
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// MODERN — Arial, blue 24pt name + thick blue rule, blue bold section headers
// with left border accent
// ---------------------------------------------------------------------------
function parseModern(md) {
  const out = []
  const font = 'Arial'
  const blue = '1B4FBB'

  for (const { line, type } of classifyLines(md)) {
    switch (type) {
      case 'empty':
        out.push(new Paragraph({ spacing: { after: 80 } }))
        break
      case 'name':
        // Large blue name
        out.push(new Paragraph({
          spacing: { before: 0, after: 40 },
          children: [new TextRun({ text: line, font, bold: true, size: 48, color: blue })],
        }))
        // Thick blue rule below name
        out.push(new Paragraph({
          border: { bottom: { color: blue, style: BorderStyle.SINGLE, size: 14, space: 4 } },
          spacing: { before: 0, after: 80 },
        }))
        break
      case 'section':
        out.push(new Paragraph({
          spacing: { before: 260, after: 80 },
          border: { left: { color: blue, style: BorderStyle.SINGLE, size: 20, space: 8 } },
          children: [new TextRun({ text: '  ' + line.toUpperCase(), font, bold: true, size: 22, color: blue })],
        }))
        break
      case 'bullet':
        out.push(new Paragraph({
          bullet: { level: 0 },
          children: parseInline(line, { font, size: 20 }),
          spacing: { after: 50 },
        }))
        break
      case 'rule':
        out.push(new Paragraph({
          border: { bottom: { color: 'C7D7F5', style: BorderStyle.SINGLE, size: 4, space: 2 } },
          spacing: { before: 40, after: 40 },
        }))
        break
      default:
        out.push(new Paragraph({
          children: parseInline(line, { font, size: 20 }),
          spacing: { after: 50 },
        }))
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// TRADITIONAL — Times New Roman, centered name, centered section headers
// with top+bottom borders
// ---------------------------------------------------------------------------
function parseTraditional(md) {
  const out = []
  const font = 'Times New Roman'

  for (const { line, type } of classifyLines(md)) {
    switch (type) {
      case 'empty':
        out.push(new Paragraph({ spacing: { after: 80 } }))
        break
      case 'name':
        out.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 60 },
          children: [new TextRun({ text: line, font, bold: true, size: 40 })],
        }))
        // Thin rule under name
        out.push(new Paragraph({
          border: { bottom: { color: '000000', style: BorderStyle.SINGLE, size: 4, space: 4 } },
          spacing: { before: 0, after: 80 },
        }))
        break
      case 'section':
        out.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 280, after: 80 },
          border: {
            top: { color: '000000', style: BorderStyle.SINGLE, size: 6, space: 4 },
            bottom: { color: '000000', style: BorderStyle.SINGLE, size: 6, space: 4 },
          },
          children: [new TextRun({ text: line, font, bold: true, size: 22, allCaps: true })],
        }))
        break
      case 'bullet':
        out.push(new Paragraph({
          bullet: { level: 0 },
          children: parseInline(line, { font, size: 22 }),
          spacing: { after: 60 },
        }))
        break
      case 'rule':
        out.push(new Paragraph({
          border: { bottom: { color: '000000', style: BorderStyle.DOUBLE, size: 4, space: 4 } },
          spacing: { before: 60, after: 60 },
        }))
        break
      default:
        out.push(new Paragraph({
          children: parseInline(line, { font, size: 22 }),
          spacing: { after: 60 },
        }))
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Build Document
// ---------------------------------------------------------------------------
function buildDoc(paragraphs, templateId) {
  const configs = {
    minimal:     { margin: { top: 720,  bottom: 720,  left: 900,  right: 900  }, font: 'Calibri',          size: 20 },
    modern:      { margin: { top: 480,  bottom: 720,  left: 720,  right: 720  }, font: 'Arial',             size: 20 },
    traditional: { margin: { top: 1080, bottom: 1080, left: 1260, right: 1260 }, font: 'Times New Roman',   size: 22 },
  }
  const c = configs[templateId] || configs.minimal

  return new Document({
    sections: [{ properties: { page: { margin: c.margin } }, children: paragraphs }],
    styles: {
      default: { document: { run: { font: c.font, size: c.size } } },
    },
  })
}

// ---------------------------------------------------------------------------
// Resume export — with template picker
// ---------------------------------------------------------------------------
export async function downloadAsDocx(markdownText, filename = 'resume.docx', templateId = 'minimal') {
  let paragraphs
  if (templateId === 'modern') paragraphs = parseModern(markdownText)
  else if (templateId === 'traditional') paragraphs = parseTraditional(markdownText)
  else paragraphs = parseMinimal(markdownText)

  const doc = buildDoc(paragraphs, templateId)
  const blob = await Packer.toBlob(doc)
  saveAs(blob, filename)
}

// ---------------------------------------------------------------------------
// Cover letter export — always minimal, no template picker
// ---------------------------------------------------------------------------
export async function downloadCoverLetterDocx(markdownText, filename = 'cover-letter.docx') {
  const paragraphs = parseMinimal(markdownText)
  const doc = buildDoc(paragraphs, 'minimal')
  const blob = await Packer.toBlob(doc)
  saveAs(blob, filename)
}