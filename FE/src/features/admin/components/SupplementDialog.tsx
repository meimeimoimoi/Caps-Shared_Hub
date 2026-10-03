import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { SUPPLEMENT_DIALOG } from '../constants'
import type { AiFlag, Criterion } from '../types'

interface SupplementItem {
  key: string
  label: string
  defaultText: string
  defaultChecked: boolean
}

interface SupplementDialogProps {
  criteria: Criterion[]
  scores: Record<string, number>
  evidence: Record<string, string>
  flags: AiFlag[]
  onCancel: () => void
  /** `message` đã gộp lời nhắn + các mục được chọn, sẵn để gửi email */
  onConfirm: (message: string) => void
}

/* Gợi ý các mục cần bổ sung: tài liệu có cờ AI + tiêu chí chưa chấm hoặc chấm thấp (Mức 1–2).
 * Mục có cờ AI hoặc đã chấm thấp được chọn sẵn, nội dung lấy từ gợi ý AI / căn cứ đã ghi. */
function suggestItems({
  criteria,
  scores,
  evidence,
  flags,
}: Omit<SupplementDialogProps, 'onCancel' | 'onConfirm'>): SupplementItem[] {
  const lowScore = (id: string) => !!scores[id] && scores[id] <= 2
  return [
    ...criteria
      .filter((c) => !scores[c.id] || lowScore(c.id))
      .map((c) => ({
        key: c.id,
        label: `${c.id} · ${c.name}`,
        defaultText: evidence[c.id]?.trim() ?? '',
        defaultChecked: lowScore(c.id),
      })),
    ...flags.map((f) => ({
      key: f.document,
      label: `${f.document} · ${f.documentName}`,
      defaultText: f.request,
      defaultChecked: true,
    })),
  ].sort((a, b) => a.key.localeCompare(b.key, 'vi', { numeric: true }))
}

export function SupplementDialog(props: SupplementDialogProps) {
  const { onCancel, onConfirm } = props
  const [items] = useState(() => suggestItems(props))
  const [checked, setChecked] = useState(
    () => new Set(items.filter((i) => i.defaultChecked).map((i) => i.key))
  )
  const [texts, setTexts] = useState(() =>
    Object.fromEntries(items.map((i) => [i.key, i.defaultText]))
  )
  const [message, setMessage] = useState(SUPPLEMENT_DIALOG.defaultMessage)

  const toggle = (key: string) =>
    setChecked((s) => {
      const next = new Set(s)
      if (!next.delete(key)) next.add(key)
      return next
    })

  const submit = () => {
    const lines = items
      .filter((i) => checked.has(i.key))
      .map(
        (i) =>
          `- ${i.label}${texts[i.key]?.trim() ? `: ${texts[i.key].trim()}` : ''}`
      )
    onConfirm([message.trim(), ...lines].filter(Boolean).join('\n'))
  }

  return (
    <Modal
      title={SUPPLEMENT_DIALOG.title}
      description={SUPPLEMENT_DIALOG.notice}
      onClose={onCancel}
      onSubmit={submit}
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-press btn-secondary"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={checked.size === 0}
            className="btn btn-press btn-primary"
          >
            {SUPPLEMENT_DIALOG.confirm}
          </button>
        </>
      }
    >
      <fieldset className="mt-4">
        <legend className="text-sm font-semibold">
          {SUPPLEMENT_DIALOG.itemsLabel}
        </legend>
        {items.length === 0 && (
          <p className="text-fg-muted mt-2 text-sm">
            Không có mục nào được gợi ý.
          </p>
        )}
        <ul className="mt-2 space-y-3">
          {items.map((i) => (
            <li key={i.key}>
              <label className="text-fg-strong flex items-center gap-2 font-semibold">
                <input
                  type="checkbox"
                  checked={checked.has(i.key)}
                  onChange={() => toggle(i.key)}
                  className="accent-ink size-4"
                />
                {i.label}
              </label>
              {checked.has(i.key) && (
                <textarea
                  rows={2}
                  aria-label={`Nội dung cần bổ sung cho ${i.label}`}
                  value={texts[i.key]}
                  onChange={(e) =>
                    setTexts((t) => ({ ...t, [i.key]: e.target.value }))
                  }
                  placeholder="Nêu rõ nội dung cần bổ sung"
                  className="bg-sunken rounded-surface placeholder:text-fg-muted mt-2 block w-full resize-y border border-transparent px-3 py-2 text-sm"
                />
              )}
            </li>
          ))}
        </ul>
        {checked.size === 0 && items.length > 0 && (
          <p className="text-warning mt-2 text-sm">Chọn ít nhất 1 mục.</p>
        )}
      </fieldset>
      <label className="mt-5 flex flex-col gap-2 text-sm font-semibold">
        {SUPPLEMENT_DIALOG.messageLabel}
        <textarea
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="border-border-control rounded-control shadow-control bg-paper resize-y border px-3 py-2 text-base font-normal"
        />
      </label>
    </Modal>
  )
}
