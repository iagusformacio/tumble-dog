import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { getTheme, listThemes } from '../src/themes/index.js';
import { THEME, STAGES, STAGE_COUNT, letters, enemyTypes } from '../src/themes/marcos.js';
import { SPRITE_FILES } from '../src/sprite-list.js';

test('el tema marcos está registrado y es selectible desde el título', () => {
  const temas = listThemes().map((t) => t.id);
  assert.ok(temas.includes('marcos'), 'marcos no está registrado');
  assert.ok(temas.includes('tumbledog'), 'tumbledog sigue registrado');
  const m = getTheme('marcos');
  assert.equal(m.theme.id, 'marcos');
  assert.equal(m.theme.name, 'Dieta de Marcos');
  assert.equal(m.theme.title, 'DIETA DE MARCOS');
});

test('textos del tema marcos: TRAGAR / VOMITAR, ¡BLEEEH!, ESMORZAR y camarero con la cuenta', () => {
  assert.ok(/TRAGAR/.test(THEME.titleScreen.suck), 'falta TRAGAR en la pantalla de título');
  assert.ok(/VOMITAR/.test(THEME.titleScreen.shoot), 'falta VOMITAR en la pantalla de título');
  assert.ok(THEME.onomatopeyas.includes('¡BLEEEH!'), 'falta ¡BLEEEH! entre las onomatopeyas');
  assert.equal(THEME.letters.word, 'ESMORZAR');
  assert.ok(THEME.juice.chaser.includes('CAMARERO'), 'falta el camarero en el aviso de persecución');
  assert.ok(THEME.juice.chaser.includes('CUENTA'), 'falta la cuenta en el aviso de persecución');
  assert.ok(THEME.juice.vomit === '¡BLEEEH!', 'falta ¡BLEEEH! al vomitar');
});

test('fases del tema marcos: 10 fases con fondos de bar y enemigos conocidos', () => {
  assert.equal(STAGES.length, 10);
  assert.equal(STAGE_COUNT, 10);
  const fondosValidos = new Set(Object.keys(THEME.sprites.fondo));
  for (const s of STAGES) {
    assert.ok(fondosValidos.has(s.fondo), `${s.name}: fondo no declarado ${s.fondo}`);
    assert.ok(['manana', 'mediodia', 'atardecer', 'ocaso', 'noche'].includes(s.theme), `${s.name}: tema de fondo desconocido`);
    for (const [type, x, y] of s.foes) {
      assert.ok(enemyTypes[type], `${s.name}: tipo desconocido ${type}`);
      assert.ok(s.plats.some((p) => p.y === y && x >= p.x && x <= p.x + p.w), `${s.name}: ${type} no está sobre una plataforma`);
    }
  }
});

test('sprites de fondo y UI del tema marcos existen en disco', () => {
  for (const fondo of Object.values(THEME.sprites.fondo)) {
    const [src] = SPRITE_FILES[fondo];
    assert.ok(src, `falta entrada en el manifiesto para ${fondo}`);
    assert.ok(existsSync(src.replace('./', '')), `falta el archivo ${src}`);
  }
  for (const ui of Object.values(THEME.sprites.ui)) {
    const [src] = SPRITE_FILES[ui];
    assert.ok(src, `falta entrada en el manifiesto para ${ui}`);
    assert.ok(existsSync(src.replace('./', '')), `falta el archivo ${src}`);
  }
});

test('la canción MP3 del tema marcos está en disco', () => {
  assert.ok(existsSync('assets/audio/dieta-de-marcos.mp3'), 'falta assets/audio/dieta-de-marcos.mp3');
  const data = readFileSync('assets/audio/dieta-de-marcos.mp3');
  assert.ok(data.length > 1000, 'la canción MP3 está vacía');
});
