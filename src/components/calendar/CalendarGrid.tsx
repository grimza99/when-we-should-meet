import type { CalendarDay } from "../../types";

type CalendarGridProps = {
  days: CalendarDay[];
  rankByDate: Record<string, number>;
  onSelectDate: (isoDate: string) => void;
};

export function CalendarGrid({
  days,
  onSelectDate,
  rankByDate,
}: CalendarGridProps) {
  return (
    <>
      <div className="calendar-weekdays">
        {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="calendar-grid">
        {days.map((day) => {
          const rank = day.isoDate ? rankByDate[day.isoDate] : undefined;
          return (
            <button
              key={day.key}
              className={[
                "calendar-day",
                !day.isCurrentMonth ? "is-outside-month" : "",
                !day.isSelectable ? "is-disabled" : "",
                day.isSelectedByCurrentUser ? "is-highlighted" : "",
                rank ? "is-ranked" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              disabled={!day.isoDate || !day.isSelectable}
              onClick={() => day.isoDate && day.isSelectable && onSelectDate(day.isoDate)}
              type="button"
            >
              <span className="calendar-day-topline">
                <span className="date-number">{day.dayNumber}</span>
                {rank ? <span className="rank-badge">#{rank}</span> : null}
              </span>

              {day.isoDate ? (
                <span className="dot-row" aria-hidden="true">
                  {day.participantColors.slice(0, 3).map((color, index) => (
                    <span
                      key={`${day.isoDate}-${index}`}
                      className="dot"
                      style={{ background: color }}
                    />
                  ))}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </>
  );
}
