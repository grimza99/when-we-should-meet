import { useId, type ReactNode } from 'react'

type ModalProps = {
  children: ReactNode
  description?: string
  title: string
}

export function Modal({ children, description, title }: ModalProps) {
  const titleId = useId()
  const descriptionId = useId()

  return (
    <div className="modal-backdrop">
      <section
        className="modal-card"
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        role="dialog"
      >
        <div className="modal-header">
          <h2 id={titleId}>{title}</h2>
          {description ? (
            <p className="modal-copy" id={descriptionId}>
              {description}
            </p>
          ) : null}
        </div>
        {children}
      </section>
    </div>
  )
}
