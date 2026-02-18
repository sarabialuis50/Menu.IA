import { useState, useEffect } from 'react';

let isLoading = false;
let isLoaded = false;
const callbacks = [];

export const useGoogleMaps = (apiKey) => {
    const [loaded, setLoaded] = useState(isLoaded);

    useEffect(() => {
        if (isLoaded) return;

        const onLoaded = () => {
            isLoaded = true;
            setLoaded(true);
            callbacks.forEach(cb => cb());
        };

        if (isLoading) {
            callbacks.push(onLoaded);
            return;
        }

        if (window.google && window.google.maps) {
            onLoaded();
            return;
        }

        isLoading = true;
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = onLoaded;
        document.head.appendChild(script);

    }, [apiKey]);

    return loaded;
};
