import { useCallback, useState } from "react";
import { CreateRoomModal } from "../components/room/CreateRoomModal";
import { Button } from "../components/ui/Button";
import { TextInput } from "../components/ui/TextInput";
import { ARIA_LABELS } from "../lib/ariaLabels";
import { normalizeInviteCodeInput } from "../lib/inviteCode";
import { useRouteState } from "../lib/router";
import { isFirebaseConfigured } from "../integrations/firebase/client";
import { useLocalStorageState } from "../hooks/useLocalStorageState";
import {
  getRoomByInviteCode,
  getRoomSnapshot,
} from "../integrations/firebase/services/room-service";
import { useToast } from "../components/shell/toast/toast-context";
import {
  mapRoomRowToDraftRoom,
  mapRoomSnapshotToDraftRoom,
} from "../integrations/firebase/mapper";
import { restoreParticipant } from "../integrations/firebase/services/participant-service";
import { getOrCreateClientKey } from "../lib/session/clientIdentity";
import { mergeRoomSnapshot } from "../util/room";
import { updateMembership } from "../util/participant";
import { FeaturesSection } from "../components/landingPage/FeaturesSection";
import { HeroSection } from "../components/landingPage/HeroSection";

export function LandingPage() {
  const { navigate } = useRouteState();
  const [storage, setStorage] = useLocalStorageState();
  const [joinInviteCode, setJoinInviteCode] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);

  const { showToast } = useToast();
  const goToRoomAccessRestricted = useCallback(
    (roomId: string) => {
      setStorage((previous) => {
        const visibleMonthsByRoomId = { ...previous.visibleMonthsByRoomId };

        delete visibleMonthsByRoomId[roomId];

        return {
          ...previous,
          memberships: updateMembership(
            previous.memberships,
            roomId,
            undefined
          ),
          visibleMonthsByRoomId,
        };
      });
      showToast({
        msg: "이 방은 다시 입장할 수 없도록 제한되었어요.",
      });
      navigate({ name: "room_access_restricted", roomId }, { replace: true });
    },
    [navigate, setStorage, showToast]
  );

  const joinRoomByInviteCode = async () => {
    const inviteCode = joinInviteCode.trim().toUpperCase();
    if (!inviteCode) {
      showToast({ msg: "초대 코드를 입력해 주세요." });
      return false;
    }

    if (!isFirebaseConfigured) {
      const room = Object.values(storage.rooms).find(
        (candidate) => candidate.inviteCode === inviteCode
      );

      if (!room) {
        showToast({
          msg: "일치하는 방을 찾지 못했어요. 코드를 다시 확인해 주세요.",
        });
        return false;
      }

      navigate({ name: "room", roomId: room.id });
      return true;
    }

    try {
      const roomRow = await getRoomByInviteCode(inviteCode);

      if (!roomRow) {
        showToast({
          msg: "일치하는 방을 찾지 못했어요. 코드를 다시 확인해 주세요.",
        });
        return false;
      }

      const roomSnapshot = await getRoomSnapshot(roomRow.id);
      const room = roomSnapshot
        ? mapRoomSnapshotToDraftRoom(roomSnapshot)
        : mapRoomRowToDraftRoom(roomRow);

      try {
        await restoreParticipant({
          clientKey: getOrCreateClientKey(),
          roomId: room.id,
        });
      } catch (error) {
        if (String(error).includes("ROOM_ACCESS_RESTRICTED")) {
          goToRoomAccessRestricted(room.id);
          return false;
        }

        throw error;
      }

      setStorage((previous) => ({
        ...previous,
        rooms: {
          ...previous.rooms,
          [room.id]: mergeRoomSnapshot(
            previous.rooms[room.id],
            room,
            previous.memberships[room.id]
          ),
        },
        visibleMonthsByRoomId: {
          ...previous.visibleMonthsByRoomId,
          [room.id]:
            previous.visibleMonthsByRoomId[room.id] || room.startDate,
        },
      }));

      navigate({ name: "room", roomId: room.id });
      return true;
    } catch {
      showToast({
        msg: "방 조회에 실패했어요. 네트워크 상태를 확인해 주세요.",
      });
      return false;
    }
  };

  const submitJoin = async () => {
    if (isJoiningRoom || !joinInviteCode.trim()) {
      return;
    }

    setIsJoiningRoom(true);

    try {
      await joinRoomByInviteCode();
    } finally {
      setIsJoiningRoom(false);
    }
  };

  return (
    <main aria-label={ARIA_LABELS.landing.page} className="page landing-page">
      <HeroSection />
      <section
        className="landing-cta"
        aria-label={ARIA_LABELS.landing.createOrJoinSection}
      >
        <Button
          ariaLabel={ARIA_LABELS.landing.createRoomButton}
          block
          onClick={() => setIsCreateModalOpen(true)}
        >
          방 만들기
        </Button>

        <form
          className="landing-join-form"
          onSubmit={(event) => {
            event.preventDefault();
            void submitJoin();
          }}
        >
          <TextInput
            ariaLabel={ARIA_LABELS.landing.inviteCodeInput}
            autoCapitalize="characters"
            autoCorrect="off"
            id="invite-code"
            inputMode="text"
            label="초대 코드 입력"
            maxLength={6}
            onChange={(value) =>
              setJoinInviteCode(normalizeInviteCodeInput(value))
            }
            placeholder="초대 코드 입력"
            spellCheck={false}
            value={joinInviteCode}
          />
          <Button
            ariaLabel={ARIA_LABELS.landing.joinRoomButton}
            disabled={!joinInviteCode.trim() || isJoiningRoom}
            variant="secondary"
            type="submit"
          >
            {isJoiningRoom ? "참여 중" : "참여"}
          </Button>
        </form>
      </section>
      <FeaturesSection />
      {isCreateModalOpen && (
        <CreateRoomModal onClose={() => setIsCreateModalOpen(false)} />
      )}
    </main>
  );
}
