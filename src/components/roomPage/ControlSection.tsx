import { ARIA_LABELS, getWeekdayRuleAriaLabel } from "../../lib/ariaLabels";
import { MODE_LABELS, WEEKDAY_LABELS } from "../../lib/constants";
import type { DateMode, Participant } from "../../types";
import { SegmentedButtonGroup } from "../ui/SegmentedButtonGroup";
interface IControlSectionProps {
  onChangeSelectionMode: (mode: DateMode) => Promise<void>;
  onToggleWeekday: (weekday: number) => Promise<void>;
  participant: Participant;
}
export function ControlSection({
  onChangeSelectionMode,
  onToggleWeekday,
  participant,
}: IControlSectionProps) {
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

  return (
    <section className="controls-card">
      <div className="control-group">
        <p className="section-label">선택 필터</p>
        <SegmentedButtonGroup
          onChange={onChangeSelectionMode}
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
              onClick={() => void onToggleWeekday(option.value)}
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
