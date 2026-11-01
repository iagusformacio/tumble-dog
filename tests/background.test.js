import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMoncloaBackground } from '../src/background.js';

function recordingContext() {
  const calls = [];
  const context = new Proxy({ calls }, {
    get(target, property) {
      if (property === 'createLinearGradient') {
        return (...args) => {
          calls.push(['createLinearGradient', ...args]);
          return { addColorStop: (...stop) => calls.push(['addColorStop', ...stop]) };
        };
      }
      if (!(property in target)) {
        return (...args) => calls.push([property, ...args]);
      }
      return target[property];
    },
  });
  return context;
}

test('ilustración original de La Moncloa se dibuja una vez y luego se reutiliza cacheada', () => {
  const cachedContext = recordingContext();
  const surface = {
    width: 0,
    height: 0,
    getContext: () => cachedContext,
  };
  const callerContext = recordingContext();
  const background = createMoncloaBackground({
    width: 320,
    height: 224,
    canvasFactory: () => surface,
  });
  const initialDrawOperations = cachedContext.calls.length;

  assert.ok(initialDrawOperations > 30);
  assert.equal(surface.width, 320);
  assert.equal(surface.height, 224);
  background.render(callerContext);
  background.render(callerContext);

  assert.equal(cachedContext.calls.length, initialDrawOperations);
  assert.deepEqual(callerContext.calls.filter(([name]) => name === 'drawImage'), [
    ['drawImage', surface, 0, 0, 320, 224],
    ['drawImage', surface, 0, 0, 320, 224],
  ]);
});
