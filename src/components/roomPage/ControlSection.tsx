import { ARIA_LABELS, getWeekdayRuleAriaLabel } from "../../lib/ariaLabels";
import { MODE_LABELS, WEEKDAY_LABELS } from "../../lib/constants";
import type { DateMode, Participant, Room } from "../../types";
import { SegmentedButtonGroup } from "../ui/SegmentedButtonGroup";
import { useRoomActions } from "../../hooks/useRoomActions";
interface IControlSectionProps {
  room: Room;
  participant: Participant;
}
export function ControlSection({ room, participant }: IControlSectionProps) {
  const selectedMode = participant?.selectionMode ?? "available";
  const { changeSelectionMode, toggleWeekday } = useRoomActions({
    participant,
    room,
  });

  const modeOptions = (Object.keys(MODE_LABELS) as DateMode[]).map((value) => ({
    label: MODE_LABELS[value],
    value,
  }));
  const weekdayOptions = WEEKDAY_LABELS.map((label, value) => ({
    label,
    value,
    selected: participant?.weekdayRules.includes(value) ?? false,
  }));

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
