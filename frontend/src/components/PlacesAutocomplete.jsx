import React, { useEffect, useRef } from 'react';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';
import { Input } from '@/components/ui/input';
import { MapPin } from 'lucide-react';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.REACT_APP_GOOGLE_MAPS_API_KEY || "AIzaSyAwduq9rijltqE2tgI9shSHF76m-45K_iY";

export const PlacesAutocomplete = ({ value, onChange, onPlaceSelected, placeholder, className }) => {
    const inputRef = useRef(null);
    const isLoaded = useGoogleMaps(API_KEY);
    const autocompleteRef = useRef(null);

    useEffect(() => {
        if (isLoaded && inputRef.current && !autocompleteRef.current && window.google && window.google.maps) {
            const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
                fields: ["address_components", "geometry", "name", "formatted_address"],
                componentRestrictions: { country: "CO" } // Restrict to Colombia by default
            });

            autocomplete.addListener("place_changed", () => {
                const place = autocomplete.getPlace();
                if (place.geometry) {
                    onPlaceSelected({
                        address: place.formatted_address,
                        lat: place.geometry.location.lat(),
                        lng: place.geometry.location.lng()
                    });
                } else {
                    onChange(place.name || "");
                }
            });

            autocompleteRef.current = autocomplete;
        }
    }, [isLoaded]);

    return (
        <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
                ref={inputRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className={`pl-10 ${className}`}
            />
        </div>
    );
};
