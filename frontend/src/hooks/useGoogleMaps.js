import { useState, useEffect } from 'react';

let isLoading = false;
let isLoaded = false;
const callbacks = [];

export const useGoogleMaps = (apiKey) => {
    const [loaded, setLoaded] = useState(isLoaded);

    useEffect(() => {
        if (isLoaded) return;

        const handleLoaded = () => {
            setLoaded(true);
        };

        if (isLoading) {
            callbacks.push(handleLoaded);
            return;
        }

        if (window.google && window.google.maps) {
            isLoaded = true;
            handleLoaded();
            return;
        }

        isLoading = true;
        const onScriptLoad = () => {
            isLoaded = true;
            handleLoaded();
            while (callbacks.length > 0) {
                const cb = callbacks.shift();
                if (typeof cb === 'function') cb();
            }
        };

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
        script.async = true;
        script.defer = true;
        script.onload = onScriptLoad;
        document.head.appendChild(script);

    }, [apiKey]);

    return loaded;
};
