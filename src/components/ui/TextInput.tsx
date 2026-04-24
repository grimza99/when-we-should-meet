import { useId } from "react";

type TextInputProps = {
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoCorrect?: "off" | "on";
  id?: string;
  inputMode?: "text" | "numeric";
  label?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  spellCheck?: boolean;
  value: string;
  type?: "text" | "date" | "number";
  min?: number;
  max?: number;
  maxLength?: number;
  inputStyle?: React.CSSProperties;
};

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
  type = "text",
  inputStyle = {},
  value,
}: TextInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="field">
      {label ? (
        <label className="label" htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      <input
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        id={inputId}
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
        style={inputStyle}
      />
    </div>
  );
}
