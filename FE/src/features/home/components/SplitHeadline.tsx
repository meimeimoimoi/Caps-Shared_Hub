import { type CSSProperties } from 'react'

/** Render the animated words in React so locale changes never mutate owned markup. */
export function SplitHeadline({
  as: Tag,
  text,
  mode,
}: {
  as: 'h1' | 'h2'
  text: string
  mode: 'words' | 'chars'
}) {
  const tokens = text.split(/(<\/?em>)/)
  let emphasis = false
  const words: { text: string; emphasis: boolean }[] = []
  for (const token of tokens) {
    if (token === '<em>') emphasis = true
    else if (token === '</em>') emphasis = false
    else
      for (const word of token.split(/\s+/).filter(Boolean))
        words.push({ text: word, emphasis })
  }
  const total = words.reduce((count, word) => count + [...word.text].length, 0)
  let index = 0
  return (
    <Tag className="split" data-mode={mode}>
      <span className="sr-only">
        {words.map((word) => word.text).join(' ')}
      </span>
      <span aria-hidden="true">
        {words.map((word, wi) => (
          <span key={wi}>
            <span
              className={word.emphasis ? 'w em' : 'w'}
              style={
                mode === 'words'
                  ? ({ '--th': (wi / words.length) * 0.5 } as CSSProperties)
                  : undefined
              }
            >
              {mode === 'words'
                ? word.text
                : [...word.text].map((char, ci) => (
                    <span
                      className="c"
                      key={ci}
                      style={
                        {
                          '--th': (index++ / total) * 0.5,
                          '--jx': '20px',
                        } as CSSProperties
                      }
                    >
                      {char}
                    </span>
                  ))}
            </span>
            {wi < words.length - 1 ? ' ' : ''}
          </span>
        ))}
      </span>
    </Tag>
  )
}
