"""Mixagem do comercial v2: monta a narração por segmentos e reaproveita a trilha/efeitos sintetizados do v1."""
import importlib.util
import json
import os
import subprocess

import numpy as np
from scipy.io import wavfile

DIR = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('base', os.path.join(DIR, '..', '..', 'video-chuvas', 'audio', 'mixar.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
CFG = json.load(open(os.path.join(DIR, '..', 'roteiro.json'), encoding='utf-8'))
m.CFG, m.DUR = CFG, CFG['duracao']
m.N = int(m.DUR * m.SR)
SR, N = m.SR, m.N


def decode(f):
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', os.path.join(DIR, f), '-ac', '1', '-ar', str(SR),
                          '-af', 'highpass=f=80,acompressor=threshold=-20dB:ratio=3:attack=5:release=120,equalizer=f=3200:t=q:w=1.2:g=2.5',
                          '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def voice_track():
    cache, out = {}, np.zeros(N, dtype=np.float32)
    for s in CFG['voz_segmentos']:
        v = cache.setdefault(s['arq'], decode(s['arq']))
        v = v / (np.abs(v).max() + 1e-9)
        seg = v[int(s['de'] * SR):int(s['ate'] * SR)].copy()
        f = int(0.015 * SR)
        seg[:f] *= np.linspace(0, 1, f); seg[-f:] *= np.linspace(1, 0, f)
        p = int(s['em'] * SR)
        out[p:p + len(seg)] += seg[:N - p]
    return out / (np.abs(out).max() + 1e-9) * 0.95


def main():
    voz = voice_track()
    fx = np.zeros(N)
    m.place(fx, m.rain(), 0.0, 0.55)
    m.place(fx, m.thunder(), 0.18, 0.75)
    for c in CFG['cortes']:
        m.place(fx, m.whoosh(0.45), max(0, c['t'] - 0.4), 0.16)
        if c.get('impacto'):
            m.place(fx, m.impact(c['impacto']), c['t'], 0.55)
    d0, d1 = CFG['drone']
    m.place(fx, m.drone_pass(d1 - d0), d0, 0.13)
    mus = m.music()
    mus[:int(0.22 * SR)] = 0  # quebra de padrão: 0,2 s de silêncio antes do trovão
    v, bed = m.mix_parts(voz, mus, fx)
    bed = bed * 0.68
    mix = np.tanh((v + bed) * 1.1) / 1.1
    mix = mix / np.abs(mix).max() * 0.89
    tmp = os.path.join(DIR, 'mix_bruto.wav')
    wavfile.write(tmp, SR, mix.astype(np.float32))
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', tmp, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=9', '-ar', str(SR), '-ac', '2',
                    os.path.join(DIR, 'mix.wav')], check=True)
    os.remove(tmp)
    db = lambda x: 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
    for a, b in [(0.3, 11), (11, 21.7), (22, 27.3), (27.6, 33.6), (34, 35.9)]:
        s, e = int(a * SR), int(b * SR)
        print(f'{a:5.1f}-{b:5.1f}s  margem voz/fundo {db(v[s:e]) - db(bed[s:e]):5.1f} dB')
    print('ok mix.wav', m.DUR, 's')


if __name__ == '__main__':
    main()
