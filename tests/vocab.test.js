// Prüft die Vokabeldaten, die Antwortprüfung und den Karteikasten.
// Ausführen mit: node tests/vocab.test.js
const assert = require('assert');
const { Shell, stripColors } = require('../js/shell.js');
const V = require('../js/vocab.js');

let failed = 0;
const test = (name, fn) => {
  try {
    fn();
    console.log('ok   ' + name);
  } catch (e) {
    failed++;
    console.log('FAIL ' + name + ': ' + e.message);
  }
};
const card = (id) => V.CARDS.find((c) => c.id === id);

test('Karten-IDs sind eindeutig', () => {
  const ids = V.CARDS.map((c) => c.id);
  assert.strictEqual(new Set(ids).size, ids.length);
});

test('Bedeutungen sind pro Befehl eindeutig (sonst wäre die Frage mehrdeutig)', () => {
  const seen = new Set();
  for (const [cmd, , , meaning] of V.OPTIONS) {
    assert.ok(!seen.has(cmd + meaning), cmd + ': ' + meaning);
    seen.add(cmd + meaning);
  }
  assert.strictEqual(new Set(V.COMMANDS.map((c) => c[1])).size, V.COMMANDS.length);
});

test('Optionen gehören zu bekannten Befehlen', () => {
  const cmds = new Set(V.COMMANDS.map((c) => c[0]));
  for (const [cmd] of V.OPTIONS) assert.ok(cmds.has(cmd), cmd);
});

test('Bedeutung → Befehl', () => {
  const c = card('befehl:mkdir');
  assert.ok(V.isCorrect(c, 'mkdir'));
  assert.ok(V.isCorrect(c, '  MKDIR '));
  assert.ok(!V.isCorrect(c, 'mkdir -p'));
  assert.ok(!V.isCorrect(c, 'md'));
  assert.ok(V.isCorrect(card('befehl:less'), 'more'));
});

test('Option → lange Form', () => {
  const c = card('lang:mkdir-p');
  assert.ok(V.isCorrect(c, '--parents'));
  assert.ok(V.isCorrect(c, 'parents'));
  assert.ok(V.isCorrect(c, 'mkdir --parents'));
  assert.ok(!V.isCorrect(c, '-p'));
  assert.ok(!V.isCorrect(c, '--parent'));
  assert.ok(!V.isCorrect(c, ''));
});

test('Bedeutung → Option (Groß/klein zählt bei Kurzoptionen)', () => {
  const c = card('option:ls-R');
  assert.ok(V.isCorrect(c, '-R'));
  assert.ok(V.isCorrect(c, 'R'));
  assert.ok(V.isCorrect(c, '--recursive'));
  assert.ok(V.isCorrect(c, 'ls -R'));
  assert.ok(!V.isCorrect(c, '-r'));
  assert.ok(V.isCorrect(card('option:find-name'), '-name'));
  assert.ok(!card('lang:ls-l'), 'ls -l hat keine lange Form');
});

test('Karteikasten: richtig → weiter, falsch → Fach 1 und sofort fällig', () => {
  const st = {};
  const c = card('befehl:cp');
  const now = 1e12;
  assert.strictEqual(V.review(st, c, true, now).box, 1);
  assert.ok(st[c.id].due > now);
  V.review(st, c, true, now);
  assert.strictEqual(st[c.id].box, 2);
  V.review(st, c, false, now);
  assert.deepStrictEqual(st[c.id], { box: 1, due: now });
  for (let i = 0; i < 10; i++) V.review(st, c, true, now);
  assert.strictEqual(st[c.id].box, V.MAX_BOX);
});

test('Runde: fällige zuerst, höchstens 5 neue, nur gewählte Arten', () => {
  const now = 1e12;
  const st = {};
  const optionCards = V.CARDS.filter((c) => c.mode === 'option');
  optionCards.slice(0, 3).forEach((c) => (st[c.id] = { box: 1, due: now - 1 }));
  optionCards.slice(3, 6).forEach((c) => (st[c.id] = { box: 3, due: now + 1e9 }));
  const s = V.buildSession(st, ['option'], { now });
  assert.strictEqual(s.length, 12);
  assert.ok(s.every((c) => c.mode === 'option'));
  assert.strictEqual(s.filter((c) => st[c.id] && st[c.id].due <= now).length, 3);
  assert.ok(!s.some((c) => st[c.id] && st[c.id].due > now), 'nicht fällige Karten gehören nicht hinein');
  const fresh = V.buildSession({}, ['befehl'], { now });
  assert.strictEqual(fresh.length, 12, 'ohne fällige Karten füllen neue die Runde');
});

test('Lange Optionen funktionieren auch in der Übungs-Shell', () => {
  const s = new Shell();
  const out = (c) => stripColors(s.run(c).output).trim();
  assert.strictEqual(out('grep --count --ignore-case error logs/system.log'), '2');
  assert.strictEqual(out('head --lines=1 daten/namen.txt'), 'Lena');
  s.run('mkdir --parents x/y/z');
  assert.ok(s.isDir('x/y/z'));
});

console.log('\n' + V.CARDS.length + ' Karten, ' + failed + ' Fehler');
process.exit(failed ? 1 : 0);
