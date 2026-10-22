// Vokabeltrainer: Befehle und Optionen mit ihren Bedeutungen und langen Formen.
// Abgefragt wird nach dem Karteikasten-Prinzip (Leitner): Richtig beantwortete
// Karten wandern ein Fach weiter und kommen erst später wieder.
(function (global) {
  'use strict';

  // cmd, Bedeutung (als Aufforderung), Herkunft des Namens als Eselsbrücke
  const COMMANDS = [
    ['pwd', 'Zeige den Pfad des aktuellen Ordners', '<b>p</b>rint <b>w</b>orking <b>d</b>irectory'],
    ['ls', 'Liste den Inhalt eines Ordners auf', '<b>l</b>i<b>s</b>t'],
    ['cd', 'Wechsle in einen anderen Ordner', '<b>c</b>hange <b>d</b>irectory'],
    ['mkdir', 'Erstelle ein Verzeichnis', '<b>m</b>a<b>k</b>e <b>dir</b>ectory'],
    ['rmdir', 'Lösche ein leeres Verzeichnis', '<b>r</b>e<b>m</b>ove <b>dir</b>ectory'],
    ['touch', 'Erstelle eine leere Datei', 'to touch = berühren (setzt auch das Änderungsdatum neu)'],
    ['rm', 'Lösche eine Datei', '<b>r</b>e<b>m</b>ove'],
    ['cp', 'Kopiere eine Datei', '<b>c</b>o<b>p</b>y'],
    ['mv', 'Verschiebe oder benenne eine Datei um', '<b>m</b>o<b>v</b>e'],
    ['cat', 'Gib den Inhalt einer Datei aus', 'con<b>cat</b>enate = aneinanderhängen (mehrerer Dateien)'],
    ['less', 'Zeige eine lange Datei seitenweise zum Blättern an', '„less is more“ – der Nachfolger von <code>more</code>', ['more']],
    ['echo', 'Gib einen Text aus', 'Echo – wirft zurück, was man hineinruft'],
    ['head', 'Zeige den Anfang einer Datei', 'head = Kopf'],
    ['tail', 'Zeige das Ende einer Datei', 'tail = Schwanz'],
    ['wc', 'Zähle Zeilen, Wörter und Bytes', '<b>w</b>ord <b>c</b>ount'],
    ['grep', 'Suche Zeilen, die ein Muster enthalten', '<b>g</b>lobal <b>r</b>egular <b>e</b>xpression <b>p</b>rint'],
    ['find', 'Suche Dateien in Ordnern und Unterordnern', 'find = finden'],
    ['sort', 'Sortiere Zeilen', 'sort = sortieren'],
    ['uniq', 'Entferne direkt aufeinanderfolgende doppelte Zeilen', '<b>uniq</b>ue = einzigartig'],
    ['cut', 'Schneide Spalten aus jeder Zeile aus', 'cut = schneiden'],
    ['chmod', 'Ändere die Zugriffsrechte einer Datei', '<b>ch</b>ange <b>mod</b>e'],
    ['tree', 'Zeige Ordner und Dateien als Baum', 'tree = Baum'],
    ['whoami', 'Zeige deinen Benutzernamen', '<b>who am i</b> = wer bin ich?'],
    ['history', 'Zeige die zuletzt eingegebenen Befehle', 'history = Verlauf'],
    ['clear', 'Leere den Bildschirm', 'clear = aufräumen'],
    ['man', 'Zeige das Handbuch zu einem Befehl', '<b>man</b>ual = Handbuch'],
    ['which', 'Zeige, in welcher Datei ein Befehl liegt', 'which = welcher'],
    ['env', 'Zeige alle Umgebungsvariablen', '<b>env</b>ironment = Umgebung'],
    ['date', 'Zeige Datum und Uhrzeit', 'date = Datum'],
    ['sudo', 'Führe einen Befehl mit Administratorrechten aus', '<b>s</b>uper<b>u</b>ser <b>do</b>'],
  ];

  // cmd, Kurzform, lange Form (null = gibt es nicht), Bedeutung
  const OPTIONS = [
    ['ls', '-a', '--all', 'auch versteckte Dateien anzeigen'],
    ['ls', '-A', '--almost-all', 'versteckte Dateien anzeigen, aber ohne . und ..'],
    ['ls', '-l', null, 'ausführliche Liste mit Rechten, Größe und Datum (l = long)'],
    ['ls', '-h', '--human-readable', 'Größen lesbar anzeigen (K, M, G)'],
    ['ls', '-t', null, 'nach Änderungszeit sortieren (t = time)'],
    ['ls', '-r', '--reverse', 'Sortierung umkehren'],
    ['ls', '-R', '--recursive', 'Unterordner mit auflisten'],
    ['ls', '-d', '--directory', 'den Ordner selbst statt seines Inhalts anzeigen'],
    ['ls', '-F', '--classify', 'Typzeichen anhängen, z. B. / bei Ordnern'],

    ['mkdir', '-p', '--parents', 'fehlende Elternordner mit anlegen'],
    ['mkdir', '-v', '--verbose', 'jeden angelegten Ordner melden'],
    ['mkdir', '-m', '--mode', 'Zugriffsrechte direkt beim Anlegen setzen'],

    ['rm', '-r', '--recursive', 'Ordner samt Inhalt löschen'],
    ['rm', '-f', '--force', 'ohne Nachfrage löschen, keine Fehler bei fehlenden Dateien'],
    ['rm', '-i', '--interactive', 'vor jedem Löschen nachfragen'],
    ['rm', '-v', '--verbose', 'jede gelöschte Datei melden'],
    ['rm', '-d', '--dir', 'leere Ordner löschen'],

    ['cp', '-r', '--recursive', 'Ordner samt Inhalt kopieren'],
    ['cp', '-i', '--interactive', 'vor dem Überschreiben nachfragen'],
    ['cp', '-n', '--no-clobber', 'vorhandene Dateien nie überschreiben'],
    ['cp', '-u', '--update', 'nur kopieren, wenn die Quelle neuer ist'],
    ['cp', '-v', '--verbose', 'jede kopierte Datei melden'],
    ['cp', '-a', '--archive', 'alles inklusive Rechten und Zeitstempeln kopieren'],

    ['mv', '-i', '--interactive', 'vor dem Überschreiben nachfragen'],
    ['mv', '-f', '--force', 'ohne Nachfrage überschreiben'],
    ['mv', '-n', '--no-clobber', 'vorhandene Dateien nie überschreiben'],
    ['mv', '-u', '--update', 'nur verschieben, wenn die Quelle neuer ist'],
    ['mv', '-v', '--verbose', 'jede verschobene Datei melden'],

    ['touch', '-c', '--no-create', 'keine neue Datei anlegen, nur das Datum ändern'],
    ['touch', '-d', '--date', 'ein bestimmtes Datum setzen'],

    ['cat', '-n', '--number', 'alle Zeilen nummerieren'],
    ['cat', '-b', '--number-nonblank', 'nur nicht-leere Zeilen nummerieren'],
    ['cat', '-s', '--squeeze-blank', 'mehrere Leerzeilen zu einer zusammenfassen'],
    ['cat', '-A', '--show-all', 'unsichtbare Zeichen sichtbar machen'],

    ['echo', '-n', null, 'keinen Zeilenumbruch am Ende ausgeben'],
    ['echo', '-e', null, 'Escape-Sequenzen wie \\n auswerten'],

    ['head', '-n', '--lines', 'Anzahl der Zeilen festlegen'],
    ['head', '-c', '--bytes', 'Anzahl der Bytes festlegen'],

    ['tail', '-n', '--lines', 'Anzahl der Zeilen festlegen'],
    ['tail', '-f', '--follow', 'neue Zeilen live verfolgen'],
    ['tail', '-c', '--bytes', 'Anzahl der Bytes festlegen'],

    ['wc', '-l', '--lines', 'nur Zeilen zählen'],
    ['wc', '-w', '--words', 'nur Wörter zählen'],
    ['wc', '-c', '--bytes', 'nur Bytes zählen'],
    ['wc', '-m', '--chars', 'nur Zeichen zählen'],
    ['wc', '-L', '--max-line-length', 'Länge der längsten Zeile ausgeben'],

    ['grep', '-i', '--ignore-case', 'Groß-/Kleinschreibung ignorieren'],
    ['grep', '-v', '--invert-match', 'nur Zeilen OHNE Treffer zeigen'],
    ['grep', '-c', '--count', 'nur die Anzahl passender Zeilen ausgeben'],
    ['grep', '-n', '--line-number', 'Zeilennummern voranstellen'],
    ['grep', '-r', '--recursive', 'in allen Dateien eines Ordners suchen'],
    ['grep', '-l', '--files-with-matches', 'nur Namen der Dateien mit Treffer ausgeben'],
    ['grep', '-L', '--files-without-match', 'nur Namen der Dateien OHNE Treffer ausgeben'],
    ['grep', '-w', '--word-regexp', 'nur ganze Wörter finden'],
    ['grep', '-x', '--line-regexp', 'nur Zeilen, die komplett passen'],
    ['grep', '-o', '--only-matching', 'nur den gefundenen Teil statt der ganzen Zeile ausgeben'],
    ['grep', '-E', '--extended-regexp', 'erweiterte reguläre Ausdrücke (z. B. a|b)'],
    ['grep', '-F', '--fixed-strings', 'Muster als festen Text statt als Regex behandeln'],
    ['grep', '-A', '--after-context', 'auch Zeilen NACH dem Treffer zeigen'],
    ['grep', '-B', '--before-context', 'auch Zeilen VOR dem Treffer zeigen'],
    ['grep', '-C', '--context', 'Zeilen vor UND nach dem Treffer zeigen'],
    ['grep', '-h', '--no-filename', 'Dateinamen in der Ausgabe weglassen'],
    ['grep', '-q', '--quiet', 'nichts ausgeben, nur Erfolg/Misserfolg melden'],

    ['find', '-name', null, 'nach Namen suchen (mit Wildcards)'],
    ['find', '-iname', null, 'nach Namen suchen, Groß/klein egal'],
    ['find', '-type', null, 'nur Dateien (f) oder nur Ordner (d)'],
    ['find', '-size', null, 'nach Dateigröße suchen'],
    ['find', '-mtime', null, 'nach Änderungsdatum (in Tagen) suchen'],
    ['find', '-maxdepth', null, 'Suchtiefe begrenzen'],
    ['find', '-empty', null, 'nur leere Dateien und Ordner finden'],
    ['find', '-exec', null, 'für jeden Treffer einen Befehl ausführen'],
    ['find', '-delete', null, 'alle Treffer löschen'],

    ['sort', '-n', '--numeric-sort', 'nach Zahlenwert sortieren'],
    ['sort', '-r', '--reverse', 'absteigend sortieren'],
    ['sort', '-u', '--unique', 'doppelte Zeilen entfernen'],
    ['sort', '-k', '--key', 'nach einer bestimmten Spalte sortieren'],
    ['sort', '-t', '--field-separator', 'Trennzeichen der Spalten festlegen'],
    ['sort', '-f', '--ignore-case', 'Groß-/Kleinschreibung ignorieren'],
    ['sort', '-h', '--human-numeric-sort', 'Größen wie 2K oder 1G richtig sortieren'],
    ['sort', '-o', '--output', 'Ergebnis in eine Datei schreiben'],

    ['uniq', '-c', '--count', 'Anzahl der Wiederholungen voranstellen'],
    ['uniq', '-d', '--repeated', 'nur Zeilen zeigen, die mehrfach vorkommen'],
    ['uniq', '-u', '--unique', 'nur Zeilen zeigen, die genau einmal vorkommen'],
    ['uniq', '-i', '--ignore-case', 'Groß-/Kleinschreibung ignorieren'],

    ['cut', '-d', '--delimiter', 'Trennzeichen der Spalten festlegen'],
    ['cut', '-f', '--fields', 'auszuschneidende Spalten (Felder) wählen'],
    ['cut', '-c', '--characters', 'bestimmte Zeichenpositionen ausschneiden'],

    ['chmod', '-R', '--recursive', 'Rechte für alle Dateien in Unterordnern ändern'],
    ['chmod', '-v', '--verbose', 'jede Änderung melden'],

    ['tree', '-a', null, 'auch versteckte Dateien zeigen'],
    ['tree', '-d', null, 'nur Ordner zeigen'],
    ['tree', '-L', null, 'Tiefe des Baums begrenzen (L = level)'],

    ['man', '-k', '--apropos', 'Handbuchseiten nach einem Stichwort durchsuchen'],
  ];

  const MODES = [
    { id: 'befehl', label: 'Bedeutung → Befehl', example: '„Erstelle ein Verzeichnis“ → mkdir' },
    { id: 'lang', label: 'Option → lange Form', example: 'mkdir -p → --parents' },
    { id: 'option', label: 'Bedeutung → Option', example: 'mkdir: Elternordner mit anlegen → -p' },
  ];

  // --- Karten ----------------------------------------------------------------

  const ORIGIN = Object.fromEntries(COMMANDS.map(([cmd, , origin]) => [cmd, origin]));

  const CARDS = [];
  for (const [cmd, meaning, origin, aliases] of COMMANDS) {
    CARDS.push({ id: 'befehl:' + cmd, mode: 'befehl', cmd, meaning, origin, answers: [cmd, ...(aliases || [])] });
  }
  for (const [cmd, opt, long, meaning] of OPTIONS) {
    const base = { cmd, opt, long, meaning, origin: ORIGIN[cmd] };
    if (long) CARDS.push({ ...base, id: 'lang:' + cmd + opt, mode: 'lang', answers: [long] });
    CARDS.push({ ...base, id: 'option:' + cmd + opt, mode: 'option', answers: long ? [opt, long] : [opt] });
  }

  // Vergleicht eine Eingabe mit den erlaubten Antworten einer Karte.
  function isCorrect(card, input) {
    let a = input.trim().replace(/\s+/g, ' ');
    // „mkdir --parents“ statt nur „--parents“ ist auch in Ordnung.
    if (card.mode !== 'befehl' && a.startsWith(card.cmd + ' ')) a = a.slice(card.cmd.length + 1).trim();
    if (!a) return false;
    if (card.mode === 'befehl') return card.answers.includes(a.toLowerCase());
    return card.answers.some((ans) => {
      if (ans.startsWith('--')) return a.toLowerCase() === ans || a.toLowerCase() === ans.slice(2);
      // Kurzoptionen: Groß-/Kleinschreibung zählt (-r ≠ -R), der Bindestrich darf fehlen.
      return a === ans || a === ans.slice(1);
    });
  }

  // --- Karteikasten ------------------------------------------------------------

  const DAY = 24 * 60 * 60 * 1000;
  // Wartezeit in Tagen, nachdem eine Karte richtig beantwortet in Fach 1–5 gelandet ist.
  const INTERVAL_DAYS = [0, 1, 3, 7, 14, 30];
  const MAX_BOX = INTERVAL_DAYS.length - 1;

  // state: { [cardId]: { box, due } } – fehlende Karten sind neu (Fach 0).
  // Richtig: ein Fach weiter. Falsch: zurück in Fach 1 und sofort wieder fällig.
  function review(state, card, correct, now = Date.now()) {
    const cur = state[card.id] || { box: 0, due: 0 };
    const box = correct ? Math.min(cur.box + 1, MAX_BOX) : 1;
    state[card.id] = { box, due: correct ? now + INTERVAL_DAYS[box] * DAY : now };
    return state[card.id];
  }

  // Stellt eine Runde zusammen: erst fällige Karten (die ältesten zuerst), dann neue.
  function buildSession(state, modes, { size = 12, maxNew = 5, now = Date.now() } = {}) {
    const pool = CARDS.filter((c) => modes.includes(c.mode));
    const due = pool.filter((c) => state[c.id] && state[c.id].due <= now).sort((a, b) => state[a.id].due - state[b.id].due);
    const fresh = shuffle(pool.filter((c) => !state[c.id]));
    const picked = due.slice(0, size);
    picked.push(...fresh.slice(0, Math.min(maxNew, size - picked.length)));
    // Ist zu wenig fällig, dürfen es mehr neue Karten sein.
    if (picked.length < size) picked.push(...fresh.slice(maxNew, maxNew + size - picked.length));
    return shuffle(picked);
  }

  function stats(state, modes, now = Date.now()) {
    const pool = CARDS.filter((c) => modes.includes(c.mode));
    const boxes = new Array(MAX_BOX + 1).fill(0);
    let due = 0;
    for (const c of pool) {
      const s = state[c.id];
      boxes[s ? s.box : 0]++;
      if (s && s.due <= now) due++;
    }
    return { total: pool.length, fresh: boxes[0], due, boxes };
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const api = { COMMANDS, OPTIONS, MODES, CARDS, MAX_BOX, isCorrect, review, buildSession, stats };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.Vocab = api;
})(typeof window !== 'undefined' ? window : globalThis);
