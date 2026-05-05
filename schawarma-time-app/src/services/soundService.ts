/**
 * SoundService - Synthesizes notification sounds using Web Audio API
 * to mimic professional delivery platform alerts (like Lieferando).
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
   * Synthesizes a single "Lieferando-style" chime
   */
  private playChime(frequency: number, startTime: number, duration: number) {
    if (!this.audioContext) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    // Lieferando sound has a clean, electronic feel - 'triangle' or 'sine' works best
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
    this.isPlaying = true;

    const playSequence = () => {
      if (!this.isPlaying || !this.audioContext) return;
      
      const now = this.audioContext.currentTime;
      
      // Lieferando pattern: Two quick energetic chirps
      // Note 1: High pitch (A5)
      this.playChime(880, now, 0.15);
      // Note 2: Higher pitch (C6) after a tiny gap
      this.playChime(1046, now + 0.12, 0.2);
    };

    console.log("🔔 [SoundService] Starting notification loop...");
    playSequence();
    
    // Repeat every 1.5 seconds until stopped
    this.intervalId = setInterval(() => {
      console.log("🔔 [SoundService] Loop: Playing chime sequence...");
      playSequence();
    }, 1500);
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
