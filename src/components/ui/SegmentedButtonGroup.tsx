type SegmentedOption<T extends string> = {
  label: string
  value: T
}

type SegmentedButtonGroupProps<T extends string> = {
  options: SegmentedOption<T>[]
  selectedValue: T
  onChange: (value: T) => void
}

export function SegmentedButtonGroup<T extends string>({
  onChange,
  options,
  selectedValue,
}: SegmentedButtonGroupProps<T>) {
  return (
    <div className="toggle-row">
      {options.map((option) => (
        <button
          key={option.value}
          aria-pressed={selectedValue === option.value}
          className={`mode-button${selectedValue === option.value ? ' is-active' : ''}`}
          onClick={() => onChange(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
