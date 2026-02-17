export const playOrderSound = () => {
    try {
        const audio = new Audio('/sounds/bell.mp3');
        audio.play().catch(error => console.log('Error playing sound:', error));
    } catch (error) {
        console.error('Audio api error', error);
    }
};
