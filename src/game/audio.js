/**
 * Procedural WebAudio sound effects & night ambience (no external audio assets needed).
 */
export function createAudioEngine(initialVolume = 0.65) {
  let ctx = null;
  let masterGain = null;
  let ambientOsc = null;
  let volume = initialVolume;

  function ensureContext() {
    if (ctx) {
      if (ctx.state === "suspended") ctx.resume();
      return ctx;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    ctx = new AudioCtx();
    masterGain = ctx.createGain();
    masterGain.gain.value = volume;
    masterGain.connect(ctx.destination);
    startAmbience();
    return ctx;
  }

  function startAmbience() {
    if (!ctx || ambientOsc) return;
    ambientOsc = ctx.createOscillator();
    const ambGain = ctx.createGain();
    ambientOsc.type = "sine";
    ambientOsc.frequency.value = 110;
    ambGain.gain.value = 0.04;
    ambientOsc.connect(ambGain);
    ambGain.connect(masterGain);
    ambientOsc.start();
  }

  function setVolume(nextVol) {
    volume = Math.min(1, Math.max(0, nextVol));
    if (masterGain && ctx) {
      masterGain.gain.setTargetAtTime(volume, ctx.currentTime, 0.02);
    }
  }

  function playTone(freq, duration, type = "sine", gainVal = 0.18, endFreq = null) {
    const audio = ensureContext();
    if (!audio || volume <= 0.001) return;
    const now = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    }
    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + duration);
  }

  const sfx = {
    unlock: () => ensureContext(),
    setVolume,
    pickup: () => playTone(660, 0.12, "sine", 0.16, 990),
    lantern: () => {
      playTone(440, 0.25, "triangle", 0.2, 660);
      setTimeout(() => playTone(660, 0.35, "sine", 0.18, 880), 90);
    },
    pulse: () => playTone(520, 0.32, "triangle", 0.24, 180),
    hit: () => playTone(160, 0.28, "sawtooth", 0.22, 65),
    jump: () => playTone(280, 0.14, "sine", 0.12, 460),
    dash: () => playTone(420, 0.14, "triangle", 0.15, 760),
    slash: () => playTone(740, 0.16, "triangle", 0.2, 290),
    shadeSpawn: () => playTone(130, 0.35, "sawtooth", 0.12, 95),
    countdown: () => playTone(880, 0.09, "square", 0.08),
    windWarn: () => playTone(320, 0.45, "sine", 0.12, 220),
    win: () => {
      playTone(523, 0.22, "triangle", 0.2);
      setTimeout(() => playTone(659, 0.22, "triangle", 0.2), 140);
      setTimeout(() => playTone(784, 0.4, "triangle", 0.22), 280);
    },
    lose: () => {
      playTone(260, 0.28, "sawtooth", 0.16, 190);
      setTimeout(() => playTone(185, 0.45, "sawtooth", 0.16, 110), 200);
    }
  };

  return sfx;
}
