import type { CalendarDay } from '../../types'

type CalendarGridProps = {
  days: CalendarDay[]
  onSelectDate: (isoDate: string) => void
}

export function CalendarGrid({ days, onSelectDate }: CalendarGridProps) {
  return (
    <>
      <div className="calendar-weekdays">
        {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="calendar-grid">
        {days.map((day) => (
          <button
            key={day.key}
            className={[
              'calendar-day',
              !day.isCurrentMonth ? 'is-outside-month' : '',
              day.isSelectedByCurrentUser ? 'is-highlighted' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            disabled={!day.isoDate}
            onClick={() => day.isoDate && onSelectDate(day.isoDate)}
            type="button"
          >
            <span className="date-number">{day.dayNumber}</span>
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
        ))}
      </div>
    </>
  )
}
