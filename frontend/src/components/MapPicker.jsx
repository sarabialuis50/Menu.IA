import React, { useEffect, useRef, useState } from 'react';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';
import { Loader2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.REACT_APP_GOOGLE_MAPS_API_KEY;

export const MapPicker = ({ lat, lng, onChange, address }) => {
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const googleMapRef = useRef(null);
    const isLoaded = useGoogleMaps(API_KEY);
    const [mapInstance, setMapInstance] = useState(null);

    useEffect(() => {
        if (isLoaded && mapRef.current && !mapInstance && window.google && window.google.maps) {
            const defaultCenter = { lat: lat || 4.6097, lng: lng || -74.0817 };

            const map = new window.google.maps.Map(mapRef.current, {
                center: defaultCenter,
                zoom: 15,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
                styles: [
                    {
                        "featureType": "all",
                        "elementType": "labels.text.fill",
                        "stylers": [{ "color": "#7c93a3" }, { "lightness": "-10" }]
                    }
                ]
            });

            const marker = new window.google.maps.Marker({
                position: defaultCenter,
                map: map,
                draggable: true,
                animation: window.google.maps.Animation.DROP,
            });

            marker.addListener('dragend', () => {
                const newPos = marker.getPosition();
                onChange({ lat: newPos.lat(), lng: newPos.lng() });
            });

            map.addListener('click', (e) => {
                const newPos = e.latLng;
                marker.setPosition(newPos);
                onChange({ lat: newPos.lat(), lng: newPos.lng() });
            });

            googleMapRef.current = map;
            markerRef.current = marker;
            setMapInstance(map);
        }
    }, [isLoaded, mapInstance]);

    useEffect(() => {
        if (mapInstance && lat && lng) {
            const newPos = { lat, lng };
            markerRef.current.setPosition(newPos);
            mapInstance.panTo(newPos);
        }
    }, [lat, lng, mapInstance]);

    if (!isLoaded) {
        return (
            <div className="h-64 rounded-3xl bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-200">
                <Loader2 className="w-8 h-8 text-[#22C55E] animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div ref={mapRef} className="h-64 w-full rounded-2xl overflow-hidden border-2 border-gray-100 shadow-inner" />
            <p className="text-[10px] text-gray-500 italic flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Arrastra el marcador o haz clic en el mapa para fijar la ubicación exacta.
            </p>
        </div>
    );
};
