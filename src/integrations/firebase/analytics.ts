import { getAnalytics, isSupported, logEvent, setAnalyticsCollectionEnabled } from 'firebase/analytics'
import { app, isFirebaseConfigured } from './client'
import type { RouteState } from '../../types'

const measurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID?.trim()

let analyticsPromise: Promise<ReturnType<typeof getAnalytics> | null> | null = null

export const isFirebaseAnalyticsConfigured = Boolean(
  isFirebaseConfigured && measurementId,
)

function getRoutePath(route: RouteState) {
  if (route.name === 'landing') {
    return '/'
  }

  if (route.name === 'room_access_restricted') {
    return `/room/${route.roomId}/restricted`
  }

  return `/room/${route.roomId}`
}

async function getFirebaseAnalytics() {
  if (!isFirebaseAnalyticsConfigured || typeof window === 'undefined') {
    return null
  }

  if (!analyticsPromise) {
    analyticsPromise = isSupported()
      .then((supported) => {
        if (!supported) {
          return null
        }

        const analytics = getAnalytics(app)
        setAnalyticsCollectionEnabled(analytics, true)
        return analytics
      })
      .catch(() => null)
  }

  return analyticsPromise
}

export async function trackPageView(route: RouteState) {
  const analytics = await getFirebaseAnalytics()

  if (!analytics || typeof window === 'undefined') {
    return
  }

  const pagePath = getRoutePath(route)

  logEvent(analytics, 'page_view', {
    page_location: `${window.location.origin}${pagePath}`,
    page_path: pagePath,
    page_title: document.title,
  })
}
