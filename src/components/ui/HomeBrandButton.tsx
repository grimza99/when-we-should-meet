type HomeBrandButtonProps = {
  onClick: () => void;
};

export function HomeBrandButton({ onClick }: HomeBrandButtonProps) {
  return (
    <button className="home-brand-button" onClick={onClick} type="button">
      <img
        alt=""
        aria-hidden="true"
        className="home-brand-logo"
        src="/logo.png"
      />
      <span className="home-brand-text">우리 언제 볼까?</span>
    </button>
  );
}
