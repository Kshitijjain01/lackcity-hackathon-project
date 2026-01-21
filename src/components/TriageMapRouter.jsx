import { useState, useEffect, useRef } from 'react'

export default function TriageMapRouter({ triageResult }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])
  const directionsRendererRef = useRef(null)

  const [userLocation, setUserLocation] = useState(null)
  const [places, setPlaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [directions, setDirections] = useState(null)
  const [routeInfo, setRouteInfo] = useState(null)

  const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY

  // Get search radius based on urgency
  const getSearchRadius = () => {
    switch (triageResult?.urgency) {
      case 'emergency': return 20000
      case 'urgent': return 15000
      default: return 10000
    }
  }

  // Get urgency colors
  const getUrgencyColor = () => {
    switch (triageResult?.urgency) {
      case 'emergency': return { bg: 'bg-red-500', ring: 'ring-red-500/30' }
      case 'urgent': return { bg: 'bg-orange-500', ring: 'ring-orange-500/30' }
      default: return { bg: 'bg-green-500', ring: 'ring-green-500/30' }
    }
  }

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // Calculate ranking score
  const calculateScore = (place, distanceKm) => {
    const distanceScore = 5 / Math.max(distanceKm, 0.1)
    const ratingScore = place.rating || 3
    const popularityBonus = (place.user_ratings_total || 0) > 50 ? 1 : 0
    return distanceScore + ratingScore + popularityBonus
  }

  // Load Google Maps and get user location
  useEffect(() => {
    if (!GOOGLE_MAPS_KEY) {
      setError('Google Maps API key is not configured')
      setLoading(false)
      return
    }

    // Load Google Maps script
    const loadGoogleMaps = () => {
      return new Promise((resolve, reject) => {
        if (window.google?.maps) {
          resolve()
          return
        }

        const script = document.createElement('script')
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places`
        script.async = true
        script.onload = resolve
        script.onerror = () => reject(new Error('Failed to load Google Maps'))
        document.head.appendChild(script)
      })
    }

    // Get user location
    const getUserLocation = () => {
      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          resolve({ lat: 28.6139, lng: 77.2090 }) // Default Delhi
          return
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            })
          },
          () => {
            resolve({ lat: 28.6139, lng: 77.2090 }) // Default Delhi on error
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        )
      })
    }

    // Initialize everything
    const init = async () => {
      try {
        await loadGoogleMaps()
        const location = await getUserLocation()
        setUserLocation(location)
      } catch (err) {
        setError(err.message)
        setLoading(false)
      }
    }

    init()
  }, [GOOGLE_MAPS_KEY])

  // Initialize map and search when we have location
  useEffect(() => {
    if (!userLocation || !window.google?.maps || !mapRef.current || !triageResult) return

    // Create map
    const map = new window.google.maps.Map(mapRef.current, {
      center: userLocation,
      zoom: 13,
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
    })

    mapInstanceRef.current = map

    // Add user marker
    new window.google.maps.Marker({
      position: userLocation,
      map: map,
      title: 'Your Location',
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#3b82f6',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
      },
    })

    // Search for places
    const service = new window.google.maps.places.PlacesService(map)
    const radius = getSearchRadius()

    // Build search query
    const keywords = triageResult.search_keywords || []
    const query = [...keywords, triageResult.department, 'hospital'].filter(Boolean).join(' ')

    const request = {
      location: new window.google.maps.LatLng(userLocation.lat, userLocation.lng),
      radius: radius,
      query: query || 'hospital near me',
    }

    service.textSearch(request, (results, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
        processResults(results, map)
      } else {
        // Fallback: nearby search for hospitals
        service.nearbySearch({
          location: new window.google.maps.LatLng(userLocation.lat, userLocation.lng),
          radius: radius,
          type: 'hospital',
        }, (nearbyResults, nearbyStatus) => {
          if (nearbyStatus === window.google.maps.places.PlacesServiceStatus.OK && nearbyResults) {
            processResults(nearbyResults, map)
          } else {
            setError('No hospitals found nearby')
            setLoading(false)
          }
        })
      }
    })

    function processResults(results, map) {
      // Clear old markers
      markersRef.current.forEach(m => m.setMap(null))
      markersRef.current = []

      const service = new window.google.maps.places.PlacesService(map)

      // Calculate scores and sort
      const initialScored = results
        .filter(p => p.geometry?.location)
        .map(place => {
          const lat = place.geometry.location.lat()
          const lng = place.geometry.location.lng()
          const distance = calculateDistance(userLocation.lat, userLocation.lng, lat, lng)
          const score = calculateScore(place, distance)
          return { ...place, distance, score, isOpen: null }
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, triageResult?.urgency === 'emergency' ? 6 : 8) // Get a few extra to filter

      // Fetch details for each place to get open/closed status
      const detailsPromises = initialScored.map(place => {
        return new Promise((resolve) => {
          service.getDetails(
            { placeId: place.place_id, fields: ['opening_hours', 'formatted_phone_number', 'business_status', 'utc_offset_minutes'] },
            (details, status) => {
              if (status === window.google.maps.places.PlacesServiceStatus.OK && details) {
                let isOpen = null
                
                // Only set isOpen if we have actual opening_hours data with isOpen method
                if (details.opening_hours && typeof details.opening_hours.isOpen === 'function') {
                  try {
                    isOpen = details.opening_hours.isOpen()
                  } catch (e) {
                    isOpen = null
                  }
                }
                
                resolve({
                  ...place,
                  isOpen: isOpen,
                  formatted_phone_number: details.formatted_phone_number || null,
                  business_status: details.business_status
                })
              } else {
                resolve({ ...place, isOpen: null })
              }
            }
          )
        })
      })

      Promise.all(detailsPromises).then(placesWithDetails => {
        // Sort and filter with open/closed info
        const finalPlaces = placesWithDetails
          .sort((a, b) => {
            if (triageResult?.urgency === 'emergency') {
              if (a.isOpen === true && b.isOpen !== true) return -1
              if (b.isOpen === true && a.isOpen !== true) return 1
            }
            if (a.isOpen === true && b.isOpen === false) return -1
            if (a.isOpen === false && b.isOpen === true) return 1
            return b.score - a.score
          })
          .filter(place => {
            if (triageResult?.urgency === 'emergency') {
              return place.isOpen !== false
            }
            return true
          })
          .slice(0, triageResult?.urgency === 'emergency' ? 3 : 5)

        setPlaces(finalPlaces)

        // Add markers
        const bounds = new window.google.maps.LatLngBounds()
        bounds.extend(userLocation)

        finalPlaces.forEach((place, index) => {
          const marker = new window.google.maps.Marker({
            position: place.geometry.location,
            map: map,
            title: place.name,
            label: {
              text: String(index + 1),
              color: '#ffffff',
              fontWeight: 'bold',
            },
          })

          bounds.extend(place.geometry.location)

          const infoWindow = new window.google.maps.InfoWindow({
            content: `<div style="color:#000;padding:8px"><strong>${place.name}</strong><br/>${place.vicinity || ''}</div>`
          })

          marker.addListener('click', () => {
            infoWindow.open(map, marker)
            setSelectedPlace(place)
          })

          markersRef.current.push(marker)
        })

        map.fitBounds(bounds, 50)
        setLoading(false)
      })
    }

  }, [userLocation, triageResult])

  // Show directions on map
  const showDirections = (place) => {
    if (!mapInstanceRef.current || !userLocation) return

    const directionsService = new window.google.maps.DirectionsService()

    // Create or reuse directions renderer
    if (!directionsRendererRef.current) {
      directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
        map: mapInstanceRef.current,
        suppressMarkers: false,
        polylineOptions: {
          strokeColor: '#3b82f6',
          strokeWeight: 5,
          strokeOpacity: 0.8,
        },
      })
    }

    const request = {
      origin: new window.google.maps.LatLng(userLocation.lat, userLocation.lng),
      destination: place.geometry.location,
      travelMode: window.google.maps.TravelMode.DRIVING,
    }

    directionsService.route(request, (result, status) => {
      if (status === window.google.maps.DirectionsStatus.OK) {
        directionsRendererRef.current.setDirections(result)
        setDirections(result)
        setSelectedPlace(place)

        // Extract route info
        const route = result.routes[0]
        const leg = route.legs[0]
        setRouteInfo({
          distance: leg.distance.text,
          duration: leg.duration.text,
          steps: leg.steps.map(step => ({
            instruction: step.instructions,
            distance: step.distance.text,
          })),
        })
      }
    })
  }

  // Clear directions from map
  const clearDirections = () => {
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setDirections({ routes: [] })
    }
    setDirections(null)
    setRouteInfo(null)
  }

  const urgencyColors = getUrgencyColor()

  if (!triageResult) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-950 text-white">
        <div className="rounded-2xl bg-slate-900 p-8 text-center ring-1 ring-white/10">
          <h2 className="text-xl font-semibold text-white mb-4">No Triage Result</h2>
          <p className="text-white/60 mb-6">Please describe your symptoms first.</p>
          <a href="/interaction" className="rounded-xl bg-sky-500 px-6 py-3 text-sm font-medium text-white hover:bg-sky-400">
            Go to Symptom Checker
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex h-screen bg-gray-100">
      {/* Emergency Banner */}
      {triageResult.urgency === 'emergency' && (
        <div className="absolute left-0 right-0 top-0 z-50 bg-red-600 px-4 py-3 text-center text-white">
          <span className="font-bold">⚠️ EMERGENCY: Please visit the nearest hospital immediately!</span>
        </div>
      )}

      {/* Side Panel */}
      <div className={`w-96 overflow-y-auto bg-white shadow-lg ${triageResult.urgency === 'emergency' ? 'pt-14' : ''}`}>
        <div className="border-b border-gray-200 p-4">
          <h2 className="text-xl font-semibold text-gray-900">Recommended Facilities</h2>
          <div className="mt-2 flex items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-medium text-white ${urgencyColors.bg}`}>
              {triageResult.urgency?.toUpperCase()}
            </span>
            <span className="text-sm text-gray-500">
              {triageResult.specialist} • {triageResult.department}
            </span>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center p-8">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-500">Searching nearby facilities...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="m-4 rounded-xl bg-red-100 p-4 text-red-600">{error}</div>
        )}

        {/* Results */}
        {!loading && places.length > 0 && (
          <div className="p-4 space-y-3">
            {places.map((place, index) => (
              <div
                key={place.place_id}
                className={`rounded-xl bg-gray-50 p-4 ring-1 cursor-pointer hover:bg-gray-100 ${
                  selectedPlace?.place_id === place.place_id ? `ring-2 ${urgencyColors.ring}` : 'ring-gray-200'
                }`}
                onClick={() => {
                  setSelectedPlace(place)
                  mapInstanceRef.current?.panTo(place.geometry.location)
                  mapInstanceRef.current?.setZoom(15)
                }}
              >
                {/* Open/Closed tag in top right */}
                <div className="flex justify-end mb-2">
                  {place.isOpen === true && (
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-600">
                      Open
                    </span>
                  )}
                  {place.isOpen === false && (
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-red-100 text-red-600">
                      Closed
                    </span>
                  )}
                  {place.isOpen === null && (
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-500">
                      Hours N/A
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white ${urgencyColors.bg}`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{place.name}</h3>
                    <p className="text-xs text-gray-500">{place.vicinity || place.formatted_address}</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                  {place.rating && (
                    <span className="text-yellow-600">⭐ {place.rating.toFixed(1)}</span>
                  )}
                  <span className="text-gray-500">📍 {place.distance.toFixed(1)} km</span>
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); showDirections(place) }}
                  className="mt-3 w-full rounded-lg bg-sky-500 py-2 text-sm font-medium text-white hover:bg-sky-400"
                >
                  Get Directions
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Directions Panel */}
        {routeInfo && (
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900">Directions to {selectedPlace?.name}</h3>
              <button
                onClick={clearDirections}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                ✕ Clear
              </button>
            </div>
            
            <div className="flex gap-4 mb-4">
              <div className="rounded-lg bg-sky-100 px-3 py-2 text-center">
                <p className="text-lg font-bold text-sky-600">{routeInfo.distance}</p>
                <p className="text-xs text-gray-500">Distance</p>
              </div>
              <div className="rounded-lg bg-green-100 px-3 py-2 text-center">
                <p className="text-lg font-bold text-green-600">{routeInfo.duration}</p>
                <p className="text-xs text-gray-500">Duration</p>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2">
              {routeInfo.steps.map((step, idx) => (
                <div key={idx} className="flex gap-2 text-xs">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-gray-700" dangerouslySetInnerHTML={{ __html: step.instruction }} />
                    <p className="text-gray-400">{step.distance}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Triage Summary */}
        <div className="border-t border-gray-200 p-4">
          <h3 className="mb-3 text-sm font-medium text-gray-500">Triage Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Specialist</span>
              <span className="text-indigo-600">{triageResult.specialist}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Department</span>
              <span className="text-sky-600">{triageResult.department}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Search Radius</span>
              <span className="text-gray-700">{getSearchRadius() / 1000} km</span>
            </div>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className={`flex-1 ${triageResult.urgency === 'emergency' ? 'pt-12' : ''}`}>
        <div ref={mapRef} className="h-full w-full" />
      </div>
    </div>
  )
}
