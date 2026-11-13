/**
 * Receipt & Invoice Text Extraction Engine
 * Works completely offline in the browser with 0 API tokens and 0 latency.
 */

export interface ParsedReceiptResult {
  amount: string
  merchant: string
  date: string // YYYY-MM-DD
  confidence: number
  rawText: string
}

const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  january: '01', february: '02', march: '03', april: '04', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12'
}

export function parseReceiptText(text: string): ParsedReceiptResult {
  if (!text || typeof text !== 'string') {
    return {
      amount: '',
      merchant: '',
      date: new Date().toISOString().split('T')[0],
      confidence: 0,
      rawText: text || '',
    }
  }

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0)
  let amount = ''
  let merchant = ''
  let date = new Date().toISOString().split('T')[0]
  let confidence = 0

  // 1. EXTRACT TOTAL AMOUNT
  // Look for lines containing "Total", "Grand Total", "Net Amount", "Amount Paid", "Subtotal", "Bill Amount", "INR", "Rs"
  const totalKeywords = [
    /(?:grand\s*total|net\s*amount|total\s*payable|amount\s*paid|bill\s*amount|total\s*due|final\s*total)[:\s]*(?:rs\.?|inr|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /(?:total|subtotal|amount|due)[:\s]*(?:rs\.?|inr|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
  ]

  // Priority search: bottom-up for total amount
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]
    for (const pat of totalKeywords) {
      const match = line.match(pat)
      if (match && match[1]) {
        const val = parseFloat(match[1].replace(/,/g, ''))
        if (!isNaN(val) && val > 0 && val < 5000000) {
          amount = val.toFixed(2)
          confidence += 45
          break
        }
      }
    }
    if (amount) break
  }

  // Fallback: search anywhere in text for numbers near "Total"
  if (!amount) {
    const fallbackMatch = text.match(/(?:total|net\s*amt|amount)[^\d\n]*?([0-9,]+(?:\.[0-9]{1,2})?)/i)
    if (fallbackMatch && fallbackMatch[1]) {
      const val = parseFloat(fallbackMatch[1].replace(/,/g, ''))
      if (!isNaN(val) && val > 0) {
        amount = val.toFixed(2)
        confidence += 30
      }
    }
  }

  // 2. EXTRACT DATE
  // Look for DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = text.match(/\b([0-3]?[0-9])[-/]([0-1]?[0-9])[-/](20\d{2}|\d{2})\b/)
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0')
    const month = dmyMatch[2].padStart(2, '0')
    let year = dmyMatch[3]
    if (year.length === 2) year = `20${year}`
    date = `${year}-${month}-${day}`
    confidence += 25
  } else {
    // DD-MMM-YYYY or DD MMM YYYY (e.g. 12 Nov 2026)
    const textDateMatch = text.match(/\b([0-3]?[0-9])\s*(?:st|nd|rd|th)?[- ]*([a-zA-Z]{3,9})[- ]*(20\d{2}|\d{2})?\b/i)
    if (textDateMatch) {
      const day = textDateMatch[1].padStart(2, '0')
      const monStr = textDateMatch[2].toLowerCase()
      const month = MONTH_MAP[monStr]
      let year = textDateMatch[3] || String(new Date().getFullYear())
      if (year.length === 2) year = `20${year}`
      if (month) {
        date = `${year}-${month}-${day}`
        confidence += 25
      }
    }
  }

  // 3. EXTRACT MERCHANT / STORE NAME
  // Merchant names are usually in the first 1-4 lines of a receipt
  const ignoredPatterns = [
    /tax\s*invoice/i,
    /cash\s*memo/i,
    /receipt/i,
    /invoice/i,
    /bill\s*to/i,
    /welcome/i,
    /gstin/i,
    /gst\s*no/i,
    /tel|phone|ph|mobile|email|date|time/i,
    /^[0-9\W]+$/,
    /^http/i,
    /order\s*no/i,
  ]

  for (let i = 0; i < Math.min(lines.length, 6); i++) {
    const candidate = lines[i]
    if (candidate.length < 3 || candidate.length > 40) continue
    const isIgnored = ignoredPatterns.some(p => p.test(candidate))
    if (!isIgnored) {
      merchant = cleanMerchant(candidate)
      confidence += 30
      break
    }
  }

  if (!merchant) {
    merchant = 'Store / Receipt'
  }

  return {
    amount,
    merchant,
    date,
    confidence: Math.min(confidence, 100),
    rawText: text,
  }
}

function cleanMerchant(raw: string): string {
  return raw
    .replace(/[._-]+/g, ' ')
    .replace(/\b(ltd|pvt|llp|inc|corp|services|india|app)\b/gi, '')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}
