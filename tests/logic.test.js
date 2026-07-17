/**
 * Zero-dependency test suite for js/logic.js — the exact same module the
 * browser app loads. Run with: node tests/logic.test.js
 * (or `npm test`, see package.json)
 */
const assert = require('assert');
const path = require('path');
const L = require(path.join(__dirname, '..', 'js', 'logic.js'));

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  ✓ ' + name);
  } catch (err) {
    failed++;
    console.log('  ✗ ' + name);
    console.log('    ' + err.message);
  }
}

console.log('clamp()');
test('clamps a value below the minimum', () => {
  assert.strictEqual(L.clamp(-5, 0, 100), 0);
});
test('clamps a value above the maximum', () => {
  assert.strictEqual(L.clamp(150, 0, 100), 100);
});
test('leaves an in-range value untouched', () => {
  assert.strictEqual(L.clamp(42, 0, 100), 42);
});

console.log('densityLevel()');
test('below 35% is calm', () => {
  assert.strictEqual(L.densityLevel(10), 'calm');
  assert.strictEqual(L.densityLevel(34), 'calm');
});
test('35-64% is moderate', () => {
  assert.strictEqual(L.densityLevel(35), 'moderate');
  assert.strictEqual(L.densityLevel(64), 'moderate');
});
test('65-84% is busy', () => {
  assert.strictEqual(L.densityLevel(65), 'busy');
  assert.strictEqual(L.densityLevel(84), 'busy');
});
test('85%+ is critical', () => {
  assert.strictEqual(L.densityLevel(85), 'critical');
  assert.strictEqual(L.densityLevel(100), 'critical');
});

console.log('distanceMeters() — haversine');
test('same point is zero distance', () => {
  assert.strictEqual(L.distanceMeters(28.5829, 77.2344, 28.5829, 77.2344), 0);
});
test('~150m offset at JLN Stadium latitude is within 5% of expected', () => {
  // 0.00135 deg latitude ≈ 150m
  const d = L.distanceMeters(28.5829, 77.2344, 28.5829 + 0.00135, 77.2344);
  assert.ok(Math.abs(d - 150) < 8, 'expected ~150m, got ' + d.toFixed(1) + 'm');
});
test('known Delhi-scale distance (~1km apart) is plausible', () => {
  const d = L.distanceMeters(28.5829, 77.2344, 28.5920, 77.2344);
  assert.ok(d > 900 && d < 1100, 'expected ~1000m, got ' + d.toFixed(1) + 'm');
});

console.log('bearingDeg() + compassFrom()');
test('due north is ~0°', () => {
  const b = L.bearingDeg(28.5829, 77.2344, 28.5929, 77.2344);
  assert.ok(b < 2 || b > 358, 'expected ~0°, got ' + b.toFixed(1));
  assert.strictEqual(L.compassFrom(b), 'N');
});
test('due east is ~90°', () => {
  const b = L.bearingDeg(28.5829, 77.2344, 28.5829, 77.2444);
  assert.ok(Math.abs(b - 90) < 2, 'expected ~90°, got ' + b.toFixed(1));
  assert.strictEqual(L.compassFrom(b), 'E');
});
test('due south is ~180°', () => {
  const b = L.bearingDeg(28.5829, 77.2344, 28.5729, 77.2344);
  assert.ok(Math.abs(b - 180) < 2, 'expected ~180°, got ' + b.toFixed(1));
  assert.strictEqual(L.compassFrom(b), 'S');
});

console.log('losFor() — Fruin pedestrian Level-of-Service');
test('low density is LOS A', () => {
  assert.strictEqual(L.losFor(0.2).code, 'A');
});
test('boundary values fall in the correct band', () => {
  assert.strictEqual(L.losFor(0.39).code, 'A');
  assert.strictEqual(L.losFor(0.4).code, 'B');
  assert.strictEqual(L.losFor(0.69).code, 'B');
  assert.strictEqual(L.losFor(1.39).code, 'D');
});
test('extreme density is LOS F (crowd-crush risk)', () => {
  assert.strictEqual(L.losFor(3.0).code, 'F');
});
test('LOS bands are in ascending, non-overlapping order', () => {
  for (let i = 1; i < L.LOS_BANDS.length; i++) {
    assert.ok(L.LOS_BANDS[i].max > L.LOS_BANDS[i - 1].max);
  }
});

console.log('detectIntent()');
test('detects accessibility intent', () => {
  assert.strictEqual(L.detectIntent('I need wheelchair access'), 'accessibility');
});

test('captures kickoff state and live-mode advisory', () => {
  const live = L.getKickoffState(new Date('2026-07-18T20:00:00Z'), new Date('2026-07-18T20:00:00Z'));
  assert.strictEqual(live.isLive, true);
  assert.strictEqual(live.advisory, 'late entry gates open');
  assert.strictEqual(live.countdownText, '00:00');

  const upcoming = L.getKickoffState(new Date('2026-07-18T20:20:00Z'), new Date('2026-07-18T20:00:00Z'));
  assert.strictEqual(upcoming.isLive, false);
  assert.strictEqual(upcoming.advisory, 'arrival window closing');
  assert.strictEqual(upcoming.countdownText, '20:00');
});

test('uses heat index for hydration warnings', () => {
  assert.strictEqual(L.getHeatIndex(31.8, 2.3).toFixed(1), '34.1');
  assert.strictEqual(L.shouldHydrationWatch(31.8, 34.1), true);
  assert.strictEqual(L.shouldHydrationWatch(30.0, 31.0), false);
});

test('hides routing warning for preset origins without GPS', () => {
  assert.strictEqual(L.shouldShowLocationWarning('airport', 'walking', false), false);
  assert.strictEqual(L.shouldShowLocationWarning('current', 'railway', false), false);
  assert.strictEqual(L.shouldShowLocationWarning('current', 'walking', false), true);
  assert.strictEqual(L.shouldShowLocationWarning('current', 'walking', true), false);
});
test('detects transport intent', () => {
  assert.strictEqual(L.detectIntent('When should I leave for kickoff?'), 'transport');
});
test('detects safety intent', () => {
  assert.strictEqual(L.detectIntent('Is Gate 4 safe right now?'), 'safety');
});
test('detects weather intent', () => {
  assert.strictEqual(L.detectIntent("It's really hot, what should I do?"), 'weather');
});
test('detects navigation intent', () => {
  assert.strictEqual(L.detectIntent('Fastest way to Gate 4'), 'navigation');
});
test('falls back to general for unrelated text', () => {
  assert.strictEqual(L.detectIntent('what time is kickoff'), 'general');
});
test('is case-insensitive', () => {
  assert.strictEqual(L.detectIntent('WHEELCHAIR ACCESS PLEASE'), 'accessibility');
});
test('handles empty/undefined input without throwing', () => {
  assert.strictEqual(L.detectIntent(''), 'general');
  assert.strictEqual(L.detectIntent(undefined), 'general');
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
