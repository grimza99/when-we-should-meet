import { useEffect, useState } from 'react'
import type { RouteState } from '../types'

export function parseRoute(pathname: string): RouteState {
  const matchedRoom = pathname.match(/^\/room\/([^/]+)$/)

  if (matchedRoom) {
    return { name: 'room', roomId: matchedRoom[1] }
  }

  return { name: 'landing' }
}

export function useRouteState() {
  const [route, setRoute] = useState<RouteState>(() =>
    parseRoute(window.location.pathname),
  )

  useEffect(() => {
    const handlePopState = () => setRoute(parseRoute(window.location.pathname))
    window.addEventListener('popstate', handlePopState)

    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = (nextRoute: RouteState) => {
    const nextPath =
      nextRoute.name === 'landing' ? '/' : `/room/${nextRoute.roomId}`

    window.history.pushState({}, '', nextPath)
    setRoute(nextRoute)
  }

  return { route, navigate }
}
