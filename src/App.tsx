import './App.css'
import { RoomAccessRestrictedPage } from './pages/RoomAccessRestrictedPage'
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
            message={appState.landingMessage}
            onCreateRoom={appState.createRoom}
            onJoinInviteCodeChange={appState.setJoinInviteCode}
            onJoinRoom={appState.joinRoomByInviteCode}
          />
        ) : appState.currentRoute.name === 'room_access_restricted' ? (
          <RoomAccessRestrictedPage onBackToLanding={appState.goToLanding} />
        ) : (
          <RoomPage
            currentParticipant={appState.currentParticipant}
            isHydratingRoom={appState.isHydratingRoom}
            modeOptions={appState.modeOptions}
            room={appState.currentRoom}
            roomSummary={appState.currentRoomSummary}
            roomMessage={appState.roomMessage}
            selectedMode={appState.selectedMode}
            weekdayOptions={appState.weekdayOptions}
            onBackToLanding={appState.goToLanding}
            onChangeMode={appState.changeSelectionMode}
            onChangeNickname={appState.changeNickname}
            onCopyInviteCode={appState.copyInviteCode}
            onDeleteRoom={appState.deleteCurrentRoom}
            onJoinRoom={appState.joinCurrentRoom}
            onLeaveRoom={appState.leaveCurrentRoom}
            onMoveMonth={appState.moveVisibleMonth}
            onRemoveParticipant={appState.removeParticipant}
            onSelectDate={appState.toggleDate}
            onShareRoom={appState.shareRoom}
            onToggleWeekday={appState.toggleWeekday}
            isCurrentUserHost={appState.isCurrentUserHost}
          />
        )}
      </div>
    </div>
  )
}

export default App
