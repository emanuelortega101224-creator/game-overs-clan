// Lightweight synthesized sound effects via Web Audio API.
// No external assets required.

type SoundKind = "click" | "message" | "toast" | "success" | "error";

let ctx: AudioContext | null = null;
let enabled = true;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  } catch { return null; }
}

function tone(freq: number, dur: number, type: OscillatorType = "sine", gain = 0.08, delay = 0) {
  const c = getCtx();
  if (!c || !enabled) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export function playSound(kind: SoundKind) {
  switch (kind) {
    case "click":
      tone(680, 0.06, "square", 0.05);
      break;
    case "message":
      tone(880, 0.08, "sine", 0.07);
      tone(1320, 0.1, "sine", 0.05, 0.05);
      break;
    case "toast":
      tone(520, 0.08, "triangle", 0.06);
      tone(780, 0.1, "triangle", 0.05, 0.05);
      break;
    case "success":
      tone(523, 0.1, "triangle", 0.08);
      tone(659, 0.1, "triangle", 0.08, 0.08);
      tone(880, 0.18, "triangle", 0.08, 0.16);
      break;
    case "error":
      tone(220, 0.12, "sawtooth", 0.06);
      tone(180, 0.18, "sawtooth", 0.06, 0.1);
      break;
  }
}

export function setSoundEnabled(v: boolean) { enabled = v; try { localStorage.setItem("sfx", v ? "1" : "0"); } catch {} }
export function isSoundEnabled() {
  if (typeof window === "undefined") return true;
  try { return localStorage.getItem("sfx") !== "0"; } catch { return true; }
}

// Unlock audio context on first user gesture so explicit playSound() calls
// (e.g. login) work without delay. No global click sounds.
if (typeof window !== "undefined") {
  enabled = isSoundEnabled();
  let armed = false;
  const arm = () => {
    if (armed) return;
    armed = true;
    getCtx();
  };
  window.addEventListener("pointerdown", arm, { once: true });
}
