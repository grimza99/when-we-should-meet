import { useLocalStorageState } from "../../hooks/useLocalStorageState";
import { useCurrentParticipantUpdater } from "../../hooks/useParticipant";
import { isFirebaseConfigured } from "../../integrations/firebase/client";
import { updateParticipantAvailability } from "../../integrations/firebase/services/participant-service";
import { ARIA_LABELS, getWeekdayRuleAriaLabel } from "../../lib/ariaLabels";
import {
  DEFAULT_STORAGE,
  MODE_LABELS,
  STORAGE_KEY,
  WEEKDAY_LABELS,
} from "../../lib/constants";
import { convertParticipantSelectionMode } from "../../lib/date";
import { useRouteState } from "../../lib/router";
import { getOrCreateClientKey } from "../../lib/session/clientIdentity";
import type { AppStorage, DateMode } from "../../types";
import { useToast } from "../shell/toast/toast-context";
import { SegmentedButtonGroup } from "../ui/SegmentedButtonGroup";

export function ControlSection() {
  const { showToast } = useToast();
  const { route } = useRouteState();
  const updateCurrentParticipant = useCurrentParticipantUpdater();
  const [storage] = useLocalStorageState<AppStorage>(
    STORAGE_KEY,
    DEFAULT_STORAGE
  );
  const currentRoom =
    route.name === "room" ? storage.rooms[route.roomId] : undefined;
  const currentParticipantId =
    route.name === "room" ? storage.memberships[route.roomId] : undefined;
  const currentParticipant = currentRoom?.participants.find(
    (participant) => participant.id === currentParticipantId
  );
  const selectedMode = currentParticipant?.selectionMode ?? "available";

  const modeOptions = (Object.keys(MODE_LABELS) as DateMode[]).map((value) => ({
    label: MODE_LABELS[value],
    value,
  }));
  const weekdayOptions = WEEKDAY_LABELS.map((label, value) => ({
    label,
    value,
    selected: currentParticipant?.weekdayRules.includes(value) ?? false,
  }));

  const changeSelectionMode = async (mode: DateMode) => {
    if (!currentRoom || !currentParticipant) {
      return;
    }

    const previousParticipant = currentParticipant;
    const updatedAt = new Date().toISOString();
    const nextSelection = convertParticipantSelectionMode(
      currentRoom,
      currentParticipant,
      mode
    );
    const nextParticipant = {
      ...currentParticipant,
      overrides: nextSelection.overrides,
      selectionMode: nextSelection.selectionMode,
      updatedAt,
      weekdayRules: nextSelection.weekdayRules,
    };

    updateCurrentParticipant(nextParticipant);
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
        roomId: currentRoom.id,
        selectionMode: nextParticipant.selectionMode,
        weekdayRules: nextParticipant.weekdayRules,
      });
    } catch {
      updateCurrentParticipant(previousParticipant);
      showToast({
        msg: "선택 방식을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
      });
    }
  };
  const toggleWeekday = async (weekday: number) => {
    if (!currentRoom || !currentParticipant) {
      return;
    }

    const previousParticipant = currentParticipant;
    const updatedAt = new Date().toISOString();
    const weekdayRules = currentParticipant.weekdayRules.includes(weekday)
      ? currentParticipant.weekdayRules.filter((value) => value !== weekday)
      : [...currentParticipant.weekdayRules, weekday].sort(
          (left, right) => left - right
        );

    const nextParticipant = {
      ...currentParticipant,
      weekdayRules,
      updatedAt,
    };

    updateCurrentParticipant(nextParticipant);
    showToast({ msg: `${WEEKDAY_LABELS[weekday]}요일 규칙을 업데이트했어요.` });

    if (!isFirebaseConfigured) {
      return;
    }

    try {
      await updateParticipantAvailability({
        clientKey: getOrCreateClientKey(),
        overrides: nextParticipant.overrides,
        participantId: nextParticipant.id,
        roomId: currentRoom.id,
        selectionMode: nextParticipant.selectionMode,
        weekdayRules: nextParticipant.weekdayRules,
      });
    } catch {
      updateCurrentParticipant(previousParticipant);
      showToast({
        msg: "요일 규칙을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
      });
    }
  };

  return (
    <section className="controls-card">
      <div className="control-group">
        <p className="section-label">선택 필터</p>
        <SegmentedButtonGroup
          onChange={changeSelectionMode}
          options={modeOptions.map((option) => ({
            ...option,
            ariaLabel:
              option.value === "available"
                ? ARIA_LABELS.room.availableModeButton
                : ARIA_LABELS.room.unavailableModeButton,
          }))}
          selectedValue={selectedMode}
        />
      </div>

      <div className="control-group weekday-control-group">
        <div className="weekday-row">
          {weekdayOptions.map((option) => (
            <button
              aria-label={getWeekdayRuleAriaLabel(option.label)}
              aria-pressed={option.selected}
              key={option.value}
              className={`day-chip${option.selected ? " is-active" : ""}`}
              onClick={() => toggleWeekday(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
