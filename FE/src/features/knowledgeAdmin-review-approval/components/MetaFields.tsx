import type { ReactNode } from 'react'
import { DOC_TYPES } from '../constants'
import type { UploadMeta } from '../types'

const inputCls =
  'border-border-control rounded-control shadow-control bg-paper h-control w-full border px-3 text-base font-normal'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-semibold">
      {label}
      {children}
    </label>
  )
}

interface MetaFieldsProps {
  value: UploadMeta
  onChange: (value: UploadMeta) => void
  /** Cột hẹp (panel bên phải) thì xếp 1 cột */
  narrow?: boolean
}

/* 5 ô metadata bắt buộc của văn bản; dùng trong dialog tải lên và màn rà soát */
export function MetaFields({ value, onChange, narrow }: MetaFieldsProps) {
  const set = (k: keyof UploadMeta) => (v: string) =>
    onChange({ ...value, [k]: v })
  const pair = narrow ? 'grid gap-4' : 'grid gap-4 sm:grid-cols-2'

  return (
    <div className="space-y-4">
      <div className={pair}>
        <Field label="Số hiệu văn bản (bắt buộc)">
          <input
            required
            value={value.number}
            onChange={(e) => set('number')(e.target.value)}
            placeholder="vd. 78/2014/TT-BTC"
            className={inputCls}
          />
        </Field>
        <Field label="Loại văn bản (bắt buộc)">
          <select
            required
            value={value.docType}
            onChange={(e) => set('docType')(e.target.value)}
            className={inputCls}
          >
            <option value="" disabled>
              Chọn loại
            </option>
            {DOC_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Cơ quan ban hành (bắt buộc)">
        <input
          required
          value={value.issuer}
          onChange={(e) => set('issuer')(e.target.value)}
          placeholder="vd. Bộ Tài chính"
          className={inputCls}
        />
      </Field>
      <div className={pair}>
        <Field label="Ngày ban hành (bắt buộc)">
          <input
            required
            type="date"
            value={value.issuedAt}
            onChange={(e) => set('issuedAt')(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Ngày hiệu lực (bắt buộc)">
          <input
            required
            type="date"
            min={value.issuedAt || undefined}
            value={value.effectiveAt}
            onChange={(e) => set('effectiveAt')(e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>
    </div>
  )
}
