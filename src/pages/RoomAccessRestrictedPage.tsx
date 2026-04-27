import { Button } from '../components/ui/Button'
import { HomeBrandButton } from '../components/ui/HomeBrandButton'

type RoomAccessRestrictedPageProps = {
  onBackToLanding: () => void
}

export function RoomAccessRestrictedPage({
  onBackToLanding,
}: RoomAccessRestrictedPageProps) {
  return (
    <main className="page room-access-restricted-page">
      <HomeBrandButton onClick={onBackToLanding} />

      <section className="hero-card restricted-card">
        <p className="eyebrow">access limited</p>
        <h1>이 방에는 지금 다시 들어갈 수 없어요</h1>
        <p className="hero-copy">
          방장이 참가를 제한한 상태예요. 나중에 다시 초대받으면 같은 링크로 다시
          들어올 수 있어요.
        </p>
      </section>

      <Button block onClick={onBackToLanding}>
        랜딩페이지로 돌아가기
      </Button>
    </main>
  )
}
