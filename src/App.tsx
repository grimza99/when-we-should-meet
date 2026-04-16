import './App.css'
import { useAppState } from './state/useAppState'
import { LandingPage } from './pages/LandingPage'
import { RoomPage } from './pages/RoomPage'

function App() {
  const appState = useAppState()

  return (
    <div className="shell">
      <div className="mobile-frame">
        {appState.currentRoute.name === 'landing' ? (
          <LandingPage
            joinInviteCode={appState.joinInviteCode}
            onCreateRoom={appState.createRoom}
            onJoinInviteCodeChange={appState.setJoinInviteCode}
            onJoinRoom={appState.joinRoomByInviteCode}
          />
        ) : (
          <RoomPage
            currentParticipant={appState.currentParticipant}
            modeOptions={appState.modeOptions}
            room={appState.currentRoom}
            roomSummary={appState.currentRoomSummary}
            selectedMode={appState.selectedMode}
            weekdayOptions={appState.weekdayOptions}
            onBackToLanding={appState.goToLanding}
            onChangeMode={appState.changeSelectionMode}
            onJoinRoom={appState.joinCurrentRoom}
            onSelectDate={appState.toggleDate}
            onToggleWeekday={appState.toggleWeekday}
          />
        )}
      </div>
    </div>
  )
}

export default App
