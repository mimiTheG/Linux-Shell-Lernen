// Prüft, dass jede Musterlösung ihre Übung löst und eine leere Eingabe nicht.
// Ausführen mit: node tests/lessons.test.js
const assert = require('assert');
const { Shell, stripColors } = require('../js/shell.js');
const { CHAPTERS } = require('../js/lessons.js');

let failed = 0;
for (const chapter of CHAPTERS) {
  for (const ex of chapter.exercises) {
    try {
      const shell = new Shell();
      if (ex.setup) ex.setup(shell);
      assert.ok(!ex.check({ shell, line: '', output: '' }), 'schon vor der Lösung erfüllt');
      const output = stripColors(shell.run(ex.solution).output);
      assert.ok(ex.check({ shell, line: ex.solution, output }), 'Lösung erfüllt die Prüfung nicht:\n' + output);
      console.log('ok   ' + chapter.id + '/' + ex.id);
    } catch (e) {
      failed++;
      console.log('FAIL ' + chapter.id + '/' + ex.id + ': ' + e.message);
    }
  }
}
process.exit(failed ? 1 : 0);
