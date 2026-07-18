import { useEffect, type RefObject } from "react";
import { ARIA_LABELS } from "../../lib/ariaLabels";
import type { Room } from "../../types";
import { HomeBrandButton } from "../ui/HomeBrandButton";
import InviteSection from "./InviteSection";

type THeaderSection = {
  headerRef: RefObject<HTMLElement | null>;
  onCopyInviteCode: () => Promise<void>;
  onShareRoom: () => Promise<void>;
  room: Room;
  setDashboardStickyTop: (num: number) => void;
};
export default function HeaderSection({
  headerRef,
  onCopyInviteCode,
  onShareRoom,
  room,
  setDashboardStickyTop,
}: THeaderSection) {
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
          <HomeBrandButton />
          <h1
            aria-label={ARIA_LABELS.room.inviteCodeHeading}
            className="room-title"
          >
            {room.inviteCode}
          </h1>
        </div>
        <InviteSection
          onCopyInviteCode={onCopyInviteCode}
          onShareRoom={onShareRoom}
        />
      </div>
    </header>
  );
}
