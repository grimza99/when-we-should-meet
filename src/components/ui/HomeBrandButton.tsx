import { ARIA_LABELS } from "../../lib/ariaLabels";
import { useRouteState } from "../../lib/router";

type HomeBrandButtonProps = {
  ariaLabel?: string;
  onClick?: () => void;
};

export function HomeBrandButton({ ariaLabel, onClick }: HomeBrandButtonProps) {
  const { navigate } = useRouteState();
  const resolveAriaLabel = ariaLabel ? ariaLabel : ARIA_LABELS.room.homeButton;
  return (
    <button
      aria-label={resolveAriaLabel}
      className="home-brand-button"
      onClick={onClick ? onClick : () => navigate({ name: "landing" })}
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
