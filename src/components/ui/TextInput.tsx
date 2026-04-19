type TextInputProps = {
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
  autoCorrect?: 'off' | 'on'
  id?: string
  inputMode?: 'text' | 'numeric'
  label?: string
  onChange: (value: string) => void
  placeholder?: string
  spellCheck?: boolean
  value: string
  type?: 'text' | 'date' | 'number'
  min?: number
  max?: number
  maxLength?: number
}

export function TextInput({
  autoCapitalize,
  autoCorrect,
  id,
  inputMode,
  label,
  max,
  maxLength,
  min,
  onChange,
  placeholder,
  spellCheck,
  type = 'text',
  value,
}: TextInputProps) {
  return (
    <div className="field">
      {label ? (
        <label className="label" htmlFor={id}>
          {label}
        </label>
      ) : null}
      <input
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        id={id}
        className="text-input"
        inputMode={inputMode}
        max={max}
        maxLength={maxLength}
        min={min}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        spellCheck={spellCheck}
        type={type}
        value={value}
      />
    </div>
  )
}
