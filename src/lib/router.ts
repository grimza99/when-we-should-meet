import { useCallback, useEffect, useState } from 'react'
import type { RouteState } from '../types'

export function parseRoute(pathname: string): RouteState {
  if (pathname === '/page/report') {
    return { name: 'report' }
  }

  const matchedRestrictedRoom = pathname.match(/^\/room\/([^/]+)\/restricted$/)
  if (matchedRestrictedRoom) {
    return { name: 'room_access_restricted', roomId: matchedRestrictedRoom[1] }
  }

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

  const navigate = useCallback(
    (nextRoute: RouteState, options?: { replace?: boolean }) => {
      const nextPath = (() => {
        if (nextRoute.name === 'landing') {
          return '/'
        }

        if (nextRoute.name === 'report') {
          return '/page/report'
        }

        if (nextRoute.name === 'room_access_restricted') {
          return `/room/${nextRoute.roomId}/restricted`
        }

        return `/room/${nextRoute.roomId}`
      })()

      if (options?.replace) {
        window.history.replaceState({}, '', nextPath)
      } else {
        window.history.pushState({}, '', nextPath)
      }
      setRoute(nextRoute)
    },
    [],
  )

  return { route, navigate }
}
