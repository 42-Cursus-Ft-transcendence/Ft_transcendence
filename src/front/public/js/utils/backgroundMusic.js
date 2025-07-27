// Background music manager for the application
export class BackgroundMusicManager {
    audio = null;
    isPlaying = false;
    volume = 0.3; // Default volume (30%)
    constructor() {
        this.setupAudio();
    }
    setupAudio() {
        this.audio = new Audio('assets/sound/Demacia_Vice.mp3');
        this.audio.loop = true;
        this.audio.volume = this.volume;
        // Preload the audio
        this.audio.preload = 'auto';
        // Handle audio loading errors
        this.audio.addEventListener('error', (e) => {
            console.warn('Background music failed to load:', e);
        });
        // Handle when audio can start playing
        this.audio.addEventListener('canplaythrough', () => {
            console.log('Background music loaded and ready to play');
        });
        // Handle when audio actually starts playing
        this.audio.addEventListener('play', () => {
            this.isPlaying = true;
        });
        // Handle when audio is paused
        this.audio.addEventListener('pause', () => {
            this.isPlaying = false;
        });
    }
    async play() {
        if (!this.audio || this.isPlaying)
            return;
        try {
            await this.audio.play();
            this.isPlaying = true;
            console.log('🎵 Background music started');
        }
        catch (error) {
            console.warn('Failed to play background music (user interaction may be required):', error);
            // Store that we want to play music, will be triggered on first user interaction
            this.setupUserInteractionHandler();
        }
    }
    pause() {
        if (!this.audio || !this.isPlaying)
            return;
        this.audio.pause();
        this.isPlaying = false;
        console.log('⏸️ Background music paused');
    }
    stop() {
        if (!this.audio)
            return;
        this.audio.pause();
        this.audio.currentTime = 0;
        this.isPlaying = false;
        console.log('⏹️ Background music stopped');
    }
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume)); // Clamp between 0 and 1
        if (this.audio) {
            this.audio.volume = this.volume;
        }
    }
    getVolume() {
        return this.volume;
    }
    isCurrentlyPlaying() {
        // Check the actual audio element state instead of just our flag
        return this.audio ? !this.audio.paused && !this.audio.ended : false;
    }
    setupUserInteractionHandler() {
        const handleFirstInteraction = async () => {
            try {
                if (this.audio && !this.isPlaying) {
                    await this.audio.play();
                    this.isPlaying = true;
                    console.log('🎵 Background music started after user interaction');
                }
            }
            catch (error) {
                console.warn('Still failed to play background music:', error);
            }
            // Remove listeners after first successful interaction
            document.removeEventListener('click', handleFirstInteraction);
        };
        document.addEventListener('click', handleFirstInteraction);
    }
}
// Create and export a singleton instance
export const backgroundMusic = new BackgroundMusicManager();
//# sourceMappingURL=backgroundMusic.js.map