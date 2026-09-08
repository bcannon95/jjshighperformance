'use client'
import { useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker, Circle, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

type Point = { lat: number; lng: number }

/** Pans the map to follow the current position during a live run */
function TrackCenter({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, map.getZoom())
  }, [center, map])
  return null
}

/** Fits the map bounds to show the whole route (used for history view) */
function AutoFit({ points }: { points: Point[] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length < 2) return
    const lats = points.map((p) => p.lat)
    const lngs = points.map((p) => p.lng)
    map.fitBounds(
      [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]],
      { padding: [32, 32] }
    )
  }, [map, points])
  return null
}

export default function RunMapInner({
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
  const defaultCenter: [number, number] = center ?? [-33.865, 151.209]
  const positions = points.map((p) => [p.lat, p.lng] as [number, number])
  const first = positions[0]
  const last  = positions[positions.length - 1]

  return (
    <MapContainer
      center={defaultCenter}
      zoom={16}
      className="w-full h-full"
      zoomControl
      scrollWheelZoom
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />

      {/* Route polyline */}
      {positions.length > 1 && (
        <Polyline positions={positions} color="#d4de26" weight={4} opacity={0.9} />
      )}

      {/* Start marker (green) */}
      {first && (
        <CircleMarker
          center={first}
          radius={6}
          color="#22c55e"
          fillColor="#22c55e"
          fillOpacity={1}
          weight={2}
        />
      )}

      {/* Current / finish marker (brand yellow) */}
      {last && last !== first && (
        <CircleMarker
          center={last}
          radius={8}
          color="#d4de26"
          fillColor="#d4de26"
          fillOpacity={1}
          weight={2}
        />
      )}

      {/* GPS accuracy circle — radius in real-world metres, colour-coded by quality */}
      {last && accuracyM != null && accuracyM > 0 && (() => {
        const colour = accuracyM <= 10 ? '#22c55e' : accuracyM <= 30 ? '#facc15' : '#ef4444'
        return (
          <Circle
            center={last}
            radius={accuracyM}
            color={colour}
            fillColor={colour}
            fillOpacity={0.15}
            weight={1.5}
            opacity={0.5}
          />
        )
      })()}

      {fit && points.length > 1 && <AutoFit points={points} />}
      {!fit && center && <TrackCenter center={center} />}
    </MapContainer>
  )
}
