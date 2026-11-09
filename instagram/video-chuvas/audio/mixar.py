"""Trilha, efeitos e mixagem do comercial "Choveu na sua fazenda" (Liber Drones).

Gera a trilha instrumental e os efeitos sonoros por síntese (sem samples externos),
aplica ducking da música sob a narração e exporta mix.wav.
Uso: python3 instagram/video-chuvas/audio/mixar.py
"""
import json
import os
import subprocess

import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
DIR = os.path.dirname(os.path.abspath(__file__))
CFG = json.load(open(os.path.join(DIR, '..', 'roteiro.json'), encoding='utf-8'))
DUR = CFG['duracao']
VOZ_OFFSET = CFG['voz_offset']
N = int(DUR * SR)
rng = np.random.default_rng(7)
t_all = np.arange(N) / SR


def load_voice():
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', os.path.join(DIR, CFG['voz']), '-ac', '1', '-ar', str(SR),
                          '-af', 'highpass=f=80,acompressor=threshold=-20dB:ratio=3:attack=5:release=120,equalizer=f=3200:t=q:w=1.2:g=2.5',
                          '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    v = np.frombuffer(raw, dtype=np.float32).copy()
    out = np.zeros(N, dtype=np.float32)
    s = int(VOZ_OFFSET * SR)
    out[s:s + len(v)] = v[:N - s]
    return out / (np.abs(out).max() + 1e-9) * 0.95


def env_adsr(n, a, r):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return e


def place(buf, x, at, gain=1.0):
    s = int(at * SR)
    if s >= N: return
    x = x[:N - s]
    buf[s:s + len(x)] += x * gain


def lp(x, f, order=2):
    b, a = signal.butter(order, f / (SR / 2), 'low')
    return signal.lfilter(b, a, x)


def hp(x, f, order=2):
    b, a = signal.butter(order, f / (SR / 2), 'high')
    return signal.lfilter(b, a, x)


def bp(x, lo, hi, order=2):
    b, a = signal.butter(order, [lo / (SR / 2), hi / (SR / 2)], 'band')
    return signal.lfilter(b, a, x)


def pink(n):
    w = rng.standard_normal(n)
    b = [0.049922035, -0.095993537, 0.050612699, -0.004408786]
    a = [1, -2.494956002, 2.017265875, -0.522189400]
    return signal.lfilter(b, a, w)


# ---------- efeitos ----------
def rain():
    n = int(8.5 * SR)
    bed = bp(pink(n), 400, 9000) * 1.6
    bed += hp(rng.standard_normal(n), 3000) * 0.06
    # gotas: cliques curtos filtrados
    drops = np.zeros(n)
    for _ in range(2600):
        p = rng.integers(0, n - 400)
        L = rng.integers(60, 300)
        drops[p:p + L] += rng.standard_normal(L) * np.exp(-np.linspace(0, 6, L)) * rng.uniform(0.05, 0.4)
    drops = bp(drops, 1200, 8000)
    x = bed + drops
    e = np.ones(n)
    e[:int(0.05 * SR)] = np.linspace(0, 1, int(0.05 * SR))
    fo0, fo1 = int(5.6 * SR), int(8.4 * SR)
    e[fo0:fo1] = np.linspace(1, 0, fo1 - fo0)
    e[fo1:] = 0
    return x * e / (np.abs(x).max() + 1e-9)


def thunder():
    n = int(3.2 * SR)
    x = lp(pink(n), 180, 3) * 4
    x += lp(rng.standard_normal(n), 900) * np.exp(-np.linspace(0, 12, n)) * 0.6
    e = np.exp(-np.linspace(0, 3.5, n)) * (1 - np.exp(-np.linspace(0, 40, n)))
    return x * e / (np.abs(x * e).max() + 1e-9)


def impact(strength=1.0):
    n = int(1.6 * SR)
    tt = np.arange(n) / SR
    f = 120 * np.exp(-tt * 9) + 38
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 3.2)
    click = hp(rng.standard_normal(n), 2500) * np.exp(-tt * 60) * 0.35
    body = lp(rng.standard_normal(n), 600) * np.exp(-tt * 14) * 0.5
    x = boom + click + body
    return x / np.abs(x).max() * strength


