import type { ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'chip'

type ButtonProps = {
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  variant?: ButtonVariant
  block?: boolean
  disabled?: boolean
}

export function Button({
  block = false,
  children,
  disabled = false,
  onClick,
  type = 'button',
  variant = 'primary',
}: ButtonProps) {
  const className = [
    variant === 'chip'
      ? 'chip-button'
      : variant === 'secondary'
        ? 'secondary-button'
        : 'primary-button',
    block ? 'is-block' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button className={className} disabled={disabled} onClick={onClick} type={type}>
      {children}
    </button>
  )
}
