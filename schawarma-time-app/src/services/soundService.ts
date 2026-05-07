/**
 * SoundService - Synthesizes notification sounds using Web Audio API
 * for clear, attention-grabbing order alerts.
 */

class SoundService {
  private audioContext: AudioContext | null = null;
  private isPlaying: boolean = false;
  private intervalId: any = null;

  private init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  /**
   * Synthesizes a single alert chime.
   */
  private playChime(frequency: number, startTime: number, duration: number) {
    if (!this.audioContext) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(frequency, startTime);
    
    // Smooth envelope to prevent "clicks" and give it a "ping" feel
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  /**
   * Plays the full repetitive sequence
   */
  public startNotification() {
    if (this.isPlaying) return;
    this.init();
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
    this.isPlaying = true;

    const playSequence = () => {
      requestAnimationFrame(() => {
        if (!this.isPlaying || !this.audioContext) return;
        const now = this.audioContext.currentTime;
        this.playChime(880, now, 0.1);
        this.playChime(1046, now + 0.1, 0.15);
      });
    };

    playSequence();
    this.intervalId = setInterval(playSequence, 2000);
  }

  public stopNotification() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const soundService = new SoundService();
