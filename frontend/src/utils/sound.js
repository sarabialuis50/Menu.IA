export const playOrderSound = () => {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);

        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(1, audioCtx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);

        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (error) {
        console.error('Audio API error', error);
    }
};

export const notifyNewOrder = (title = '¡Nuevo Pedido!', body = 'Tienes un nuevo pedido pendiente.') => {
    if (!("Notification" in window)) {
        console.log("Este navegador no soporta notificaciones de escritorio");
        return;
    }

    if (Notification.permission === "granted") {
        new Notification(title, { body, icon: '/logos/logo-icon-transparent.png' });
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                new Notification(title, { body, icon: '/logos/logo-icon-transparent.png' });
            }
        });
    }
};
