
class SoundManager {
    private ctx: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private enabled: boolean = true;

    // BGM State
    private currentBgmMode: 'NONE' | 'LOBBY' | 'NORMAL' | 'DANGER' | 'VICTORY' = 'NONE';
    private nextNoteTime: number = 0;
    private current16thNote: number = 0;
    private tempo: number = 110;
    private lookahead: number = 25.0; // ms
    private scheduleAheadTime: number = 0.1; // s
    private timerID: number | null = null;
    private isPlayingBgm: boolean = false;

    constructor() {
        try {
            // Check if browser supports AudioContext
            const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
            if (AudioContextClass) {
                this.ctx = new AudioContextClass();
                this.masterGain = this.ctx.createGain();
                this.masterGain.gain.value = 0.1; // Default volume lowered for BGM mixing
                this.masterGain.connect(this.ctx.destination);
            }
        } catch (e) {
            console.warn("Web Audio API not supported", e);
        }
    }

    private ensureContext() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // --- BGM Engine ---

    public startBGM(mode: 'LOBBY' | 'NORMAL' | 'DANGER') {
        if (this.currentBgmMode === mode && this.isPlayingBgm) return;

        this.ensureContext();
        this.currentBgmMode = mode;
        this.isPlayingBgm = true;

        // Reset timing if starting fresh, otherwise smooth transition
        if (this.timerID === null) {
            this.nextNoteTime = this.ctx?.currentTime || 0;
            this.current16thNote = 0;
            this.timerID = window.setInterval(() => this.scheduler(), this.lookahead);
        }
    }

    public stopBGM() {
        this.isPlayingBgm = false;
        this.currentBgmMode = 'NONE';
        if (this.timerID !== null) {
            window.clearInterval(this.timerID);
            this.timerID = null;
        }
    }

    private scheduler() {
        // while there are notes that will need to play before the next interval, 
        // schedule them and advance the pointer.
        if (!this.ctx) return;
        while (this.nextNoteTime < (this.ctx.currentTime + this.scheduleAheadTime)) {
            this.scheduleNote(this.current16thNote, this.nextNoteTime);
            this.nextNote();
        }
    }

    private nextNote() {
        const secondsPerBeat = 60.0 / this.tempo;
        this.nextNoteTime += 0.25 * secondsPerBeat; // Add 1/4th of a beat length to time
        this.current16thNote++;
        if (this.current16thNote === 16) {
            this.current16thNote = 0;
        }
    }

    private scheduleNote(beatNumber: number, time: number) {
        if (!this.enabled || !this.isPlayingBgm) return;

        // Set Tempo based on mode
        if (this.currentBgmMode === 'LOBBY') this.tempo = 90;
        else if (this.currentBgmMode === 'NORMAL') this.tempo = 110;
        else if (this.currentBgmMode === 'DANGER') this.tempo = 135;

        // --- Bass / Kick (Rhythm) ---
        if (beatNumber % 4 === 0) {
            // Kick on 1, 5, 9, 13
            this.playKick(time);
        }

        // --- HiHat / Percussion ---
        if (this.currentBgmMode !== 'LOBBY') {
            if (beatNumber % 2 === 0) {
                // 8th notes
                this.playHiHat(time, beatNumber % 4 === 2); // Accent off-beats
            }
        } else {
            // Lobby click
            if (beatNumber % 8 === 0) this.playHiHat(time, false);
        }

        // --- Melody / Bass Line ---
        const rootFreq = this.currentBgmMode === 'DANGER' ? 55 : (this.currentBgmMode === 'LOBBY' ? 65.41 : 82.41); // A1 / C2 / E2

        // Simple Arpeggio pattern
        // Pattern: 0 - - 2 - - 4 - 5 - 
        // const scale = [1, 1.2, 1.5, 1.6]; // Major-ish intervals

        if (this.currentBgmMode === 'NORMAL' || this.currentBgmMode === 'DANGER') {
            if (beatNumber % 2 === 0) { // 8th note bass line
                // Rolling bass
                // Check sequence based on 16th note index (0-15)
                // 0..3: Root
                // 4..7: Root
                // 8..11: Fifth? Or IV?

                // Simple V-I
                const pitch = beatNumber < 8 ? rootFreq : (beatNumber < 12 ? rootFreq * 1.5 : rootFreq * 1.33);
                this.playBassNote(pitch, time, 0.15);
            }
        }

        if (this.currentBgmMode === 'LOBBY') {
            // Dreamy ambient chords
            if (beatNumber === 0) this.playPad(rootFreq * 2, time, 4);
            if (beatNumber === 8) this.playPad(rootFreq * 1.5, time, 4);
        }

        if (this.currentBgmMode === 'DANGER') {
            // Alarm synth
            if (beatNumber % 4 === 2) this.playTone(880, 'sawtooth', 0.05, 0.05, time);
        }
    }

