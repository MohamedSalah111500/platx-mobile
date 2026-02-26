/**
 * Generate small WAV sound effects for the app.
 * Run: node scripts/generate-sounds.js
 */
const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;
const outDir = path.join(__dirname, '..', 'assets', 'sounds');

function writeWav(filePath, samples) {
  const numSamples = samples.length;
  const byteRate = SAMPLE_RATE * 2; // 16-bit mono
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);       // chunk size
  buffer.writeUInt16LE(1, 20);        // PCM
  buffer.writeUInt16LE(1, 22);        // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(2, 32);        // block align
  buffer.writeUInt16LE(16, 34);       // bits per sample

  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < numSamples; i++) {
    const val = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(val * 32767), 44 + i * 2);
  }

  fs.writeFileSync(filePath, buffer);
  console.log(`Created: ${filePath} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

// Short click/tap sound (~30ms)
function genTap() {
  const dur = 0.03;
  const n = Math.floor(SAMPLE_RATE * dur);
  const samples = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 200);
    samples[i] = env * Math.sin(2 * Math.PI * 1800 * t) * 0.4;
  }
  return samples;
}

// Pop sound (~50ms) - for navigation/selection
function genPop() {
  const dur = 0.05;
  const n = Math.floor(SAMPLE_RATE * dur);
  const samples = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const freq = 600 + 800 * Math.exp(-t * 60);
    const env = Math.exp(-t * 80);
    samples[i] = env * Math.sin(2 * Math.PI * freq * t) * 0.35;
  }
  return samples;
}

// Success chime (~200ms) - two rising tones
function genSuccess() {
  const dur = 0.2;
  const n = Math.floor(SAMPLE_RATE * dur);
  const samples = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 12);
    const tone1 = t < 0.1 ? Math.sin(2 * Math.PI * 880 * t) * Math.exp(-t * 30) : 0;
    const tone2 = t >= 0.08 ? Math.sin(2 * Math.PI * 1320 * (t - 0.08)) * Math.exp(-(t - 0.08) * 20) : 0;
    samples[i] = (tone1 + tone2) * 0.3;
  }
  return samples;
}

// Soft swoosh (~60ms) - for screen transitions
function genSwoosh() {
  const dur = 0.06;
  const n = Math.floor(SAMPLE_RATE * dur);
  const samples = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const freq = 400 + 1200 * (t / dur);
    const env = Math.sin(Math.PI * t / dur) * 0.25;
    samples[i] = env * Math.sin(2 * Math.PI * freq * t);
  }
  return samples;
}

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

writeWav(path.join(outDir, 'tap.wav'), genTap());
writeWav(path.join(outDir, 'pop.wav'), genPop());
writeWav(path.join(outDir, 'success.wav'), genSuccess());
writeWav(path.join(outDir, 'swoosh.wav'), genSwoosh());

console.log('\nDone! Sound effects generated in assets/sounds/');
