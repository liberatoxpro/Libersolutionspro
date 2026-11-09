# Comercial "Choveu na sua fazenda" — Liber Drones (9:16)

Arquivo final: `liber-drones-chuvas-9x16.mp4` (1080x1920, 30 fps, 31,5 s, H.264 + AAC, -14,7 LUFS).

## Origem do material
- Narração: ElevenLabs, voz "Bruno Zulian Profissional", modelo eleven_v4 (`audio/voz-take1.mp3`; take alternativa `voz-take2.mp3`).
- Legendas: tempos por palavra da transcrição ElevenLabs Scribe (`roteiro.json`).
- Cenas geradas por IA (ElevenLabs / Seedream 5 Pro): chuva, vista aérea, solo preparado, plantas invasoras, piloto com drone (`cenas/*.jpg`).
- Cenas do site drones.libersolutions.com.br: pulverização, dispersão de sementes, mapeamento (`cenas/site-*.jpg`).
- Trilha e efeitos (chuva, trovão, impactos, whooshes, drone, música em Ré menor): síntese própria em `audio/mixar.py`.

## Regerar
    python3 instagram/video-chuvas/audio/mixar.py
    node instagram/video-chuvas/gerar.js            # vídeo final
    node instagram/video-chuvas/gerar.js --previa   # quadros de prévia em previa/