def whoosh(d=0.55, rise=True):
    n = int(d * SR)
    x = rng.standard_normal(n)
    out = np.zeros(n)
    seg = 512
    for i in range(0, n, seg):
        p = i / n
        fc = 300 + (4500 if rise else -4500) * (p if rise else p - 1)
        fc = np.clip(fc if rise else 4800 - 4500 * p, 200, 9000)
        b, a = signal.butter(2, [fc * 0.6 / (SR / 2), min(fc * 1.6, 23000) / (SR / 2)], 'band')
        out[i:i + seg] = signal.lfilter(b, a, x[i:i + seg])
    e = np.sin(np.linspace(0, np.pi, n)) ** 2
    if rise:
        e *= np.linspace(0.3, 1, n)
    y = out * e
    return y / (np.abs(y).max() + 1e-9)


def drone_pass(d):
    n = int(d * SR)
    tt = np.arange(n) / SR
    dop = 1 + 0.035 * np.tanh((tt - d / 2) * 1.8) * -1
    out = np.zeros(n)
    for f0, g in [(165, 1.0), (212, 0.7), (248, 0.5)]:
        ph = 2 * np.cumsum(np.pi * f0 * dop) / SR
        saw = signal.sawtooth(ph)
        out += saw * g
    out = lp(out, 2200) + bp(rng.standard_normal(n), 300, 1800) * 0.35
    am = 1 + 0.15 * np.sin(2 * np.pi * 31 * tt)
    e = env_adsr(n, 1.2, 1.5) * (0.6 + 0.4 * np.exp(-((tt - d / 2) ** 2) / (2 * (d / 4) ** 2)))
    y = out * am * e
    return y / np.abs(y).max()


# ---------- música (Ré menor, 96 BPM) ----------
BPM = 96
BEAT = 60 / BPM


def note(freq, d, kind='pad'):
    n = int(d * SR)
    tt = np.arange(n) / SR
    if kind == 'pad':
        x = sum(signal.sawtooth(2 * np.pi * freq * dt * tt) for dt in (0.995, 1.0, 1.006))
        x = lp(x, 1400)
        return x * env_adsr(n, min(1.2, d / 3), min(1.5, d / 3)) * 0.33
    if kind == 'bass':
        x = np.sin(2 * np.pi * freq * tt) + 0.3 * signal.sawtooth(2 * np.pi * freq * tt)
        return lp(x, 500) * np.exp(-tt * 2.2) * env_adsr(n, 0.005, 0.05)
    if kind == 'pluck':
        x = signal.square(2 * np.pi * freq * tt, 0.3) * np.exp(-tt * 9)
        return lp(x, 3500) * env_adsr(n, 0.002, 0.03) * 0.5
    if kind == 'sub':
        return np.sin(2 * np.pi * freq * tt) * env_adsr(n, 0.4, 0.8)


def kick():
    n = int(0.45 * SR)
    tt = np.arange(n) / SR
    f = 150 * np.exp(-tt * 28) + 45
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 7)


def hat():
    n = int(0.08 * SR)
    return hp(rng.standard_normal(n), 7000) * np.exp(-np.linspace(0, 8, n)) * 0.25


def snare():
    n = int(0.3 * SR)
    tt = np.arange(n) / SR
    return (bp(rng.standard_normal(n), 1500, 8000) * np.exp(-tt * 16) + np.sin(2 * np.pi * 190 * tt) * np.exp(-tt * 25) * 0.6) * 0.6


def hz(m): return 440 * 2 ** ((m - 69) / 12)


