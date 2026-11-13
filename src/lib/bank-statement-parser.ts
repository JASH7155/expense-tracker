/**
 * Bank Statement Parser (Client-Side, Zero API tokens, Zero latency)
 * Parses CSV and tabular statement exports from Indian banks:
 * HDFC, SBI, ICICI, Axis, Kotak, PNB, Canara, Paytm Bank, and generic CSVs.
 */

export interface ParsedStatementRow {
  id: string
  date: string // YYYY-MM-DD
  rawDescription: string
  cleanDescription: string
  amount: number
  paymentMethod: 'upi' | 'card' | 'netbanking' | 'other'
  suggestedCategoryId?: string
  selected: boolean
}

const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  january: '01', february: '02', march: '03', april: '04', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12'
}

/**
 * Parses raw CSV lines handling quoted fields with commas
 */
function parseCSVLine(line: string, delimiter = ','): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim().replace(/^["']|["']$/g, ''))
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim().replace(/^["']|["']$/g, ''))
  return result
}

/**
 * Cleans bank narration into a readable merchant name
 */
export function cleanBankNarration(narration: string): { cleanName: string; method: 'upi' | 'card' | 'netbanking' | 'other' } {
  let text = narration.trim()
  let method: 'upi' | 'card' | 'netbanking' | 'other' = 'other'

  if (/upi/i.test(text)) {
    method = 'upi'
  } else if (/pos|ecom|card|visa|mastercard|rupay/i.test(text)) {
    method = 'card'
  } else if (/neft|rtgs|imps|netbanking|transfer/i.test(text)) {
    method = 'netbanking'
  }

  // Handle UPI format: UPI/123456/MERCHANT/merchant@vpa/Note
  const upiMatch = text.match(/UPI\/(?:[^\/]*\/)?([^\/]+)(?:\/([^\/]+))?/i)
  if (upiMatch) {
    let merchant = upiMatch[1]
    if (/^[0-9]+$/.test(merchant) && upiMatch[2]) {
      merchant = upiMatch[2]
    }
    merchant = merchant.replace(/@.*$/, '').replace(/[._-]+/g, ' ')
    return { cleanName: formatMerchant(merchant), method: 'upi' }
  }

  // Handle POS / ECOM format: POS 4321 MERCHANT MUMBAI IN
  const posMatch = text.match(/(?:POS|ECOM|IPS)\s+(?:[0-9*]+\s+)?([A-Za-z0-9\s&'.-]{2,30}?)(?:\s+[A-Za-z]+(?:\s+IN)?|\s*$)/i)
  if (posMatch && posMatch[1]) {
    return { cleanName: formatMerchant(posMatch[1]), method: 'card' }
  }

  // Clean generic narration
  let clean = text
    .replace(/(?:neft|rtgs|imps|txn|ref|utr|chq|no|a\/c|acct|transfer|to|from)[-:\s]+[0-9a-zA-Z]+/gi, '')
    .replace(/[._\-\/]+/g, ' ')
    .replace(/\b(ltd|pvt|llp|inc|corp|services|india|payments?|app)\b/gi, '')
    .trim()

  return { cleanName: formatMerchant(clean || text), method }
}

function formatMerchant(raw: string): string {
  const words = raw
    .split(/\s+/)
    .filter(w => w.length > 0 && !/^[0-9]+$/.test(w))
    .slice(0, 4)

  if (words.length === 0) return raw.slice(0, 30)

  return words
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Parses date string in common Indian formats to YYYY-MM-DD
 */
export function normalizeDate(dateStr: string): string {
  const trimmed = dateStr.trim()

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = trimmed.match(/\b([0-3]?[0-9])[-/]([0-1]?[0-9])[-/](20\d{2}|\d{2})\b/)
  if (dmy) {
    const day = dmy[1].padStart(2, '0')
    const month = dmy[2].padStart(2, '0')
    let year = dmy[3]
    if (year.length === 2) year = `20${year}`
    return `${year}-${month}-${day}`
  }

  // DD-MMM-YYYY (e.g. 12-Nov-2026 or 12 Nov 2026)
  const dMmmY = trimmed.match(/\b([0-3]?[0-9])[- ]*([a-zA-Z]{3,9})[- ]*(20\d{2}|\d{2})?\b/)
  if (dMmmY) {
    const day = dMmmY[1].padStart(2, '0')
    const mon = MONTH_MAP[dMmmY[2].toLowerCase()] || '01'
    let year = dMmmY[3] || String(new Date().getFullYear())
    if (year.length === 2) year = `20${year}`
    return `${year}-${mon}-${day}`
  }

  // Fallback to today
  return new Date().toISOString().split('T')[0]
}

/**
 * Parses entire bank statement CSV or tab-separated text
 */
export function parseBankStatement(content: string): ParsedStatementRow[] {
  if (!content || !content.trim()) return []

  const rawLines = content.split(/\r?\n/).filter(line => line.trim().length > 0)
  if (rawLines.length < 2) return []

  // Detect delimiter: comma, tab, or semicolon
  const firstLines = rawLines.slice(0, 10).join('\n')
  const delimiter = firstLines.includes('\t') ? '\t' : firstLines.includes(';') ? ';' : ','

  // Find header row index
  let headerIndex = -1
  let dateCol = -1
  let descCol = -1
  let debitCol = -1
  let creditCol = -1
  let amountCol = -1
  let typeCol = -1

  for (let i = 0; i < Math.min(rawLines.length, 25); i++) {
    const cols = parseCSVLine(rawLines[i], delimiter).map(c => c.toLowerCase().trim())
    
    const dIdx = cols.findIndex(c => /date|txn\s*date|value\s*date/i.test(c))
    const nIdx = cols.findIndex(c => /narration|description|particulars|details|remarks/i.test(c))
    const wIdx = cols.findIndex(c => /debit|withdrawal|dr|dr\s*amount/i.test(c))
    const cIdx = cols.findIndex(c => /credit|deposit|cr|cr\s*amount/i.test(c))
    const aIdx = cols.findIndex(c => /amount|transaction\s*amount/i.test(c))
    const tIdx = cols.findIndex(c => /type|cr\/dr|dr\/cr/i.test(c))

    if (dIdx !== -1 && (nIdx !== -1 || wIdx !== -1 || aIdx !== -1)) {
      headerIndex = i
      dateCol = dIdx
      descCol = nIdx !== -1 ? nIdx : 1
      debitCol = wIdx
      creditCol = cIdx
      amountCol = aIdx
      typeCol = tIdx
      break
    }
  }

  // Fallback if no explicit header row matched (assume cols: 0=Date, 1=Narration, 2=Debit)
  if (headerIndex === -1) {
    headerIndex = 0
    dateCol = 0
    descCol = 1
    debitCol = 2
  }

  const results: ParsedStatementRow[] = []

  for (let i = headerIndex + 1; i < rawLines.length; i++) {
    const cols = parseCSVLine(rawLines[i], delimiter)
    if (cols.length <= 1) continue

    const dateRaw = cols[dateCol] || ''
    const descRaw = cols[descCol] || ''

    if (!dateRaw || !descRaw) continue

    // Determine debit amount
    let debitAmount = 0

    if (debitCol !== -1 && cols[debitCol]) {
      const val = parseFloat(cols[debitCol].replace(/[^0-9.]/g, ''))
      if (!isNaN(val) && val > 0) debitAmount = val
    } else if (amountCol !== -1 && cols[amountCol]) {
      const val = parseFloat(cols[amountCol].replace(/[^0-9.]/g, ''))
      const typeVal = typeCol !== -1 ? (cols[typeCol] || '').toLowerCase() : ''
      const isDebit = typeVal.includes('dr') || typeVal.includes('debit') || cols[amountCol].includes('-') || !typeVal

      // If creditCol exists and has value, skip credits
      if (creditCol !== -1 && cols[creditCol] && parseFloat(cols[creditCol].replace(/[^0-9.]/g, '')) > 0) {
        continue
      }

      if (!isNaN(val) && val > 0 && isDebit) {
        debitAmount = val
      }
    }

    // Skip zero or credit transactions
    if (debitAmount <= 0) continue

    const date = normalizeDate(dateRaw)
    const { cleanName, method } = cleanBankNarration(descRaw)

    results.push({
      id: `stmt-${i}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      date,
      rawDescription: descRaw,
      cleanDescription: cleanName,
      amount: debitAmount,
      paymentMethod: method,
      selected: true,
    })
  }

  return results
}
