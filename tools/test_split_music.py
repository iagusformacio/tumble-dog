#!/usr/bin/env python3
"""Regresiones del fundido cruzado real, con WAV sintético y los siete MP3.

Si no hay ffmpeg se omiten las pruebas de audio: `split_music.py --check` sigue
validando los ficheros sin dependencias. Con ffmpeg también se contrasta la
mezcla contra el original, no solo contra el tamaño de los MP3.
"""
import array
import math
import os
import subprocess
import tempfile
import unittest
import wave

import split_music as split

FFMPEG = split.ffmpeg_bin()


def decode_pcm(path):
    data = subprocess.check_output([FFMPEG, '-v', 'error', '-i', path,
                                    '-ac', '1', '-ar', str(split.SR), '-f', 's16le', '-'])
    samples = array.array('h')
    samples.frombytes(data)
    return samples


class FilterTest(unittest.TestCase):
    def test_rejects_invalid_overlap(self):
        for fade in (0, -0.1, 1, 2):
            with self.assertRaises(ValueError):
                split.loop_filter(2, fade)


@unittest.skipUnless(FFMPEG, 'hace falta ffmpeg para validar la forma de onda')
class CrossfadeTest(unittest.TestCase):
    def test_crossfade_real_with_synthetic_ramp(self):
        # La señal monótona distingue el principio, el final y su mezcla.
        rate, dur, fade = split.SR, 2.0, split.FADE
        with tempfile.TemporaryDirectory() as tmp:
            source, output = (os.path.join(tmp, n) for n in ('in.wav', 'out.wav'))
            samples = array.array('h', (int(4000 + 10000 * i / (rate * dur)) for i in range(int(rate * dur))))
            with wave.open(source, 'wb') as f:
                f.setnchannels(1); f.setsampwidth(2); f.setframerate(rate); f.writeframes(samples.tobytes())
            subprocess.run([FFMPEG, '-hide_banner', '-v', 'error', '-y', '-i', source,
                            '-filter_complex', split.loop_filter(dur), '-map', '[out]',
                            '-c:a', 'pcm_s16le', output], check=True)
            with wave.open(output, 'rb') as f:
                result = array.array('h'); result.frombytes(f.readframes(f.getnframes()))
        self.assertEqual(len(result), round(rate * (dur - fade)))
        # La primera muestra empieza después del tramo que se mezcló al final.
        self.assertAlmostEqual(result[0], samples[round(fade * rate)], delta=3)
        body_length = round((dur - 2 * fade) * rate)
        for u in (0.1, 0.5, 0.9):
            j = int(u * fade * rate)
            expected = (1 - u) * samples[body_length + round(fade * rate) + j] + u * samples[j]
            self.assertAlmostEqual(result[body_length + j], expected, delta=8)
        # El salto fin→inicio es el de una muestra de la señal, no el de un corte.
        self.assertAlmostEqual(result[-1], result[0], delta=8)

    def test_committed_mp3_contains_the_crossfade(self):
        source = split.decode(FFMPEG)
        cuts = split.cut_points(source)
        fade_samples = round(split.FADE * split.SR)
        # Excluir los 12,5 ms extremos: pequeño margen por el filtro de MP3.
        indices = range(100, fade_samples - 100)
        for i, (slug, _) in enumerate(split.SCENES):
            with self.subTest(slug=slug):
                data = decode_pcm(os.path.join(split.OUT_DIR, slug + '.mp3'))
                start = round(cuts[i] * split.SR)
                end = round(cuts[i + 1] * split.SR)
                self.assertAlmostEqual(len(data) / split.SR,
                                       cuts[i + 1] - cuts[i] - split.FADE, delta=0.05)
                # Mezcla lineal esperada antes de la codificación MP3 con pérdida.
                expected = [source[end - fade_samples + j] * (1 - j / fade_samples)
                            + source[start + j] * j / fade_samples for j in indices]
                actual = [data[len(data) - fade_samples + j] for j in indices]
                power = sum(x * x for x in expected)
                error = sum((x - y) ** 2 for x, y in zip(expected, actual))
                self.assertGreater(power, 0, 'una región silenciosa no prueba la mezcla')
                self.assertLess(math.sqrt(error / power), 0.52,
                                'no coincide con la mezcla del principio y el final')


if __name__ == '__main__':
    unittest.main(verbosity=2)
