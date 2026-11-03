// #101: reproducción real del empalme premontado en Chromium.
import { test, expect } from '@playwright/test';

test('el título cruza el límite del bucle sin un valle artificial de silencio', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ body: '', contentType: 'text/css' }));
  await page.addInitScript(() => {
    const NativeAudio = window.Audio;
    window.__audioElements = [];
    window.Audio = function (src) {
      const el = new NativeAudio(src);
      window.__audioElements.push(el);
      return el;
    };
  });
  await page.goto('/');
  await page.waitForFunction(() => window.__tumbleDogAudio && window.__tumbleDog?.g.state === 'title');
  await page.waitForTimeout(600);
  await page.keyboard.press('ArrowRight'); // selección del tema y gesto que desbloquea el audio
  await expect.poll(() => page.evaluate(() => window.__tumbleDogAudio.info().time)).toBeGreaterThan(0.05);
  await page.waitForFunction(() => window.__audioElements[0]?.duration > 10);
  const decoded = await page.evaluate(async () => {
    const el = window.__audioElements[0];
    const bytes = await (await fetch(el.src)).arrayBuffer();
    const context = new OfflineAudioContext(1, 1, 44100);
    const decoded = await context.decodeAudioData(bytes);
    const data = decoded.getChannelData(0), sr = decoded.sampleRate;
    const rms = n => {
      let sum = 0;
      for (let i = 0; i < n; i++) sum += data[i] ** 2 + data[data.length - 1 - i] ** 2;
      return Math.sqrt(sum / (2 * n));
    };
    return { near: rms(Math.round(sr * 0.01)), around: rms(Math.round(sr * 0.05)), duration: decoded.duration };
  });
  expect(decoded.duration).toBeGreaterThan(12);
  expect(decoded.near / decoded.around, 'sin dos fundidos a cero en el punto de repetición').toBeGreaterThan(0.3);
  await page.evaluate(() => {
    const el = window.__audioElements[0];
    el.currentTime = el.duration - 0.2;
  });
  await expect.poll(() => page.evaluate(() => window.__audioElements[0].currentTime), { timeout: 5000 }).toBeLessThan(1);
  const state = await page.evaluate(() => ({ playing: !window.__audioElements[0].paused, loop: window.__audioElements[0].loop,
    source: window.__tumbleDogAudio.info().source }));
  expect(state).toEqual({ playing: true, loop: true, source: 'file' });
  await page.locator('#game').screenshot({ path: testInfo.outputPath('canvas.png') });
  expect(errors).toEqual([]);
});
