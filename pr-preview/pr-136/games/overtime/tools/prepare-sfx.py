"""Trim and level a new sound pick before adding it to dist/assets/sfx/.

Not part of the build. The files in dist/assets/sfx/ are the canonical game sounds;
this only prepares new ones the same way the Nov 7 sounds were prepared.

usage: python3 tools/prepare-sfx.py IN.mp3 OUT.mp3 [--max SECONDS] [--part N]
  --max   longest the sound may be after its start (default 0.8 s)
  --part  for a file with several separate sounds in it (like two "ahh" takes), which one to keep (1 = first)
Needs ffmpeg and numpy. Output: mono, 44.1 kHz, 64 kbps mp3, peak at -1 dB, 25 ms fade-out.
"""
import argparse, subprocess, numpy as np

SR = 44100
ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('dst')
ap.add_argument('--max', type=float, default=.8); ap.add_argument('--part', type=int, default=1)
a = ap.parse_args()

raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', a.src, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'],
                     capture_output=True, check=True).stdout
x = np.frombuffer(raw, np.float32).copy()

# Find separate sounds: 10 ms windows louder than 3% of the loudest, split on gaps over 0.18 s.
w = 441; n = len(x) // w
env = np.sqrt((x[:n * w].reshape(n, w) ** 2).mean(1)); on = env > env.max() * .03
parts = []; i = 0; gap = int(.18 * SR / w)
while i < len(on):
    if not on[i]: i += 1; continue
    j = last = i
    while j < len(on) and j - last <= gap:
        if on[j]: last = j
        j += 1
    parts.append((i * w, (last + 1) * w)); i = j
start, end = parts[a.part - 1]
start = max(0, start - int(.01 * SR))
end = min(len(x), end + int(.06 * SR), start + int(a.max * SR))
y = x[start:end].copy()
fade = int(.025 * SR)
if len(y) > fade: y[-fade:] *= np.linspace(1, 0, fade)
y[:64] *= np.linspace(0, 1, 64)
y *= 10 ** (-1 / 20) / (np.abs(y).max() or 1)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-b:a', '64k', a.dst],
               input=y.astype(np.float32).tobytes(), check=True)
print(f'{a.dst}: {len(y) / SR:.2f} s from part {a.part} of {len(parts)}')
