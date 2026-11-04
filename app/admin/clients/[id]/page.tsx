// Server component — required so generateStaticParams() can be exported.
// In Capacitor the route is always reached via client-side navigation, so no
// paths need pre-rendering. The actual page content is in ClientDetailPage.
import ClientDetailPage from './ClientDetailPage'

export function generateStaticParams() { return [] }

export default function Page() {
  return <ClientDetailPage />
}
