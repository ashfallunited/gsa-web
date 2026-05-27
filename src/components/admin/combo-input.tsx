'use client'

import { inputClass, labelClass } from '@/components/admin/analytics-filters'

type ComboInputProps = {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  listId: string
}

export default function ComboInput({
  label,
  value,
  options,
  onChange,
  placeholder,
  disabled,
  listId,
}: ComboInputProps) {
  return (
    <div>
      <label className={labelClass} htmlFor={listId}>
        {label}
      </label>
      <input
        id={listId}
        type="text"
        list={`${listId}-options`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={inputClass}
        autoComplete="off"
      />
      <datalist id={`${listId}-options`}>
        {options.map((opt) => (
          <option key={opt} value={opt} />
        ))}
      </datalist>
      {options.length > 0 && (
        <p className="text-[10px] text-[#5a6478] mt-1">{options.length} saved — pick or type a new one</p>
      )}
    </div>
  )
}
