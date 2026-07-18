import { isFirebaseConfigured } from "../../integrations/firebase/client";
import {
  resetParticipantSelections as resetFirebaseParticipantSelections,
  setParticipantDateOverride,
  updateParticipantAvailability,
} from "../../integrations/firebase/services/participant-service";
import { WEEKDAY_LABELS } from "../constants";
import { convertParticipantSelectionMode } from "../date";
import { getOrCreateClientKey } from "../session/clientIdentity";
import type { DateMode, Participant, Room } from "../../types";
import { updateParticipantInStorage } from "./shared";
import type { RoomActionContext } from "./shared";

type CreateRoomSelectionActionsParams = {
  context: RoomActionContext;
  participant?: Participant | null;
  room?: Room | null;
};

export function createRoomSelectionActions({
  context,
  participant,
  room,
}: CreateRoomSelectionActionsParams) {
  const { setStorage, showToast } = context;

  const resetSelections = async () => {
    if (!room || !participant) {
      return;
    }

    const previousParticipant = participant;
    const nextParticipant = {
      ...participant,
      overrides: {},
      updatedAt: new Date().toISOString(),
      weekdayRules: [],
    };

    updateParticipantInStorage(setStorage, room.id, nextParticipant);
    showToast({ msg: "선택한 날짜와 요일 규칙을 초기화했어요." });

    if (!isFirebaseConfigured) {
      return;
    }

    try {
      await resetFirebaseParticipantSelections({
        clientKey: getOrCreateClientKey(),
        participantId: nextParticipant.id,
        roomId: room.id,
      });
    } catch {
      updateParticipantInStorage(setStorage, room.id, previousParticipant);
      showToast({
        msg: "선택 내용을 초기화하지 못했어요. 잠시 후 다시 시도해 주세요.",
      });
    }
  };

  const toggleDate = async (isoDate: string) => {
    if (!room || !participant) {
      return;
    }

    if (isoDate < room.startDate || isoDate > room.endDate) {
      showToast({ msg: "방에서 정한 날짜 범위 안에서만 선택할 수 있어요." });
      return;
    }

    const previousParticipant = participant;
    const nextOverrides = { ...participant.overrides };
    const currentOverride = nextOverrides[isoDate];
    const nextStatus =
      currentOverride === participant.selectionMode
        ? null
        : participant.selectionMode;

    if (nextStatus === null) {
      delete nextOverrides[isoDate];
    } else {
      nextOverrides[isoDate] = nextStatus;
    }

    const nextParticipant = {
      ...participant,
      overrides: nextOverrides,
      updatedAt: new Date().toISOString(),
    };

    updateParticipantInStorage(setStorage, room.id, nextParticipant);

    if (!isFirebaseConfigured) {
      return;
    }

    try {
      await setParticipantDateOverride({
        clientKey: getOrCreateClientKey(),
        participantId: nextParticipant.id,
        roomId: room.id,
        overrides: nextParticipant.overrides,
      });
    } catch {
      updateParticipantInStorage(setStorage, room.id, previousParticipant);
      showToast({
        msg: "날짜 선택을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
      });
    }
  };

  const changeSelectionMode = async (mode: DateMode) => {
    if (!room || !participant) {
      return;
    }

    const previousParticipant = participant;
    const nextSelection = convertParticipantSelectionMode(
      room,
      participant,
      mode
    );
    const nextParticipant = {
      ...participant,
      overrides: nextSelection.overrides,
      selectionMode: nextSelection.selectionMode,
      updatedAt: new Date().toISOString(),
      weekdayRules: nextSelection.weekdayRules,
    };

    updateParticipantInStorage(setStorage, room.id, nextParticipant);
    showToast({
      msg:
        mode === "available"
          ? "가능한 날짜를 고르는 모드로 바뀌었어요."
          : "불가능한 날짜를 고르는 모드로 바뀌었어요.",
    });

    if (!isFirebaseConfigured) {
      return;
    }

    try {
      await updateParticipantAvailability({
        clientKey: getOrCreateClientKey(),
        overrides: nextParticipant.overrides,
        participantId: nextParticipant.id,
        roomId: room.id,
        selectionMode: nextParticipant.selectionMode,
        weekdayRules: nextParticipant.weekdayRules,
      });
    } catch {
      updateParticipantInStorage(setStorage, room.id, previousParticipant);
      showToast({
        msg: "선택 방식을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
      });
    }
  };

  const toggleWeekday = async (weekday: number) => {
    if (!room || !participant) {
      return;
    }

    const previousParticipant = participant;
    const weekdayRules = participant.weekdayRules.includes(weekday)
      ? participant.weekdayRules.filter((value) => value !== weekday)
      : [...participant.weekdayRules, weekday].sort(
          (left, right) => left - right
        );
    const nextParticipant = {
      ...participant,
      updatedAt: new Date().toISOString(),
      weekdayRules,
    };

    updateParticipantInStorage(setStorage, room.id, nextParticipant);
    showToast({ msg: `${WEEKDAY_LABELS[weekday]}요일 규칙을 업데이트했어요.` });

    if (!isFirebaseConfigured) {
      return;
    }

    try {
      await updateParticipantAvailability({
        clientKey: getOrCreateClientKey(),
        overrides: nextParticipant.overrides,
        participantId: nextParticipant.id,
        roomId: room.id,
        selectionMode: nextParticipant.selectionMode,
        weekdayRules: nextParticipant.weekdayRules,
      });
    } catch {
      updateParticipantInStorage(setStorage, room.id, previousParticipant);
      showToast({
        msg: "요일 규칙을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
      });
    }
  };

  return {
    changeSelectionMode,
    resetSelections,
    toggleDate,
    toggleWeekday,
  };
}
