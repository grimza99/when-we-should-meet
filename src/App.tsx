import './App.css'

type DateMode = 'available' | 'unavailable'

const participantLegend = [
  { name: '민준', color: '#ee6c4d' },
  { name: '서연', color: '#2a9d8f' },
  { name: '지훈', color: '#3d5a80' },
]

const calendarDays = [
  ['', '', '', '1', '2', '3', '4'],
  ['5', '6', '7', '8', '9', '10', '11'],
  ['12', '13', '14', '15', '16', '17', '18'],
  ['19', '20', '21', '22', '23', '24', '25'],
  ['26', '27', '28', '29', '30', '', ''],
]

function App() {
  const path = window.location.pathname
  const isRoomPage = path.startsWith('/room')

  return (
    <div className="shell">
      <div className="mobile-frame">
        {isRoomPage ? <RoomPage /> : <LandingPage />}
      </div>
    </div>
  )
}

function LandingPage() {
  return (
    <main className="page landing-page">
      <section className="hero-card">
        <p className="eyebrow">when should we meet?</p>
        <h1>채팅 대신 달력에서 날짜를 정해요</h1>
        <p className="hero-copy">
          친구, 가족, 지인과 함께 가능한 날짜를 고르고 가장 좋은 날짜를 바로
          확인하는 가벼운 일정 조율 도구입니다.
        </p>
      </section>

      <section className="panel stack-gap">
        <button className="primary-button" type="button">
          방 만들기
        </button>

        <div className="divider" />

        <div className="join-block">
          <label className="label" htmlFor="invite-code">
            초대 코드로 참여하기
          </label>
          <input
            id="invite-code"
            className="text-input"
            placeholder="예: ABC123"
            type="text"
          />
          <button className="secondary-button" type="button">
            참여하기
          </button>
        </div>
      </section>

      <section className="info-grid">
        <article className="mini-card">
          <strong>가입 없음</strong>
          <p>링크나 코드만 있으면 바로 입장합니다.</p>
        </article>
        <article className="mini-card">
          <strong>모바일 중심</strong>
          <p>모든 기기에서 동일한 모바일 폭 UI로 동작합니다.</p>
        </article>
        <article className="mini-card">
          <strong>상위 날짜 집계</strong>
          <p>가장 많이 가능한 날짜 1~3위를 빠르게 확인합니다.</p>
        </article>
      </section>
    </main>
  )
}

function RoomPage() {
  const currentMode: DateMode = 'available'

  return (
    <main className="page room-page">
      <header className="room-header">
        <div>
          <p className="eyebrow">room code</p>
          <h1 className="room-title">ABC123</h1>
        </div>
        <div className="header-actions">
          <button className="chip-button" type="button">
            복사
          </button>
          <button className="chip-button" type="button">
            공유
          </button>
        </div>
      </header>

      <section className="dashboard-card">
        <div className="dashboard-head">
          <div>
            <p className="section-label">대시보드</p>
            <strong>가장 많이 가능한 날짜</strong>
          </div>
          <button className="chip-button" type="button">
            펼치기
          </button>
        </div>

        <div className="ranking-list">
          <div className="ranking-item">
            <span>#1</span>
            <strong>4월 12일 토요일</strong>
          </div>
          <div className="ranking-item">
            <span>#2</span>
            <strong>4월 19일 토요일</strong>
          </div>
          <div className="ranking-item">
            <span>#3</span>
            <strong>4월 20일 일요일</strong>
          </div>
        </div>

        <div className="participant-row">
          {participantLegend.map((participant) => (
            <span
              key={participant.name}
              className="participant-pill"
              style={{ color: participant.color }}
            >
              {participant.name}
            </span>
          ))}
        </div>
      </section>

      <section className="controls-card">
        <div className="control-group">
          <p className="section-label">선택 방식</p>
          <div className="toggle-row">
            <ModeButton active={currentMode === 'available'} label="가능 날짜" />
            <ModeButton
              active={currentMode !== 'available'}
              label="불가능 날짜"
            />
          </div>
        </div>

        <div className="control-group">
          <p className="section-label">요일 일괄 적용</p>
          <div className="weekday-row">
            {['월', '화', '수', '목', '금', '토', '일'].map((day) => (
              <button key={day} className="day-chip" type="button">
                {day}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="calendar-card">
        <div className="calendar-header">
          <button className="nav-button" type="button">
            &lt;
          </button>
          <strong>2026년 4월</strong>
          <button className="nav-button" type="button">
            &gt;
          </button>
        </div>

        <div className="calendar-weekdays">
          {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>

        <div className="calendar-grid">
          {calendarDays.flat().map((day, index) => (
            <button
              key={`${day}-${index}`}
              className={`calendar-day${day === '12' ? ' is-highlighted' : ''}`}
              type="button"
              disabled={!day}
            >
              <span className="date-number">{day}</span>
              {day ? (
                <span className="dot-row" aria-hidden="true">
                  <span className="dot dot-coral" />
                  <span className="dot dot-green" />
                  {index % 3 === 0 ? <span className="dot dot-blue" /> : null}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}

function ModeButton({ active, label }: { active: boolean; label: string }) {
  return (
    <button
      className={`mode-button${active ? ' is-active' : ''}`}
      type="button"
    >
      {label}
    </button>
  )
}

export default App
