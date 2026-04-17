"use client"

import "leaflet/dist/leaflet.css"
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet"
import L from "leaflet"
import { useEffect, useState } from "react"

const defaultIcon = L.icon({
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
  iconAnchor: [12, 41],
})

interface AcademyMapProps {
  userLocation: { lat: number; lng: number } | null
  academies: Array<{ id: number; name: string; estado: string; lat: number; lng: number; city: string; modalidade: string; distanceKm?: number }>
  radiusKm: number
  onRadiusChange: (radiusKm: number) => void
}

export function AcademyMap({ userLocation, academies, radiusKm, onRadiusChange }: AcademyMapProps) {
  const [isClient, setIsClient] = useState(false)
  const [isMapReady, setIsMapReady] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const center: [number, number] = userLocation
    ? [userLocation.lat, userLocation.lng]
    : [-23.550520, -46.633308]

  const visibleAcademies = academies

  if (!isClient) {
    return (
      <div className="relative z-0 overflow-hidden rounded-2xl border border-[#232832] bg-[#131820] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.32)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Mapa de Academias</h2>
            <p className="text-xs text-muted-foreground">Carregando mapa...</p>
          </div>
        </div>
        <div className="h-80 w-full rounded-xl bg-[#1b2027]" />
      </div>
    )
  }

  return (
    <div className="relative z-0 overflow-hidden rounded-2xl border border-[#232832] bg-[#131820] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.32)]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Mapa de Academias</h2>
          <p className="text-xs text-muted-foreground">Se a localização estiver definida, mostra apenas academias dentro do raio.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Raio:</span>
          <input
            type="range"
            min={5}
            max={100}
            value={radiusKm}
            onChange={(e) => onRadiusChange(Number(e.target.value))}
            className="w-40 accent-[#ff5b00]"
          />
          <span className="text-sm font-medium text-foreground">{radiusKm} km</span>
        </div>
      </div>

      <MapContainer
        center={center}
        zoom={userLocation ? 12 : 5}
        scrollWheelZoom={false}
        className="z-0 h-80 w-full rounded-xl"
        style={{ minHeight: "320px" }}
        whenReady={() => setIsMapReady(true)}
      >
        {isMapReady && (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        )}

        {isMapReady && userLocation && (
          <>
            <Marker position={[userLocation.lat, userLocation.lng]} icon={defaultIcon}>
              <Popup>Você está aqui</Popup>
            </Marker>
            <Circle center={[userLocation.lat, userLocation.lng]} radius={radiusKm * 1000} pathOptions={{ color: "#f97316", fillOpacity: 0.1 }} />
          </>
        )}

        {isMapReady && academies.map((academy) => (
          <Marker key={academy.id} position={[academy.lat, academy.lng]} icon={defaultIcon}>
            <Popup>
              <div className="space-y-1">
                <strong>{academy.name}</strong>
                <p className="text-xs text-muted-foreground">{academy.city} • {academy.modalidade}</p>
                {academy.distanceKm !== undefined && <p className="text-xs">{academy.distanceKm.toFixed(1)} km</p>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {!userLocation && (
        <p className="text-xs text-muted-foreground mt-2">Permita o acesso à localização para usar o filtro de raio corretamente.</p>
      )}

      {userLocation && visibleAcademies.length === 0 && (
        <p className="text-xs text-muted-foreground mt-2">Nenhuma academia dentro do raio selecionado.</p>
      )}
    </div>
  )
}
