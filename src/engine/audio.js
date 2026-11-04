export class AudioEngine {
  constructor() { this.volume = 0.3; }
  async unlock() {
    try {
      if (!this.context) {
        const Audio = window.AudioContext || window.webkitAudioContext;
        this.context = new Audio();
        this.master = this.context.createGain(); this.master.gain.value = this.volume; this.master.connect(this.context.destination);
      }
      await this.context.resume();
    } catch {}
  }
  setVolume(n) { this.volume = n; if (this.master) this.master.gain.value = n; }
  tone(frequency = 440, seconds = 0.3, type = 'sine', volume = 0.3, delay = 0) {
    if (!this.context || this.context.state !== 'running') return;
    const c = this.context, t = c.currentTime + delay;
    const oscillator = c.createOscillator(), gain = c.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, t);
    gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(volume, t + 0.02); gain.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
    oscillator.connect(gain); gain.connect(this.master); oscillator.start(t); oscillator.stop(t + seconds + 0.03);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
  chime() { [523, 659, 784].forEach((f, i) => this.tone(f, 0.6, 'sine', 0.23, i * 0.14)); }
  effect(id) {
    if (id === 'bell') { [220, 441, 665, 883].forEach(f => this.tone(f, 3, 'sine', 0.25)); }
    else if (id === 'parrot' || id === 'wave') { this.tone(950, 0.2); this.tone(1300, 0.25, 'sine', 0.15, 0.16); }
    else if (id === 'coffee' || id === 'water') { this.tone(170, 0.6, 'triangle', 0.18); this.tone(350, 0.2, 'sine', 0.1, 0.5); }
    else this.tone(440, 0.15, 'triangle', 0.1);
  }
  setRoom(id, season = 'autumn') { this.room = id; this.season = season; this.nextAmbient = 0; }
  update(time, running = false) {
    if (!this.context || time < this.nextAmbient) return;
    this.nextAmbient = time + (running ? 0.7 : 2 + Math.random() * 3);
    if (running) this.tone(54, 0.5, 'triangle', 0.08);
    else if (this.room === 'jungle' || this.room === 'meadow') { this.tone(1000 + Math.random() * 700, 0.18, 'sine', 0.04); this.tone(1600, 0.1, 'sine', 0.03, 0.2); }
    else if (this.room === 'deepsea' || this.room === 'submarine') this.tone(90, 2, 'sine', 0.09);
    else if (this.season === 'summer') this.tone(3400, 0.8, 'triangle', 0.025);
    else this.tone(140, 1.5, 'sine', 0.025);
  }
  dispose() { this.context?.close(); }
}
