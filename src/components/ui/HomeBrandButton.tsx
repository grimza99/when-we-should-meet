type HomeBrandButtonProps = {
  ariaLabel?: string;
  onClick: () => void;
};

export function HomeBrandButton({
  ariaLabel,
  onClick,
}: HomeBrandButtonProps) {
  return (
    <button
      aria-label={ariaLabel}
      className="home-brand-button"
      onClick={onClick}
      type="button"
    >
      <img
        alt="brand-logo"
        aria-hidden="true"
        className="home-brand-logo"
        src="/logo.png"
      />
    </button>
  );
}
