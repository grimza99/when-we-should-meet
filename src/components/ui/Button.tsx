import type { ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "chip";

type ButtonProps = {
  ariaControls?: string;
  ariaExpanded?: boolean;
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: ButtonVariant;
  block?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
};

export function Button({
  ariaControls,
  ariaExpanded,
  block = false,
  children,
  disabled = false,
  onClick,
  type = "button",
  variant = "primary",
  style = {},
}: ButtonProps) {
  const className = [
    variant === "chip"
      ? "chip-button"
      : variant === "secondary"
      ? "secondary-button"
      : "primary-button",
    block ? "is-block" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      aria-controls={ariaControls}
      aria-expanded={ariaExpanded}
      className={className}
      disabled={disabled}
      onClick={onClick}
      type={type}
      style={style}
    >
      {children}
    </button>
  );
}
