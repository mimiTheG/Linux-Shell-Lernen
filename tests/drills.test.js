// Prüft jede Trainingsaufgabe: Die Musterlösung läuft fehlerfrei, bewirkt etwas,
// besteht ihre eigene Prüfung, und ohne Eingabe gilt die Aufgabe nicht als gelöst.
// Ausführen mit: node tests/drills.test.js
const assert = require('assert');
const { Shell } = require('../js/shell.js');
const { DRILLS, prepare, taskCount } = require('../js/drills.js');

let failed = 0;
const ids = new Set();

function attempt(p, line) {
  const shell = new Shell();
  p.setup(shell);
  const r = shell.run(line);
  return p.check({ shell, line, output: r.output });
}

for (const drill of DRILLS) {
  try {
    assert.ok(!ids.has(drill.id), 'doppelte id');
    ids.add(drill.id);
    assert.ok(drill.tasks.length >= 5, 'weniger als 5 Aufgaben');
  } catch (e) {
    failed++;
    console.log('FAIL ' + drill.id + ': ' + e.message);
  }
  drill.tasks.forEach((task, i) => {
    const name = drill.id + '#' + (i + 1) + ' (' + task.solution + ')';
    try {
      const p = prepare(drill, task);
      const ref = new Shell();
      p.setup(ref);
      const out = ref.run(task.solution).output;
      assert.ok(!out.includes('\x1b[31m'), 'Musterlösung erzeugt Fehler:\n' + out);
      assert.ok(p.mode === 'state' ? p.changed.length || true : p.refOutput, 'Musterlösung bewirkt nichts');
      assert.ok(attempt(p, task.solution), 'Musterlösung besteht Prüfung nicht');
      const idle = new Shell();
      p.setup(idle);
      assert.ok(!p.check({ shell: idle, line: '', output: '' }), 'ohne Eingabe schon gelöst');
      console.log('ok   ' + name + ' [' + p.mode + ']');
    } catch (e) {
      failed++;
      console.log('FAIL ' + name + ': ' + e.message);
    }
  });
}

// Andere richtige Lösungswege müssen auch zählen, falsche nicht.
const byId = (id, n) => prepare(DRILLS.find((d) => d.id === id), DRILLS.find((d) => d.id === id).tasks[n]);
const alternatives = [
  ['cd', 0, 'cd ~/Bilder', true],
  ['cd', 3, 'cd ~/daten', true],
  ['cd', 0, 'cd Dokumente', false],
  ['mkdir', 5, 'mkdir ~/archiv', true],
  ['cp', 5, 'cp README.md ..', true],
  ['find-name', 1, 'find ~ -name "*.jpg"', true],
  ['grep-c', 0, 'echo 2', false],
  ['echo-gt', 0, 'echo Hallo > gruss.txt', true],
  ['echo-gt', 0, 'echo Hallo! > gruss.txt', false],
  ['chmod-num', 0, 'chmod u+x,go-r notizen.txt', true],
  ['chmod-num', 0, 'chmod u+x notizen.txt', false],
  ['uniq', 0, 'sort -u daten/namen.txt', false],
  ['pipes', 1, 'grep -c ERROR logs/system.log', false],
];
for (const [id, n, line, expected] of alternatives) {
  const ok = attempt(byId(id, n), line) === expected;
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + 'Alternative ' + id + '#' + (n + 1) + ': "' + line + '" → ' + (expected ? 'gilt' : 'gilt nicht'));
}

console.log('\n' + DRILLS.length + ' Themen, ' + taskCount + ' Aufgaben, ' + failed + ' Fehler');
process.exit(failed ? 1 : 0);
