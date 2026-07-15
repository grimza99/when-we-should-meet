import { useCurrentParticipantUpdater } from "../../hooks/useParticipant";
import { isFirebaseConfigured } from "../../integrations/firebase/client";
import { updateParticipantAvailability } from "../../integrations/firebase/services/participant-service";
import { ARIA_LABELS, getWeekdayRuleAriaLabel } from "../../lib/ariaLabels";
import { MODE_LABELS, WEEKDAY_LABELS } from "../../lib/constants";
import { convertParticipantSelectionMode } from "../../lib/date";
import { getOrCreateClientKey } from "../../lib/session/clientIdentity";
import type { DateMode, Participant, Room } from "../../types";
import { useToast } from "../shell/toast/toast-context";
import { SegmentedButtonGroup } from "../ui/SegmentedButtonGroup";
interface IControlSectionProps {
  room: Room;
  participant: Participant;
}
export function ControlSection({ room, participant }: IControlSectionProps) {
  const { showToast } = useToast();
  const updateCurrentParticipant = useCurrentParticipantUpdater();

  const selectedMode = participant?.selectionMode ?? "available";

  const modeOptions = (Object.keys(MODE_LABELS) as DateMode[]).map((value) => ({
    label: MODE_LABELS[value],
    value,
  }));
  const weekdayOptions = WEEKDAY_LABELS.map((label, value) => ({
    label,
    value,
    selected: participant?.weekdayRules.includes(value) ?? false,
  }));

  const changeSelectionMode = async (mode: DateMode) => {
    if (!room || !participant) {
      return;
    }

    const previousParticipant = participant;
    const updatedAt = new Date().toISOString();
    const nextSelection = convertParticipantSelectionMode(
      room,
      participant,
      mode
    );
    const nextParticipant = {
      ...participant,
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
        roomId: room.id,
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
    if (!room || !participant) {
      return;
    }

    const previousParticipant = participant;
    const updatedAt = new Date().toISOString();
    const weekdayRules = participant.weekdayRules.includes(weekday)
      ? participant.weekdayRules.filter((value) => value !== weekday)
      : [...participant.weekdayRules, weekday].sort(
          (left, right) => left - right
        );

    const nextParticipant = {
      ...participant,
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
        roomId: room.id,
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
