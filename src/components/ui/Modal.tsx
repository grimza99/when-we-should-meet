import { useId, type ReactNode } from "react";

type ModalProps = {
  ariaLabel?: string;
  children: ReactNode;
  description?: string;
  onClose?: () => void;
  closeButtonVisible?: boolean;
  title: string;
};

export function Modal({
  ariaLabel,
  children,
  description,
  onClose,
  closeButtonVisible = true,
  title,
}: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <div className="modal-backdrop">
      <section
        className="modal-card"
        aria-label={ariaLabel}
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={ariaLabel ? undefined : titleId}
        aria-modal="true"
        role="dialog"
      >
        <div className="modal-header">
          <div className="modal-title-row">
            <h2 id={titleId}>{title}</h2>
            {onClose && closeButtonVisible ? (
              <button
                aria-label={`${title} 닫기`}
                className="modal-close-button"
                onClick={onClose}
                type="button"
              >
                ×
              </button>
            ) : null}
          </div>
          {description && (
            <p className="modal-copy" id={descriptionId}>
              {description}
            </p>
          )}
        </div>
        {children}
      </section>
    </div>
  );
}
