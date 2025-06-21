
import { SoundEffectType, MusicTrackType, PlaySoundOptions, PlayMusicOptions } from '../types';

// Keep the types for iteration, but paths are no longer used.
const SFX_TYPES: SoundEffectType[] = [
  'player_shoot', 'player_jump', 'player_hit', 'level_up', 
  'enemy_hit', 'enemy_shoot', 'enemy_death', 'explosion', 
  'ui_click', 'barrier_break', 'orb_collect', 'shop_purchase', 'game_over'
];

const MUSIC_TYPES: MusicTrackType[] = [
  'main_menu', 'gameplay'
];

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private soundBuffers: Map<string, AudioBuffer> = new Map();
  private musicSources: Map<MusicTrackType, { source: AudioBufferSourceNode, gain: GainNode }> = new Map();
  private isInitialized = false;
  private isMuted = false;
  private preMuteVolumes = { master: 0.7, music: 0.5, sfx: 0.8 };

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      this.masterGain = this.audioContext.createGain();
      this.musicGain = this.audioContext.createGain();
      this.sfxGain = this.audioContext.createGain();

      this.masterGain.connect(this.audioContext.destination);
      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      
      this.setMasterVolume(this.preMuteVolumes.master);
      this.setMusicVolume(this.preMuteVolumes.music);
      this.setSfxVolume(this.preMuteVolumes.sfx);


      await this.generateAllPlaceholderSounds();
      this.isInitialized = true;
      console.log('AudioManager initialized with placeholder sounds.');
    } catch (e) {
      console.error('Failed to initialize AudioContext:', e);
      this.audioContext = null; // Ensure it's null if failed
    }
  }

  public resumeContext(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().then(() => {
        console.log('AudioContext resumed successfully.');
      }).catch(e => console.error('Error resuming AudioContext:', e));
    }
  }

  private createPlaceholderSoundBuffer(type: SoundEffectType | MusicTrackType): AudioBuffer | null {
    if (!this.audioContext) return null;
    const sampleRate = this.audioContext.sampleRate;
    let duration = 0.1; // Default SFX duration
    let buffer: AudioBuffer;

    // Simple sound generation logic
    const createTone = (freq: number, dur: number, waveType: OscillatorType | 'noise' = 'sine', envelope: boolean = true) => {
      const frameCount = sampleRate * dur;
      const localBuffer = this.audioContext!.createBuffer(1, frameCount, sampleRate);
      const data = localBuffer.getChannelData(0);
      for (let i = 0; i < frameCount; i++) {
        const time = i / sampleRate;
        let amplitude = 0.5;
        if (envelope) { // Simple linear decay envelope
          amplitude *= Math.max(0, 1 - (i / frameCount));
        }
        if (waveType === 'sine') {
          data[i] = Math.sin(2 * Math.PI * freq * time) * amplitude;
        } else if (waveType === 'square') {
          data[i] = (Math.sin(2 * Math.PI * freq * time) > 0 ? 1 : -1) * amplitude;
        } else if (waveType === 'sawtooth') {
            data[i] = (2 * (time * freq - Math.floor(0.5 + time * freq))) * amplitude;
        } else if (waveType === 'triangle') {
            data[i] = (2 * Math.abs(2 * (time * freq - Math.floor(time * freq + 0.5))) - 1) * amplitude;
        } else { // Noise for 'noise' or other unhandled OscillatorTypes
            data[i] = (Math.random() * 2 - 1) * amplitude;
        }
      }
      return localBuffer;
    };
    
    const createArpeggio = (baseFreq: number, intervals: number[], noteDuration: number, totalDuration: number) => {
        const frameCount = sampleRate * totalDuration;
        const localBuffer = this.audioContext!.createBuffer(1, frameCount, sampleRate);
        const data = localBuffer.getChannelData(0);
        let currentNote = 0;
        let noteTime = 0;

        for (let i = 0; i < frameCount; i++) {
            const time = i / sampleRate;
            if (noteTime >= noteDuration) {
                currentNote = (currentNote + 1) % intervals.length;
                noteTime = 0;
            }
            const freq = baseFreq * Math.pow(2, intervals[currentNote] / 12);
            const amplitude = 0.2 * (1 - (noteTime / noteDuration)); // envelope per note
            data[i] = Math.sin(2 * Math.PI * freq * time) * amplitude;
            noteTime += 1 / sampleRate;
        }
        return localBuffer;
    };


    switch (type) {
      // SFX
      case 'ui_click': buffer = createTone(1200, 0.05, 'square'); break;
      case 'player_shoot': buffer = createTone(800, 0.1, 'sawtooth'); break;
      case 'player_jump': buffer = createTone(400, 0.15, 'sine'); break; 
      case 'player_hit': buffer = createTone(200, 0.15, 'noise'); break;
      case 'level_up': buffer = createArpeggio(440, [0, 4, 7, 12], 0.1, 0.5); break;
      case 'enemy_hit': buffer = createTone(150, 0.15, 'noise'); break;
      case 'enemy_shoot': buffer = createTone(600, 0.1, 'sawtooth'); break;
      case 'enemy_death': buffer = createTone(300, 0.2, 'noise'); break; 
      case 'explosion': buffer = createTone(100, 0.4, 'noise', false); break; 
      case 'barrier_break': buffer = createTone(1500, 0.2, 'noise'); break;
      case 'orb_collect': buffer = createTone(1000, 0.1, 'sine'); break;
      case 'shop_purchase': buffer = createArpeggio(600, [0, 7], 0.08, 0.2); break;
      case 'game_over': buffer = createArpeggio(300, [0, -5, -10], 0.2, 0.8); break;

      // Music (simple looping tones for now)
      case 'main_menu': 
        duration = 2.0; // Longer for music loop
        buffer = createArpeggio(110, [0, 3, 7, 10], 0.5, duration); // A minor-ish feel
        break;
      case 'gameplay': 
        duration = 2.0;
        buffer = createArpeggio(130.81, [0, 4, 7, 12, 7, 4], 0.33, duration); // C Major arpeggio, more upbeat
        break;
      default: buffer = createTone(440, 0.1); break; // Default A4 note
    }
    return buffer;
  }

  private async generateAllPlaceholderSounds(): Promise<void> {
    for (const type of SFX_TYPES) {
      const buffer = this.createPlaceholderSoundBuffer(type);
      if (buffer) this.soundBuffers.set(type, buffer);
    }
    for (const type of MUSIC_TYPES) {
      const buffer = this.createPlaceholderSoundBuffer(type);
      if (buffer) this.soundBuffers.set(type, buffer);
    }
  }

  public playSound(name: SoundEffectType, options: PlaySoundOptions = {}): void {
    if (!this.audioContext || !this.sfxGain || !this.soundBuffers.has(name) || (this.isMuted && name !== 'ui_click')) return;
    // Allow ui_click even if muted for essential feedback on settings screen
    if (this.isMuted && name !== 'ui_click') return;


    const source = this.audioContext.createBufferSource();
    source.buffer = this.soundBuffers.get(name) as AudioBuffer;
    
    const individualGain = this.audioContext.createGain();
    individualGain.gain.value = options.volume ?? 1.0;
    source.connect(individualGain);
    individualGain.connect(this.sfxGain);

    if (options.playbackRate) {
        source.playbackRate.value = options.playbackRate;
    }
    source.loop = options.loop ?? false;
    source.start();
  }

 public playMusic(name: MusicTrackType, options: PlayMusicOptions = {}): void {
    if (!this.audioContext || !this.musicGain || !this.soundBuffers.has(name)) return;

    this.stopMusic(name, 0); // Stop if already playing, no fadeout before new start

    const source = this.audioContext.createBufferSource();
    source.buffer = this.soundBuffers.get(name) as AudioBuffer;
    source.loop = options.loop ?? true;

    const individualMusicGain = this.audioContext.createGain();
    source.connect(individualMusicGain);
    individualMusicGain.connect(this.musicGain);

    this.musicSources.set(name, { source: source, gain: individualMusicGain });
    
    let effectiveVolume = (options.volume ?? 1.0);
    if (this.isMuted) effectiveVolume = 0;

    if (options.fadeInDuration && options.fadeInDuration > 0 && this.audioContext.currentTime > 0) {
        individualMusicGain.gain.setValueAtTime(0, this.audioContext.currentTime);
        individualMusicGain.gain.linearRampToValueAtTime(effectiveVolume, this.audioContext.currentTime + options.fadeInDuration);
    } else {
        individualMusicGain.gain.setValueAtTime(effectiveVolume, this.audioContext.currentTime);
    }
    
    source.start();
  }

  public stopMusic(name: MusicTrackType, fadeOutDuration: number = 0.5): void {
    if (!this.audioContext) return;
    const musicTrack = this.musicSources.get(name);
    if (musicTrack) {
        const { source, gain: individualGain } = musicTrack;
        if (fadeOutDuration > 0 && this.audioContext.currentTime > 0) {
            individualGain.gain.setValueAtTime(individualGain.gain.value, this.audioContext.currentTime);
            individualGain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + fadeOutDuration);
            setTimeout(() => {
                try { source.stop(); } catch(e) { /* ignore if already stopped */ }
            }, fadeOutDuration * 1000 + 50); // Add a small delay to ensure ramp completes
        } else {
            try { source.stop(); } catch(e) { /* ignore if already stopped */ }
        }
        this.musicSources.delete(name);
    }
  }
  
  public stopAllMusic(fadeOutDuration: number = 0.5): void {
    this.musicSources.forEach((_, name) => {
        this.stopMusic(name, fadeOutDuration);
    });
  }

  public setMasterVolume(volume: number): void {
    this.preMuteVolumes.master = Math.max(0, Math.min(1, volume));
    if (this.masterGain && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(this.preMuteVolumes.master, this.audioContext?.currentTime ?? 0);
    }
  }

  public setMusicVolume(volume: number): void {
     this.preMuteVolumes.music = Math.max(0, Math.min(1, volume));
    if (this.musicGain && !this.isMuted) {
      this.musicGain.gain.setValueAtTime(this.preMuteVolumes.music, this.audioContext?.currentTime ?? 0);
    }
  }

  public setSfxVolume(volume: number): void {
    this.preMuteVolumes.sfx = Math.max(0, Math.min(1, volume));
    if (this.sfxGain && !this.isMuted) {
      this.sfxGain.gain.setValueAtTime(this.preMuteVolumes.sfx, this.audioContext?.currentTime ?? 0);
    }
  }

  public toggleMute(mute: boolean): void {
    this.isMuted = mute;
    if (!this.audioContext || !this.masterGain || !this.musicGain || !this.sfxGain) return;

    if (this.isMuted) {
        // Store current actual gain values before setting to 0 if needed
        // This is mostly handled by preMuteVolumes now
        this.masterGain.gain.setValueAtTime(0, this.audioContext.currentTime);
    } else {
        this.masterGain.gain.setValueAtTime(this.preMuteVolumes.master, this.audioContext.currentTime);
        this.musicGain.gain.setValueAtTime(this.preMuteVolumes.music, this.audioContext.currentTime);
        this.sfxGain.gain.setValueAtTime(this.preMuteVolumes.sfx, this.audioContext.currentTime);
    }
  }
  
  public getIsInitialized(): boolean {
    return this.isInitialized;
  }
}