def music():
    m = np.zeros(N)
    # acordes: Dm - Bb - F - C (raízes MIDI)
    prog = [(50, [62, 65, 69]), (46, [58, 62, 65]), (53, [60, 65, 69]), (48, [60, 64, 67])]
    bar = 4 * BEAT
    t0_build = CFG['musica']['crescimento']
    t_end = CFG['musica']['final']
    # pad e sub o tempo todo
    t = 0.0
    i = 0
    while t < DUR:
        root, ch = prog[i % 4]
        d = min(bar, DUR - t) + 0.6
        for k in ch:
            place(m, note(hz(k), d, 'pad'), t, 0.22 if t < t0_build else 0.3)
        place(m, note(hz(root - 12), d, 'sub'), t, 0.25)
        t += bar
        i += 1
    # tensão: pulso grave em colcheias antes do crescimento
    t = 0.0
    while t < t0_build:
        place(m, note(hz(38), BEAT / 2, 'bass'), t, 0.32)
        t += BEAT / 2
    # crescimento: bateria, baixo e arpejo
    t = t0_build
    step = 0
    while t < t_end:
        bi = int((t - 0) / bar) % 4
        root, ch = prog[bi]
        if step % 4 == 0: place(m, kick(), t, 0.85)
        if step % 8 == 4: place(m, snare(), t, 0.45)
        place(m, hat(), t + BEAT / 4, 0.6)
        if step % 2 == 0: place(m, note(hz(root - 12), BEAT, 'bass'), t, 0.45)
        arp = [ch[0], ch[1], ch[2], ch[1] + 12][step % 4]
        place(m, note(hz(arp + 12), BEAT / 2, 'pluck'), t, 0.16)
        t += BEAT / 2
        step += 1
    # final: acorde resolvido longo
    for k in [50, 57, 62, 65, 69, 74]:
        place(m, note(hz(k), DUR - t_end + 0.5, 'pad'), t_end, 0.22)
    place(m, impact(0.8), t_end, 0.5)
    m = lp(m, 9000)
    fade = np.ones(N)
    fl = int(1.2 * SR)
    fade[-fl:] = np.linspace(1, 0, fl)
    fade[:int(0.3 * SR)] = np.linspace(0.2, 1, int(0.3 * SR))
    return m * fade


def envelope(x, att=0.02, rel=0.35):
    a = np.abs(x)
    a = signal.lfilter([1 - np.exp(-1 / (SR * att))], [1, -np.exp(-1 / (SR * att))], a)
    out = np.zeros_like(a)
    k = np.exp(-1 / (SR * rel))
    prev = 0.0
    step = 64
    for i in range(0, len(a), step):
        v = a[i:i + step].max()
        prev = v if v > prev else prev * (k ** step)
        out[i:i + step] = prev
    return out


def mix_parts(voz, mus, fx):
    """Ducking: música e efeitos abaixam sob a voz (alvo: voz ~12-15 dB acima do fundo)."""
    ve = envelope(voz)
    k = np.clip(ve / (0.25 * ve.max()), 0, 1)
    k = signal.lfilter([0.004], [1, -0.996], k) / (0.004 / (1 - 0.996))
    k = np.clip(k * 1.6, 0, 1)
    mus_d = mus * (1 - 0.82 * k) * 0.42
    fx_d = fx * (1 - 0.7 * k) * 0.55
    return voz, mus_d + fx_d


def main():
    voz = load_voice()
    fx = np.zeros(N)
    place(fx, rain(), 0.0, 0.55)
    place(fx, thunder(), 0.0, 0.5)
    for c in CFG['cortes']:
        place(fx, whoosh(0.45), max(0, c['t'] - 0.4), 0.16)
        if c.get('impacto'):
            place(fx, impact(c['impacto']), c['t'], 0.55)
    d0, d1 = CFG['drone']
    place(fx, drone_pass(d1 - d0), d0, 0.13)
    mus = music()
    voz, bed = mix_parts(voz, mus, fx)
    mix = voz + bed
    mix = np.tanh(mix * 1.1) / 1.1
    mix = mix / np.abs(mix).max() * 0.89
    out = os.path.join(DIR, 'mix_bruto.wav')
    wavfile.write(out, SR, mix.astype(np.float32))
    wavfile.write(os.path.join(DIR, 'trilha_sem_voz.wav'), SR, (np.tanh((mus * 0.5 + fx * 0.6) * 1.1) * 0.6).astype(np.float32))
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', out, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=9', '-ar', str(SR), '-ac', '2',
                    os.path.join(DIR, 'mix.wav')], check=True)
    os.remove(out)
    print('ok mix.wav', DUR, 's')


if __name__ == '__main__':
    main()
