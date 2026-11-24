export const fieldText = (v: unknown) =>
  typeof v === 'string' ? v : JSON.stringify(v, null, 2)

export type DiffLine = { kind: ' ' | '-' | '+'; text: string }

/**
 * Line diff of two texts, like a code review: kept lines, removed lines (-) then added lines (+).
 * ponytail: plain LCS, O(lines²); fine for draft fields, switch to a Myers diff if fields reach thousands of lines
 */
export function lineDiff(before: string, after: string): DiffLine[] {
  const a = before === '' ? [] : before.split('\n')
  const b = after === '' ? [] : after.split('\n')
  // lcs[i][j]: longest common run of a[i..] and b[j..]
  const lcs = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0)
  )
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      lcs[i][j] =
        a[i] === b[j]
          ? lcs[i + 1][j + 1] + 1
          : Math.max(lcs[i + 1][j], lcs[i][j + 1])
  const out: DiffLine[] = []
  let i = 0
  let j = 0
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      out.push({ kind: ' ', text: a[i++] })
      j++
    } else if (j >= b.length || (i < a.length && lcs[i + 1][j] >= lcs[i][j + 1]))
      out.push({ kind: '-', text: a[i++] })
    else out.push({ kind: '+', text: b[j++] })
  }
  return out
}
