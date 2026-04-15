type TextInputProps = {
  id?: string
  label?: string
  onChange: (value: string) => void
  placeholder?: string
  value: string
  type?: 'text' | 'date' | 'number'
  min?: number
  max?: number
}

export function TextInput({
  id,
  label,
  max,
  min,
  onChange,
  placeholder,
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
        id={id}
        className="text-input"
        max={max}
        min={min}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </div>
  )
}
