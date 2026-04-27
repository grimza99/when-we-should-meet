type HomeBrandButtonProps = {
  onClick: () => void;
};

export function HomeBrandButton({ onClick }: HomeBrandButtonProps) {
  return (
    <button className="home-brand-button" onClick={onClick} type="button">
      <img
        alt="brand-logo"
        aria-hidden="true"
        className="home-brand-logo"
        src="/logo.png"
      />
    </button>
  );
}