    // --- Synthesizers ---

    private playKick(time: number) {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
        gain.gain.setValueAtTime(0.8, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(time);
        osc.stop(time + 0.5);
    }

    private playHiHat(time: number, open: boolean) {
        if (!this.ctx || !this.masterGain) return;
        // Noise buffer
        const bufferSize = this.ctx.sampleRate * 0.1;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        // Bandpass check
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 5000;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(open ? 0.3 : 0.1, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + (open ? 0.1 : 0.05));

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        noise.start(time);
    }

    private playBassNote(freq: number, time: number, dur: number) {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);

        // Lowpass filter for pluck sound
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, time);
        filter.frequency.exponentialRampToValueAtTime(100, time + dur);

        gain.gain.setValueAtTime(0.3, time);
        gain.gain.linearRampToValueAtTime(0, time + dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        osc.start(time);
        osc.stop(time + dur);
    }

    private playPad(freq: number, time: number, dur: number) {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.1, time + 0.5); // Attack
        gain.gain.linearRampToValueAtTime(0, time + dur); // Release

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(time);
        osc.stop(time + dur);
    }

    // --- Basic Synthesis Helpers (Updated for scheduling) ---

    // Updated helper to accept optional 'when' time
    private playTone(freq: number, type: OscillatorType, duration: number, vol: number = 1.0, when: number = 0) {
        if (!this.ctx || !this.masterGain || !this.enabled) return;
        this.ensureContext();
        const t = when || this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + duration);
    }

    private playNoise(duration: number, vol: number = 1.0) {
        if (!this.ctx || !this.masterGain || !this.enabled) return;
        this.ensureContext();

        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        noise.connect(gain);
        gain.connect(this.masterGain);

        noise.start();
    }

    // --- Public SFX Methods ---

    public playHover() {
        // High tech blip
        this.playTone(800, 'sine', 0.05, 0.1);
    }

    public playClick() {
        // Confirmation beep
        this.playTone(1200, 'square', 0.1, 0.2);
    }

    public playDeny() {
        // Error buzz
        this.playTone(150, 'sawtooth', 0.3, 0.3);
    }

    public playSelect() {
        // Selection sound
        this.playTone(600, 'triangle', 0.1, 0.2);
    }

    public playDeploy() {
        // Mechanical deploy sound (using noise burst + tone)
        this.playTone(200, 'sawtooth', 0.2, 0.3);

        // Manual noise burst since playNoise uses currentTime
        if (!this.ctx || !this.masterGain || !this.enabled) return;
        const bufferSize = this.ctx.sampleRate * 0.2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
        noise.connect(gain);
        gain.connect(this.masterGain);
        noise.start();
    }

    public playMove() {
        // Servo motor sound
        if (!this.ctx || !this.masterGain || !this.enabled) return;
        this.ensureContext();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(200, this.ctx.currentTime + 0.3);

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    }

    public playAttack(type: 'GUN' | 'CANNON' | 'MISSILE' | 'LASER') {
        if (!this.ctx || !this.masterGain || !this.enabled) return;
        this.ensureContext();

        switch (type) {
            case 'GUN': // Machine gun burst
                this.playNoise(0.1, 0.3);
                setTimeout(() => this.playNoise(0.1, 0.2), 100);
                setTimeout(() => this.playNoise(0.1, 0.1), 200);
                break;
            case 'CANNON': // Deep boom
                this.playNoise(0.5, 0.8);
                this.playTone(60, 'square', 0.4, 0.5);
                break;
            case 'MISSILE': // Whistle + Boom
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.frequency.setValueAtTime(400, this.ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.5);
                gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
                gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
                osc.connect(gain);
                gain.connect(this.masterGain!);
                osc.start();
                osc.stop(this.ctx.currentTime + 0.5);

                setTimeout(() => this.playExplosion(), 400);
                break;
        }
    }

    public playExplosion() {
        // Deep rumble
        if (!this.ctx || !this.masterGain || !this.enabled) return;
        this.ensureContext();

        // Low pass filter for muffling the noise
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 1.0);

        const bufferSize = this.ctx.sampleRate * 1.0;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(1.0, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 1.0);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        noise.start();
    }

    public playWin() {
        // Victory fanfare major chord
        this.stopBGM(); // Stop sequence
        this.playTone(523.25, 'triangle', 0.5); // C5
        setTimeout(() => this.playTone(659.25, 'triangle', 0.5), 200); // E5
        setTimeout(() => this.playTone(783.99, 'triangle', 0.8), 400); // G5
        setTimeout(() => this.playTone(1046.50, 'square', 1.0), 600); // C6
    }
}

export const sfx = new SoundManager();
