/** Tên miền email phổ biến ở Việt Nam; dùng để bắt lỗi gõ như gmial.com, gmail.con, yahoo.com.vm */
const COMMON_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'yahoo.com.vn',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'icloud.com',
  'msn.com',
  'proton.me',
  'protonmail.com',
  'fpt.edu.vn',
  'fpt.com',
  'fpt.com.vn',
  'viettel.com.vn',
  'vnpt.vn',
] as const

function distance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]!
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const current = row[j]!
      row[j] = Math.min(
        row[j]! + 1,
        row[j - 1]! + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1)
      )
      prev = current
    }
  }
  return row[b.length]!
}

/**
 * Gợi ý email đúng khi tên miền gần giống một tên miền phổ biến (vd. an@gmial.com → an@gmail.com).
 * Trả null nếu email đã đúng, chưa đủ để đoán, hoặc không gần tên miền nào.
 */
export function suggestEmail(email: string): string | null {
  const value = email.trim()
  const at = value.lastIndexOf('@')
  if (at <= 0) return null
  const local = value.slice(0, at)
  const domain = value.slice(at + 1).toLowerCase()
  if (domain.length < 4 || !domain.includes('.')) return null
  if ((COMMON_DOMAINS as readonly string[]).includes(domain)) return null

  let best: string | null = null
  let bestDistance = Infinity
  for (const candidate of COMMON_DOMAINS) {
    const d = distance(domain, candidate)
    if (d < bestDistance) {
      best = candidate
      bestDistance = d
    }
  }
  // Tên miền ngắn chỉ cho lệch 1 ký tự để không gợi ý bừa tên miền công ty thật
  const allowed = domain.length <= 8 ? 1 : 2
  return best && bestDistance > 0 && bestDistance <= allowed
    ? `${local}@${best}`
    : null
}
