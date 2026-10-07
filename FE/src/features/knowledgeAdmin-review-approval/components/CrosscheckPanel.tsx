import { CROSSCHECK, type CrosscheckKey } from '../constants'

interface CrosscheckPanelProps {
  checked: CrosscheckKey[]
  onToggle: (key: CrosscheckKey) => void
}

/* Checklist "Đối chiếu với bản gốc": chốt chặn cuối trước khi vào RAG */
export function CrosscheckPanel({ checked, onToggle }: CrosscheckPanelProps) {
  return (
    <fieldset>
      <legend className="text-h2">Đối chiếu với bản gốc</legend>
      <p className="text-fg-muted mt-1 text-sm">
        Không duyệt khi chưa đối chiếu xong: đây là chốt chặn cuối trước khi vào
        RAG.
      </p>
      <div className="divide-border-subtle mt-3 divide-y">
        {(Object.keys(CROSSCHECK) as CrosscheckKey[]).map((k) => (
          <label key={k} className="flex cursor-pointer gap-3 py-2.5 text-sm">
            <input
              type="checkbox"
              checked={checked.includes(k)}
              onChange={() => onToggle(k)}
              className="accent-ink mt-1 size-4 shrink-0"
            />
            <span>
              <span className="text-fg-strong block font-semibold">
                {CROSSCHECK[k].label}
              </span>
              <span className="text-fg-muted">{CROSSCHECK[k].hint}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
