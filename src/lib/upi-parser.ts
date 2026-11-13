/**
 * Robust, client-side parser for Indian Bank SMS and UPI transaction messages
 * Works offline with 0 API tokens and 0 latency.
 * Supports: HDFC, SBI, ICICI, Axis, Kotak, PNB, Canara, GPay, PhonePe, Paytm, CRED, etc.
 */

export interface ParsedUPIResult {
  amount: string
  description: string
  date: string // YYYY-MM-DD
  paymentMethod: 'upi'
  reference?: string
  confidence: number
}

const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  january: '01', february: '02', march: '03', april: '04', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12'
}

export function parseUPIText(text: string): ParsedUPIResult | null {
  if (!text || typeof text !== 'string') return null
  const cleaned = text.trim()
  if (cleaned.length < 5) return null

  let amount = ''
  let description = ''
  let date = new Date().toISOString().split('T')[0]
  let reference = ''
  let confidence = 0

  // 1. EXTRACT AMOUNT
  // Patterns like: "Rs. 450.00", "Rs 450", "INR 1,250.50", "₹ 500", "debited by 350.00"
  const amountPatterns = [
    /(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /(?:debited|spent|paid)\s*(?:for|by|of)?\s*(?:rs\.?|inr|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:rs\.?|inr|₹)/i,
  ]

  for (const pat of amountPatterns) {
    const match = cleaned.match(pat)
    if (match && match[1]) {
      const numStr = match[1].replace(/,/g, '')
      const val = parseFloat(numStr)
      if (!isNaN(val) && val > 0 && val < 10000000) {
        amount = val.toFixed(2)
        confidence += 40
        break
      }
    }
  }

  // 2. EXTRACT DATE
  // Pattern A: "12-11-2026", "12/11/26", "12-11-26"
  const dmyMatch = cleaned.match(/\b([0-3]?[0-9])[-/]([0-1]?[0-9])[-/](20\d{2}|\d{2})\b/)
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0')
    const month = dmyMatch[2].padStart(2, '0')
    let year = dmyMatch[3]
    if (year.length === 2) year = `20${year}`
    date = `${year}-${month}-${day}`
    confidence += 20
  } else {
    // Pattern B: "12 Nov 2026", "12-Nov-26", "12Nov26", "12th November"
    const textDateMatch = cleaned.match(/\b([0-3]?[0-9])\s*(?:st|nd|rd|th)?[- ]*([a-zA-Z]{3,9})[- ]*(20\d{2}|\d{2})?\b/i)
    if (textDateMatch) {
      const day = textDateMatch[1].padStart(2, '0')
      const monStr = textDateMatch[2].toLowerCase()
      const month = MONTH_MAP[monStr]
      let year = textDateMatch[3] || String(new Date().getFullYear())
      if (year.length === 2) year = `20${year}`
      if (month) {
        date = `${year}-${month}-${day}`
        confidence += 20
      }
    }
  }

  // 3. EXTRACT REFERENCE / UTR / TXN ID
  const refMatch = cleaned.match(/(?:upi\s*ref(?:\s*no\.?)?|utr(?:\s*no\.?)?|ref(?:\s*no\.?)?|txn\s*id)[:\s]*([0-9a-zA-Z]{8,22})/i)
  if (refMatch && refMatch[1]) {
    reference = refMatch[1]
  }

  // 4. EXTRACT MERCHANT / PAYEE DESCRIPTION
  // Case A: "UPI/SWIGGY/swiggy@icici" or "UPI/4321/Zomato"
  const upiInfoMatch = cleaned.match(/UPI\/([^\/]+)\/([^\/\s]+)?/i)
  if (upiInfoMatch) {
    const rawName = upiInfoMatch[1].replace(/^[0-9]+$/, '') || upiInfoMatch[2] || ''
    if (rawName && !rawName.toLowerCase().includes('ref')) {
      description = cleanMerchantName(rawName)
    }
  }

  // Case B: "to <MERCHANT> on", "transfer to <MERCHANT>", "paid to <MERCHANT>"
  if (!description) {
    const toMatch = cleaned.match(/(?:to|transfer to|paid to|towards)\s+([a-zA-Z0-9\s&'.-]{2,30}?)(?:\s+(?:on|via|using|ref|upi|avl|bal|from|a\/c|\.|\/|\n)|$)/i)
    if (toMatch && toMatch[1]) {
      const cand = cleanMerchantName(toMatch[1])
      if (cand && !['a/c', 'account', 'bank', 'upi', 'your', 'rs'].includes(cand.toLowerCase())) {
        description = cand
      }
    }
  }

  // Case C: "Payment of ₹... to <MERCHANT>"
  if (!description) {
    const payOfMatch = cleaned.match(/(?:payment\s+of[^\n]+to)\s+([a-zA-Z0-9\s&'.-]{2,30}?)(?:\s+(?:successful|completed|on|via|\.)|$)/i)
    if (payOfMatch && payOfMatch[1]) {
      description = cleanMerchantName(payOfMatch[1])
    }
  }

  // Fallback description
  if (description) {
    confidence += 30
  } else {
    description = 'UPI Payment'
  }

  if (!amount) return null

  return {
    amount,
    description,
    date,
    paymentMethod: 'upi',
    reference: reference || undefined,
    confidence: Math.min(confidence, 100),
  }
}

function cleanMerchantName(raw: string): string {
  let name = raw
    .replace(/[._-]+/g, ' ')
    .replace(/\b(ltd|pvt|llp|inc|corp|services|india|payments?|app)\b/gi, '')
    .trim()

  // Format capitalized words
  name = name
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')

  return name || raw.trim()
}
