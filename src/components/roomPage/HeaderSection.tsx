import { useEffect, type RefObject } from "react";
import { ARIA_LABELS } from "../../lib/ariaLabels";
import { useRouteState } from "../../lib/router";
import type { Room } from "../../types";
import { HomeBrandButton } from "../ui/HomeBrandButton";
import InviteSection from "./InviteSection";

type THeaderSection = {
  headerRef: RefObject<HTMLElement | null>;
  room: Room;
  setDashboardStickyTop: (num: number) => void;
};
export default function HeaderSection({
  headerRef,
  room,
  setDashboardStickyTop,
}: THeaderSection) {
  const { navigate } = useRouteState();

  useEffect(() => {
    const headerElement = headerRef.current;

    if (!headerElement) {
      return;
    }

    const updateDashboardStickyTop = () => {
      setDashboardStickyTop(headerElement.offsetHeight + 8);
    };

    setDashboardStickyTop(headerElement.offsetHeight + 8);

    const resizeObserver = new ResizeObserver(() => {
      updateDashboardStickyTop();
    });

    resizeObserver.observe(headerElement);
    window.addEventListener("resize", updateDashboardStickyTop);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateDashboardStickyTop);
    };
  }, [setDashboardStickyTop, headerRef, room]);
  return (
    <header className="room-header" ref={headerRef}>
      <div className="room-header-top">
        <div className="brand-button-and-invite-code">
          <HomeBrandButton
            ariaLabel={ARIA_LABELS.room.homeButton}
            onClick={() => navigate({ name: "landing" })}
          />
          <h1
            aria-label={ARIA_LABELS.room.inviteCodeHeading}
            className="room-title"
          >
            {room.inviteCode}
          </h1>
        </div>
        <InviteSection room={room} />
      </div>
    </header>
  );
}
