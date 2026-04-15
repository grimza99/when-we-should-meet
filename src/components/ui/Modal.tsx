import type { ReactNode } from 'react'

type ModalProps = {
  children: ReactNode
  description?: string
  title: string
}

export function Modal({ children, description, title }: ModalProps) {
  return (
    <div className="modal-backdrop">
      <section className="modal-card" aria-modal="true" role="dialog">
        <div className="modal-header">
          <h2>{title}</h2>
          {description ? <p className="modal-copy">{description}</p> : null}
        </div>
        {children}
      </section>
    </div>
  )
}
