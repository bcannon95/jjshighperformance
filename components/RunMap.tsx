import dynamic from 'next/dynamic'

type Point = { lat: number; lng: number }

const RunMapInner = dynamic(() => import('./RunMapInner'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center text-sm text-gray-400 dark:text-gray-600 bg-gray-100 dark:bg-gray-900">
      Loading map…
    </div>
  ),
})

export default function RunMap({
  points,
  center,
  fit = false,
  accuracyM,
}: {
  points: Point[]
  center: [number, number] | null
  fit?: boolean
  accuracyM?: number | null
}) {
  return <RunMapInner points={points} center={center} fit={fit} accuracyM={accuracyM} />
}
