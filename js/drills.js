// Trainingsaufgaben: pro Befehl bzw. Options-Kombination mehrere Aufgaben.
// Geprüft wird automatisch gegen die Musterlösung: Erzeugt sie eine Ausgabe,
// muss deine Ausgabe gleich sein; verändert sie Dateien oder den Ordner, muss
// dein Dateisystem an genau diesen Stellen gleich aussehen. So zählen auch
// andere richtige Lösungswege.
(function (global) {
  'use strict';

  const LS = global.LinuxShell || (typeof require !== 'undefined' ? require('./shell.js') : null);
  const H = LS.HOME;

  // --- Zusätzliche Übungsdateien ---------------------------------------------

  const EXTRA_FILES = {
    'obst.txt': 'Banane\nApfel\nKiwi\nApfel\nMango\nbanane\nKiwi\nApfel\nBirne\n',
    'kunden.csv': 'id;name;stadt;umsatz\n1;Meier;Berlin;1200\n2;Schulz;Wien;800\n3;Kaya;Berlin;450\n4;Novak;Graz;2300\n5;Rossi;Wien;990\n',
    'projekt/README.md': '# Projekt\nEin kleines Webprojekt.\nTODO: Tests schreiben\n',
    'projekt/index.html': '<html>\n<head><title>Projekt</title></head>\n<body>\n<h1>Hallo</h1>\n<!-- TODO: Menü -->\n</body>\n</html>\n',
    'projekt/style.css': 'body { color: black; }\nh1 { font-size: 2em; }\n',
    'projekt/.env': 'PASSWORT=geheim\n',
    'projekt/src/main.js': "import { add } from './utils.js';\nconsole.log(add(2, 3));\n// TODO: Fehlerbehandlung\n",
    'projekt/src/utils.js': 'export function add(a, b) {\n  return a + b;\n}\n',
    'projekt/src/test.js': "// Tests\nconsole.log('ok');\n",
    'projekt/docs/anleitung.txt': 'Installation\nStarten\nBeenden\n',
    'projekt/docs/faq.txt': 'Frage: Wie starte ich?\nAntwort: npm start\n',
  };

  // Legt Dateien an (Pfade relativ zu ~), inklusive fehlender Ordner.
  // Ein Wert von null legt einen leeren Ordner an.
  function addFiles(shell, files) {
    for (const [rel, content] of Object.entries(files)) {
      const abs = rel.startsWith('/') ? rel : H + '/' + rel;
      if (content === null) {
        shell.run('mkdir -p ' + abs, { noHistory: true });
        continue;
      }
      shell.run('mkdir -p ' + abs.slice(0, abs.lastIndexOf('/')), { noHistory: true });
      shell.writeFile(abs, content);
    }
  }

  const files = (f) => (shell) => addFiles(shell, f);
  const cd = (dir) => (shell) => shell.run('cd ' + dir, { noHistory: true });
  const run = (line) => (shell) => shell.run(line, { noHistory: true });
  const all = (...fns) => (shell) => fns.forEach((fn) => fn(shell));

  // --- Aufgaben --------------------------------------------------------------
  // t(Aufgabe, Musterlösung, { setup, require, contains })

  const t = (task, solution, opts = {}) => ({ task, solution, ...opts });

  const DRILLS = [
    // ===== Orientierung =====
    {
      id: 'cd',
      chapter: 'orientierung',
      title: 'cd',
      subtitle: 'Ordner wechseln',
      hint: 'cd ZIEL – mit .. nach oben, ~ nach Hause, - zurück',
      require: ['cd'],
      tasks: [
        t('Wechsle in den Ordner <code>Bilder</code>.', 'cd Bilder'),
        t('Wechsle mit <em>einem</em> Befehl in <code>projekt/src</code>.', 'cd projekt/src'),
        t('Wechsle in das Verzeichnis <code>/tmp</code>.', 'cd /tmp'),
        t('Du bist in <code>Dokumente</code>. Wechsle direkt in den Nachbarordner <code>daten</code>.', 'cd ../daten', { setup: cd('Dokumente') }),
        t('Du bist in <code>projekt/src</code>. Gehe zwei Ebenen nach oben.', 'cd ../..', { setup: cd('projekt/src') }),
        t('Du bist in <code>/etc</code>. Wechsle in den Ordner <code>logs</code> in deinem Home-Verzeichnis.', 'cd ~/logs', { setup: cd('/etc') }),
        t('Wechsle in das Wurzelverzeichnis.', 'cd /'),
        t('Du warst in <code>/tmp</code> und bist dann nach Hause gewechselt. Spring zurück in den vorherigen Ordner.', 'cd -', {
          setup: all(cd('/tmp'), cd('~')),
        }),
      ],
    },
    {
      id: 'ls-pfad',
      chapter: 'orientierung',
      title: 'ls ORDNER',
      subtitle: 'Inhalt anderer Ordner',
      hint: 'ls PFAD – mehrere Pfade sind erlaubt',
      require: ['ls'],
      tasks: [
        t('Zeige den Inhalt von <code>Bilder</code>, ohne den Ordner zu wechseln.', 'ls Bilder'),
        t('Liste den Inhalt von <code>/etc</code>.', 'ls /etc'),
        t('Was liegt in <code>projekt/src</code>?', 'ls projekt/src'),
        t('Du bist in <code>Dokumente</code>. Liste den Inhalt von <code>daten</code>, ohne zu wechseln.', 'ls ../daten', { setup: cd('Dokumente') }),
        t('Liste den Inhalt des Wurzelverzeichnisses <code>/</code>.', 'ls /'),
        t('Liste <code>logs</code> und <code>skripte</code> mit einem einzigen Befehl.', 'ls logs skripte'),
      ],
    },
    {
      id: 'ls-a',
      chapter: 'orientierung',
      title: 'ls -a',
      subtitle: 'Versteckte Dateien',
      hint: 'ls -a ORDNER',
      require: ['ls'],
      tasks: [
        t('Zeige alle Dateien in <code>projekt</code>, auch die versteckten.', 'ls -a projekt'),
        t('Zeige alle Einträge deines Home-Verzeichnisses inklusive versteckter.', 'ls -a'),
        t('In <code>Musik</code> versteckt sich etwas. Mach es sichtbar.', 'ls -a Musik', { setup: files({ 'Musik/.playlist': 'Lied 1\n' }) }),
        t('Zeige alle Einträge in <code>Dokumente</code> (auch versteckte) als ausführliche Liste.', 'ls -la Dokumente'),
        t('Zeige auch die versteckten Dateien in <code>/tmp</code>.', 'ls -a /tmp', { setup: files({ '/tmp/.lock': '' }) }),
      ],
    },
    {
      id: 'ls-l',
      chapter: 'orientierung',
      title: 'ls -l',
      subtitle: 'Ausführliche Liste',
      hint: 'ls -l PFAD (mit -h werden Größen lesbar)',
      require: ['ls'],
      tasks: [
        t('Zeige eine ausführliche Liste von <code>Bilder</code>.', 'ls -l Bilder'),
        t('Zeige die ausführlichen Infos nur zur Datei <code>notizen.txt</code>.', 'ls -l notizen.txt'),
        t('Zeige die Rechte der Dateien in <code>projekt/src</code>.', 'ls -l projekt/src'),
        t('Ausführliche Liste von <code>daten</code> mit lesbaren Größen.', 'ls -lh daten'),
        t('Ausführliche Liste von <code>/etc</code>.', 'ls -l /etc'),
        t('Ausführliche Liste deines aktuellen Ordners.', 'ls -l'),
      ],
    },
    {
      id: 'ls-glob',
      chapter: 'orientierung',
      title: 'ls mit * und ?',
      subtitle: 'Wildcards',
      hint: '* = beliebig viele Zeichen, ? = genau ein Zeichen. Beispiel: ls Bilder/*.jpg',
      require: ['ls'],
      tasks: [
        t('Zeige nur die <code>.jpg</code>-Dateien in <code>Bilder</code>.', 'ls Bilder/*.jpg'),
        t('Zeige alle <code>.txt</code>-Dateien in <code>daten</code>.', 'ls daten/*.txt'),
        t('Zeige alle Dateien im aktuellen Ordner, die auf <code>.txt</code> enden.', 'ls *.txt'),
        t('Zeige alle <code>.js</code>-Dateien in <code>projekt/src</code>.', 'ls projekt/src/*.js'),
        t('Zeige alle Dateien in <code>daten</code>, die mit <code>z</code> beginnen.', 'ls daten/z*'),
        t('Zeige die Dateien in <code>projekt</code>, deren Endung genau 3 Zeichen hat. Nutze <code>?</code>.', 'ls projekt/*.???'),
        t('Zeige alle Dateien in <code>Bilder</code>, die ein <code>a</code> im Namen haben.', 'ls Bilder/*a*'),
      ],
    },

    // ===== Dateien & Ordner =====
    {
      id: 'mkdir',
      chapter: 'dateien',
      title: 'mkdir',
      subtitle: 'Ordner anlegen',
      hint: 'mkdir NAME [NAME …]',
      require: ['mkdir'],
      tasks: [
        t('Lege den Ordner <code>Videos</code> an.', 'mkdir Videos'),
        t('Lege in <code>Dokumente</code> den Ordner <code>rechnungen</code> an.', 'mkdir Dokumente/rechnungen'),
        t('Lege die Ordner <code>2025</code> und <code>2026</code> mit einem Befehl an.', 'mkdir 2025 2026'),
        t('Lege den Ordner <code>/tmp/test</code> an.', 'mkdir /tmp/test'),
        t('Lege in <code>projekt</code> den Ordner <code>bilder</code> an.', 'mkdir projekt/bilder'),
        t('Du bist in <code>Musik</code>. Lege im Home-Verzeichnis den Ordner <code>archiv</code> an, ohne zu wechseln.', 'mkdir ../archiv', { setup: cd('Musik') }),
      ],
    },
    {
      id: 'mkdir-p',
      chapter: 'dateien',
      title: 'mkdir -p',
      subtitle: 'Verschachtelte Ordner',
      hint: 'mkdir -p a/b/c',
      require: ['mkdir'],
      tasks: [
        t('Lege <code>reisen/2026/italien</code> an.', 'mkdir -p reisen/2026/italien'),
        t('Lege <code>projekt/src/components/buttons</code> an.', 'mkdir -p projekt/src/components/buttons'),
        t('Lege <code>backup/fotos</code> und <code>backup/texte</code> mit einem Befehl an.', 'mkdir -p backup/fotos backup/texte'),
        t('Lege <code>/tmp/a/b/c/d</code> an.', 'mkdir -p /tmp/a/b/c/d'),
        t('Lege <code>schule/mathe/hausaufgaben</code> an.', 'mkdir -p schule/mathe/hausaufgaben'),
      ],
    },
    {
      id: 'touch',
      chapter: 'dateien',
      title: 'touch',
      subtitle: 'Leere Dateien',
      hint: 'touch DATEI [DATEI …]',
      require: ['touch'],
      tasks: [
        t('Erstelle die leere Datei <code>einkaufsliste.txt</code>.', 'touch einkaufsliste.txt'),
        t('Erstelle in <code>projekt</code> die Datei <code>LICENSE</code>.', 'touch projekt/LICENSE'),
        t('Erstelle <code>a.txt</code>, <code>b.txt</code> und <code>c.txt</code> mit einem Befehl.', 'touch a.txt b.txt c.txt'),
        t('Erstelle in <code>/tmp</code> die Datei <code>notiz.md</code>.', 'touch /tmp/notiz.md'),
        t('Erstelle in <code>projekt/src</code> die Datei <code>app.test.js</code>.', 'touch projekt/src/app.test.js'),
      ],
    },
    {
      id: 'cp',
      chapter: 'dateien',
      title: 'cp',
      subtitle: 'Dateien kopieren',
      hint: 'cp QUELLE ZIEL – ist das Ziel ein Ordner, behält die Kopie ihren Namen',
      require: ['cp'],
      tasks: [
        t('Kopiere <code>notizen.txt</code> nach <code>notizen-kopie.txt</code>.', 'cp notizen.txt notizen-kopie.txt'),
        t('Kopiere <code>Dokumente/einkauf.txt</code> in den Ordner <code>daten</code>.', 'cp Dokumente/einkauf.txt daten/'),
        t('Kopiere <code>obst.txt</code> nach <code>/tmp</code>.', 'cp obst.txt /tmp/'),
        t('Kopiere <code>Bilder/katze.png</code> nach <code>Dokumente</code> und nenne die Kopie <code>haustier.png</code>.', 'cp Bilder/katze.png Dokumente/haustier.png'),
        t('Kopiere <code>daten/namen.txt</code> und <code>daten/zahlen.txt</code> mit einem Befehl nach <code>Dokumente</code>.', 'cp daten/namen.txt daten/zahlen.txt Dokumente/'),
        t('Du bist in <code>projekt</code>. Kopiere <code>README.md</code> in dein Home-Verzeichnis.', 'cp README.md ~', { setup: cd('projekt') }),
        t('Kopiere alle <code>.jpg</code>-Dateien aus <code>Bilder</code> nach <code>/tmp</code>.', 'cp Bilder/*.jpg /tmp/'),
      ],
    },
    {
      id: 'cp-r',
      chapter: 'dateien',
      title: 'cp -r',
      subtitle: 'Ordner kopieren',
      hint: 'cp -r ORDNER ZIEL',
      require: ['cp'],
      tasks: [
        t('Kopiere den Ordner <code>Bilder</code> samt Inhalt nach <code>Bilder-Backup</code>.', 'cp -r Bilder Bilder-Backup'),
        t('Kopiere <code>projekt/docs</code> in den Ordner <code>Dokumente</code>.', 'cp -r projekt/docs Dokumente/'),
        t('Kopiere den Ordner <code>skripte</code> nach <code>/tmp</code>.', 'cp -r skripte /tmp/'),
        t('Kopiere <code>daten</code> in einen neuen Ordner <code>sicherung</code>.', 'cp -r daten sicherung'),
        t('Kopiere das ganze <code>projekt</code> nach <code>projekt-alt</code>.', 'cp -r projekt projekt-alt'),
      ],
    },
    {
      id: 'mv',
      chapter: 'dateien',
      title: 'mv',
      subtitle: 'Verschieben & umbenennen',
      hint: 'mv ALT NEU oder mv DATEI ORDNER/',
      require: ['mv'],
      tasks: [
        t('Benenne <code>obst.txt</code> in <code>fruechte.txt</code> um.', 'mv obst.txt fruechte.txt'),
        t('Verschiebe <code>kunden.csv</code> in den Ordner <code>daten</code>.', 'mv kunden.csv daten/'),
        t('Benenne den Ordner <code>Musik</code> in <code>Audio</code> um.', 'mv Musik Audio'),
        t('Verschiebe <code>Bilder/katze.png</code> nach <code>Dokumente</code>.', 'mv Bilder/katze.png Dokumente/'),
        t('Verschiebe <code>projekt/src/test.js</code> nach <code>projekt</code> und benenne sie dabei in <code>tests.js</code> um.', 'mv projekt/src/test.js projekt/tests.js'),
        t('Verschiebe <code>notizen.txt</code> und <code>obst.txt</code> mit einem Befehl nach <code>Dokumente</code>.', 'mv notizen.txt obst.txt Dokumente/'),
        t('Verschiebe alle <code>.jpg</code>-Dateien aus <code>Bilder</code> nach <code>Dokumente</code>.', 'mv Bilder/*.jpg Dokumente/'),
        t('Du bist in <code>Dokumente</code>. Verschiebe <code>bericht.txt</code> eine Ebene nach oben.', 'mv bericht.txt ..', { setup: cd('Dokumente') }),
      ],
    },
    {
      id: 'rm',
      chapter: 'dateien',
      title: 'rm',
      subtitle: 'Dateien löschen',
      hint: 'rm DATEI [DATEI …] – Wildcards funktionieren auch',
      require: ['rm'],
      tasks: [
        t('Lösche <code>obst.txt</code>.', 'rm obst.txt'),
        t('Lösche die versteckte Datei <code>projekt/.env</code>.', 'rm projekt/.env'),
        t('Lösche <code>a.log</code> und <code>b.log</code> mit einem Befehl.', 'rm a.log b.log', { setup: files({ 'a.log': 'a\n', 'b.log': 'b\n' }) }),
        t('Lösche alle <code>.tmp</code>-Dateien im aktuellen Ordner.', 'rm *.tmp', { setup: files({ 'x.tmp': '', 'y.tmp': '', 'z.tmp': '' }) }),
        t('Du bist in <code>daten</code>. Lösche <code>Dokumente/einkauf.txt</code>, ohne den Ordner zu wechseln.', 'rm ../Dokumente/einkauf.txt', { setup: cd('daten') }),
        t('Lösche alle Dateien in <code>Bilder</code>, die auf <code>.jpg</code> enden.', 'rm Bilder/*.jpg'),
        t('Lösche den leeren Ordner <code>Musik</code> (dafür gibt es einen eigenen Befehl).', 'rmdir Musik', { require: ['rmdir'] }),
      ],
    },
    {
      id: 'rm-r',
      chapter: 'dateien',
      title: 'rm -r',
      subtitle: 'Ordner löschen',
      hint: 'rm -r ORDNER (mit -f ohne Rückfragen und Fehlermeldungen)',
      require: ['rm'],
      tasks: [
        t('Lösche <code>projekt/docs</code> samt Inhalt.', 'rm -r projekt/docs'),
        t('Lösche den Ordner <code>Bilder</code> samt Inhalt.', 'rm -r Bilder'),
        t('Lösche den Ordner <code>/tmp/cache</code>.', 'rm -r /tmp/cache', { setup: files({ '/tmp/cache/a.bin': 'x', '/tmp/cache/b/c.bin': 'y' }) }),
        t('Lösche den Ordner <code>alt</code> und die Datei <code>alt.zip</code> mit einem Befehl.', 'rm -r alt alt.zip', { setup: files({ 'alt/x.txt': 'x\n', 'alt.zip': 'zip' }) }),
        t('Lösche <code>projekt/src</code> mit <code>-r</code> und <code>-f</code>.', 'rm -rf projekt/src'),
      ],
    },

    // ===== Dateiinhalte =====
    {
      id: 'cat',
      chapter: 'inhalte',
      title: 'cat',
      subtitle: 'Dateien anzeigen',
      hint: 'cat DATEI [DATEI …]',
      require: ['cat'],
      tasks: [
        t('Zeige den Inhalt von <code>obst.txt</code>.', 'cat obst.txt'),
        t('Zeige <code>projekt/README.md</code>.', 'cat projekt/README.md'),
        t('Zeige die Datei <code>/etc/hostname</code>.', 'cat /etc/hostname'),
        t('Zeige die versteckte Datei <code>.bashrc</code>.', 'cat .bashrc'),
        t('Zeige <code>notizen.txt</code> und <code>obst.txt</code> hintereinander mit einem Befehl.', 'cat notizen.txt obst.txt'),
        t('Zeige alle <code>.txt</code>-Dateien in <code>projekt/docs</code> mit einem Befehl.', 'cat projekt/docs/*.txt'),
      ],
    },
    {
      id: 'cat-n',
      chapter: 'inhalte',
      title: 'cat -n',
      subtitle: 'Mit Zeilennummern',
      hint: 'cat -n DATEI',
      require: ['cat'],
      tasks: [
        t('Zeige <code>obst.txt</code> mit Zeilennummern.', 'cat -n obst.txt'),
        t('Zeige <code>projekt/index.html</code> mit Zeilennummern.', 'cat -n projekt/index.html'),
        t('Zeige <code>logs/system.log</code> mit Zeilennummern.', 'cat -n logs/system.log'),
        t('Zeige <code>skripte/hallo.sh</code> mit Zeilennummern.', 'cat -n skripte/hallo.sh'),
        t('Zeige <code>projekt/src/utils.js</code> mit Zeilennummern.', 'cat -n projekt/src/utils.js'),
      ],
    },
    {
      id: 'echo-gt',
      chapter: 'inhalte',
      title: 'echo … >',
      subtitle: 'In Datei schreiben',
      hint: 'echo "TEXT" > DATEI (überschreibt!)',
      require: ['echo'],
      tasks: [
        t('Schreibe <code>Hallo</code> in die Datei <code>gruss.txt</code>.', 'echo "Hallo" > gruss.txt'),
        t('Schreibe <code>Max Mustermann</code> in <code>name.txt</code>.', 'echo "Max Mustermann" > name.txt'),
        t('Überschreibe <code>notizen.txt</code> mit dem Text <code>Neu angefangen</code>.', 'echo "Neu angefangen" > notizen.txt'),
        t('Schreibe <code>TODO: aufräumen</code> in <code>projekt/TODO.txt</code>.', 'echo "TODO: aufräumen" > projekt/TODO.txt'),
        t('Schreibe <code>test</code> in die Datei <code>/tmp/test.txt</code>.', 'echo "test" > /tmp/test.txt'),
        t('Schreibe deinen Benutzernamen in <code>ich.txt</code> – benutze die Variable <code>$USER</code>.', 'echo $USER > ich.txt', { contains: ['$USER'] }),
      ],
    },
    {
      id: 'echo-gtgt',
      chapter: 'inhalte',
      title: 'echo … >>',
      subtitle: 'An Datei anhängen',
      hint: 'echo "TEXT" >> DATEI',
      require: ['echo'],
      contains: ['>>'],
      tasks: [
        t('Hänge <code>Melone</code> an <code>obst.txt</code> an.', 'echo "Melone" >> obst.txt'),
        t('Hänge <code>Bezahlt</code> an <code>Dokumente/einkauf.txt</code> an.', 'echo "Bezahlt" >> Dokumente/einkauf.txt'),
        t('Hänge die Zeile <code>PORT=8080</code> an <code>projekt/.env</code> an.', 'echo "PORT=8080" >> projekt/.env'),
        t('Hänge <code>Tag 2</code> an <code>tagebuch.txt</code> an.', 'echo "Tag 2" >> tagebuch.txt', { setup: files({ 'tagebuch.txt': 'Tag 1\n' }) }),
        t('Hänge <code>Fertig</code> an <code>logs/system.log</code> an.', 'echo "Fertig" >> logs/system.log'),
      ],
    },
    {
      id: 'head',
      chapter: 'inhalte',
      title: 'head -n',
      subtitle: 'Der Anfang',
      hint: 'head -n ZAHL DATEI (ohne -n: 10 Zeilen)',
      require: ['head'],
      tasks: [
        t('Zeige die ersten 5 Zeilen von <code>logs/system.log</code>.', 'head -n 5 logs/system.log'),
        t('Zeige nur die Kopfzeile (erste Zeile) von <code>daten/staedte.csv</code>.', 'head -n 1 daten/staedte.csv'),
        t('Zeige die ersten 3 Zeilen von <code>obst.txt</code>.', 'head -n 3 obst.txt'),
        t('Zeige die ersten 2 Zeilen von <code>projekt/index.html</code>.', 'head -n 2 projekt/index.html'),
        t('Zeige die ersten 10 Zeilen von <code>Dokumente/einkauf.txt</code> – ohne Zahl anzugeben.', 'head Dokumente/einkauf.txt'),
        t('Zeige die ersten 4 Namen in <code>daten/namen.txt</code>.', 'head -n 4 daten/namen.txt'),
        t('Zeige jeweils die erste Zeile von <code>notizen.txt</code> und <code>obst.txt</code> mit einem Befehl.', 'head -n 1 notizen.txt obst.txt'),
      ],
    },
    {
      id: 'tail',
      chapter: 'inhalte',
      title: 'tail -n',
      subtitle: 'Das Ende',
      hint: 'tail -n ZAHL DATEI (ohne -n: 10 Zeilen)',
      require: ['tail'],
      tasks: [
        t('Zeige die letzten 3 Zeilen von <code>logs/system.log</code>.', 'tail -n 3 logs/system.log'),
        t('Zeige die letzte Zahl in <code>daten/zahlen.txt</code>.', 'tail -n 1 daten/zahlen.txt'),
        t('Zeige die letzten 2 Zeilen von <code>obst.txt</code>.', 'tail -n 2 obst.txt'),
        t('Zeige die letzten 5 Zeilen von <code>Dokumente/einkauf.txt</code>.', 'tail -n 5 Dokumente/einkauf.txt'),
        t('Zeige die letzte Zeile von <code>/etc/passwd</code>.', 'tail -n 1 /etc/passwd'),
        t('Zeige die letzten 10 Zeilen von <code>Dokumente/einkauf.txt</code> – ohne Zahl anzugeben.', 'tail Dokumente/einkauf.txt'),
        t('Zeige die letzten 2 Zeilen von <code>projekt/src/main.js</code>.', 'tail -n 2 projekt/src/main.js'),
      ],
    },
    {
      id: 'wc',
      chapter: 'inhalte',
      title: 'wc',
      subtitle: 'Zählen',
      hint: 'wc -l (Zeilen), -w (Wörter), -c (Bytes), ohne Option: alles',
      require: ['wc'],
      tasks: [
        t('Wie viele Zeilen hat <code>obst.txt</code>?', 'wc -l obst.txt'),
        t('Wie viele Zeilen hat <code>logs/system.log</code>?', 'wc -l logs/system.log'),
        t('Wie viele Wörter hat <code>Dokumente/bericht.txt</code>?', 'wc -w Dokumente/bericht.txt'),
        t('Wie viele Bytes hat <code>notizen.txt</code>?', 'wc -c notizen.txt'),
        t('Zeige Zeilen, Wörter und Bytes von <code>daten/namen.txt</code> auf einmal.', 'wc daten/namen.txt'),
        t('Zähle die Zeilen von <code>daten/namen.txt</code> und <code>daten/zahlen.txt</code> mit einem Befehl.', 'wc -l daten/namen.txt daten/zahlen.txt'),
        t('Wie viele Wörter hat <code>notizen.txt</code>?', 'wc -w notizen.txt'),
        t('Zähle die Zeilen aller <code>.js</code>-Dateien in <code>projekt/src</code>.', 'wc -l projekt/src/*.js'),
      ],
    },

    // ===== Suchen & Filtern =====
    {
      id: 'grep',
      chapter: 'suchen',
      title: 'grep',
      subtitle: 'Text suchen',
      hint: 'grep MUSTER DATEI',
      require: ['grep'],
      tasks: [
        t('Zeige alle Zeilen mit <code>WARN</code> in <code>logs/system.log</code>.', 'grep WARN logs/system.log'),
        t('Zeige alle Zeilen mit <code>Apfel</code> in <code>obst.txt</code>.', 'grep Apfel obst.txt'),
        t('Zeige alle Kunden aus <code>Berlin</code> in <code>kunden.csv</code>.', 'grep Berlin kunden.csv'),
        t('Finde die Zeile mit <code>TODO</code> in <code>projekt/README.md</code>.', 'grep TODO projekt/README.md'),
        t('Finde die Zeile mit <code>lerner</code> in <code>/etc/passwd</code>.', 'grep lerner /etc/passwd'),
        t('Zeige alle Log-Zeilen, die <code>backup</code> enthalten.', 'grep backup logs/system.log'),
        t('Zeige alle Zeilen mit <code>Tom</code> in <code>daten/namen.txt</code>.', 'grep Tom daten/namen.txt'),
        t('Suche <code>TODO</code> in allen <code>.js</code>-Dateien in <code>projekt/src</code>.', 'grep TODO projekt/src/*.js'),
      ],
    },
    {
      id: 'grep-i',
      chapter: 'suchen',
      title: 'grep -i',
      subtitle: 'Groß/klein egal',
      hint: 'grep -i MUSTER DATEI',
      require: ['grep'],
      tasks: [
        t('Suche <code>banane</code> in <code>obst.txt</code> – egal ob groß oder klein.', 'grep -i banane obst.txt'),
        t('Suche <code>error</code> in <code>logs/system.log</code> ohne auf Groß/klein zu achten.', 'grep -i error logs/system.log'),
        t('Suche <code>todo</code> in <code>projekt/README.md</code> ohne auf Groß/klein zu achten.', 'grep -i todo projekt/README.md'),
        t('Suche <code>BERLIN</code> in <code>kunden.csv</code> ohne auf Groß/klein zu achten.', 'grep -i BERLIN kunden.csv'),
        t('Suche <code>kunden</code> in <code>Dokumente/bericht.txt</code> ohne auf Groß/klein zu achten.', 'grep -i kunden Dokumente/bericht.txt'),
      ],
    },
    {
      id: 'grep-v',
      chapter: 'suchen',
      title: 'grep -v',
      subtitle: 'Zeilen ausschließen',
      hint: 'grep -v MUSTER DATEI zeigt alle Zeilen OHNE Treffer',
      require: ['grep'],
      tasks: [
        t('Zeige alle Zeilen in <code>logs/system.log</code>, die <strong>nicht</strong> <code>INFO</code> enthalten.', 'grep -v INFO logs/system.log'),
        t('Zeige alle Namen in <code>daten/namen.txt</code> außer <code>Tom</code>.', 'grep -v Tom daten/namen.txt'),
        t('Zeige alle Zeilen in <code>obst.txt</code> ohne <code>Apfel</code>.', 'grep -v Apfel obst.txt'),
        t('Zeige <code>.bashrc</code> ohne die Kommentarzeilen (die ein <code>#</code> enthalten).', 'grep -v "#" .bashrc'),
        t('Zeige <code>kunden.csv</code> ohne die Kopfzeile (die als einzige <code>id</code> enthält).', 'grep -v id kunden.csv'),
        t('Zeige <code>projekt/src/main.js</code> ohne Kommentare (Zeilen mit <code>//</code>).', 'grep -v "//" projekt/src/main.js'),
      ],
    },
    {
      id: 'grep-c',
      chapter: 'suchen',
      title: 'grep -c',
      subtitle: 'Treffer zählen',
      hint: 'grep -c MUSTER DATEI – kombinierbar, z. B. -ic oder -vc',
      require: ['grep'],
      tasks: [
        t('Wie viele Zeilen in <code>logs/system.log</code> enthalten <code>WARN</code>?', 'grep -c WARN logs/system.log'),
        t('Wie oft steht <code>Apfel</code> in <code>obst.txt</code>?', 'grep -c Apfel obst.txt'),
        t('Wie viele Kunden kommen aus <code>Wien</code>?', 'grep -c Wien kunden.csv'),
        t('Wie viele Log-Zeilen enthalten <strong>nicht</strong> <code>INFO</code>?', 'grep -vc INFO logs/system.log'),
        t('Wie viele Namen in <code>daten/namen.txt</code> enthalten ein <code>a</code> – egal ob groß oder klein?', 'grep -ic a daten/namen.txt'),
        t('Wie oft kommt <code>Lena</code> in <code>daten/namen.txt</code> vor?', 'grep -c Lena daten/namen.txt'),
      ],
    },
    {
      id: 'grep-n',
      chapter: 'suchen',
      title: 'grep -n',
      subtitle: 'Mit Zeilennummern',
      hint: 'grep -n MUSTER DATEI',
      require: ['grep'],
      tasks: [
        t('In welchen Zeilen von <code>logs/system.log</code> steht <code>ERROR</code>? Zeige die Zeilennummern.', 'grep -n ERROR logs/system.log'),
        t('Suche <code>Kiwi</code> in <code>obst.txt</code> mit Zeilennummern.', 'grep -n Kiwi obst.txt'),
        t('Suche <code>TODO</code> in <code>projekt/index.html</code> mit Zeilennummern.', 'grep -n TODO projekt/index.html'),
        t('Suche <code>return</code> in <code>projekt/src/utils.js</code> mit Zeilennummern.', 'grep -n return projekt/src/utils.js'),
        t('Suche <code>Tom</code> in <code>daten/namen.txt</code> mit Zeilennummern.', 'grep -n Tom daten/namen.txt'),
      ],
    },
    {
      id: 'grep-r',
      chapter: 'suchen',
      title: 'grep -r',
      subtitle: 'In Ordnern suchen',
      hint: 'grep -r MUSTER ORDNER (mit -l nur Dateinamen)',
      require: ['grep'],
      tasks: [
        t('Suche <code>TODO</code> in allen Dateien im Ordner <code>projekt</code> (rekursiv).', 'grep -r TODO projekt'),
        t('Suche <code>console</code> rekursiv in <code>projekt/src</code>.', 'grep -r console projekt/src'),
        t('Welche Dateien in <code>projekt</code> enthalten <code>TODO</code>? Zeige nur die Dateinamen.', 'grep -rl TODO projekt'),
        t('Suche <code>Frage</code> rekursiv im Ordner <code>projekt</code>.', 'grep -r Frage projekt'),
        t('Suche <code>lerner</code> rekursiv in <code>/etc</code>.', 'grep -r lerner /etc'),
        t('Suche <code>hallo</code> rekursiv in <code>projekt</code> – egal ob groß oder klein.', 'grep -ri hallo projekt'),
      ],
    },
    {
      id: 'find-name',
      chapter: 'suchen',
      title: 'find -name',
      subtitle: 'Dateien nach Namen',
      hint: 'find ORT -name "MUSTER" – Muster in Anführungszeichen',
      require: ['find'],
      tasks: [
        t('Finde alle <code>.js</code>-Dateien im Ordner <code>projekt</code>.', 'find projekt -name "*.js"'),
        t('Finde alle <code>.jpg</code>-Dateien ab dem aktuellen Ordner (<code>.</code>).', 'find . -name "*.jpg"'),
        t('Wo liegt die Datei <code>faq.txt</code>? Suche ab dem aktuellen Ordner.', 'find . -name faq.txt'),
        t('Finde alles ab dem aktuellen Ordner, dessen Name mit <code>n</code> beginnt.', 'find . -name "n*"'),
        t('Finde alle <code>.csv</code>-Dateien ab dem aktuellen Ordner.', 'find . -name "*.csv"'),
        t('Finde alle <code>.md</code>-Dateien in <code>projekt</code>.', 'find projekt -name "*.md"'),
        t('Finde <code>readme.md</code> ab dem aktuellen Ordner – egal ob groß oder klein geschrieben.', 'find . -iname readme.md'),
      ],
    },
    {
      id: 'find-type',
      chapter: 'suchen',
      title: 'find -type',
      subtitle: 'Nur Dateien oder Ordner',
      hint: 'find ORT -type f (Dateien) bzw. -type d (Ordner)',
      require: ['find'],
      tasks: [
        t('Finde alle Ordner in <code>projekt</code>.', 'find projekt -type d'),
        t('Finde alle Dateien in <code>projekt</code>.', 'find projekt -type f'),
        t('Finde alle Ordner ab dem aktuellen Ordner.', 'find . -type d'),
        t('Finde alle Dateien in <code>daten</code>.', 'find daten -type f'),
        t('Finde alle <strong>Dateien</strong> mit der Endung <code>.txt</code> in <code>projekt</code>.', 'find projekt -type f -name "*.txt"'),
        t('Finde alle Dateien in <code>Bilder</code>.', 'find Bilder -type f'),
      ],
    },
    {
      id: 'sort',
      chapter: 'suchen',
      title: 'sort',
      subtitle: 'Sortieren',
      hint: 'sort DATEI, -r rückwärts, -u ohne Duplikate',
      require: ['sort'],
      tasks: [
        t('Sortiere <code>obst.txt</code> alphabetisch.', 'sort obst.txt'),
        t('Sortiere <code>daten/namen.txt</code> rückwärts (Z bis A).', 'sort -r daten/namen.txt'),
        t('Sortiere <code>Dokumente/einkauf.txt</code> alphabetisch.', 'sort Dokumente/einkauf.txt'),
        t('Sortiere <code>obst.txt</code> und entferne dabei Duplikate.', 'sort -u obst.txt'),
        t('Sortiere <code>daten/staedte.csv</code>.', 'sort daten/staedte.csv'),
        t('Sortiere <code>Dokumente/einkauf.txt</code> rückwärts.', 'sort -r Dokumente/einkauf.txt'),
      ],
    },
    {
      id: 'sort-n',
      chapter: 'suchen',
      title: 'sort -n',
      subtitle: 'Zahlen sortieren',
      hint: 'sort -n DATEI, absteigend mit -nr',
      require: ['sort'],
      tasks: [
        t('Sortiere <code>daten/zahlen.txt</code> numerisch aufsteigend.', 'sort -n daten/zahlen.txt'),
        t('Sortiere <code>daten/zahlen.txt</code> numerisch absteigend.', 'sort -nr daten/zahlen.txt'),
        t('Zeige nur die <strong>kleinste</strong> Zahl aus <code>daten/zahlen.txt</code> (sort + head).', 'sort -n daten/zahlen.txt | head -n 1'),
        t('Zeige nur die <strong>größte</strong> Zahl aus <code>daten/zahlen.txt</code> (sort + tail).', 'sort -n daten/zahlen.txt | tail -n 1'),
        t('Zeige die drei größten Zahlen aus <code>daten/zahlen.txt</code>, größte zuerst.', 'sort -nr daten/zahlen.txt | head -n 3'),
        t('Sortiere <code>werte.txt</code> numerisch.', 'sort -n werte.txt', { setup: files({ 'werte.txt': '5\n12\n1\n33\n9\n' }) }),
      ],
    },
    {
      id: 'uniq',
      chapter: 'suchen',
      title: 'sort | uniq',
      subtitle: 'Duplikate & Häufigkeiten',
      hint: 'sort DATEI | uniq – mit -c zählen, -d nur doppelte, -u nur einmalige',
      require: ['uniq'],
      tasks: [
        t('Zeige jeden Namen aus <code>daten/namen.txt</code> nur einmal.', 'sort daten/namen.txt | uniq'),
        t('Wie oft kommt jede Obstsorte in <code>obst.txt</code> vor?', 'sort obst.txt | uniq -c'),
        t('Zeige nur die Namen, die <strong>mehrfach</strong> vorkommen.', 'sort daten/namen.txt | uniq -d'),
        t('Zeige nur die Namen, die <strong>genau einmal</strong> vorkommen.', 'sort daten/namen.txt | uniq -u'),
        t('Zähle die Namen und zeige den häufigsten oben.', 'sort daten/namen.txt | uniq -c | sort -nr'),
        t('Wie viele <strong>verschiedene</strong> Einträge hat <code>obst.txt</code>? Gib nur die Zahl aus.', 'sort obst.txt | uniq | wc -l'),
      ],
    },
    {
      id: 'cut',
      chapter: 'suchen',
      title: 'cut -d -f',
      subtitle: 'Spalten ausschneiden',
      hint: 'cut -d TRENNER -f FELDER DATEI – Sonderzeichen wie ; in Anführungszeichen',
      require: ['cut'],
      tasks: [
        t('Zeige nur die Städte (Spalte 1) aus <code>daten/staedte.csv</code>. Trenner: Komma.', 'cut -d , -f 1 daten/staedte.csv'),
        t('Zeige nur die Einwohnerzahlen (Spalte 3) aus <code>daten/staedte.csv</code>.', 'cut -d , -f 3 daten/staedte.csv'),
        t('Zeige nur die Namen (Spalte 2) aus <code>kunden.csv</code>. Trenner: <code>;</code>', 'cut -d ";" -f 2 kunden.csv'),
        t('Zeige Name und Stadt (Spalten 2 und 3) aus <code>kunden.csv</code>.', 'cut -d ";" -f 2,3 kunden.csv'),
        t('Zeige alle Benutzernamen aus <code>/etc/passwd</code> (Spalte 1, Trenner <code>:</code>).', 'cut -d : -f 1 /etc/passwd'),
        t('Zeige die Home-Verzeichnisse aus <code>/etc/passwd</code> (Spalte 6).', 'cut -d : -f 6 /etc/passwd'),
        t('Zeige die Spalten 1 bis 2 aus <code>daten/staedte.csv</code>.', 'cut -d , -f 1-2 daten/staedte.csv'),
      ],
    },
    {
      id: 'pipes',
      chapter: 'suchen',
      title: 'Pipes |',
      subtitle: 'Befehle kombinieren',
      hint: 'befehl1 | befehl2 | befehl3',
      contains: ['|'],
      tasks: [
        t('Wie viele Einträge liegen in <code>projekt/src</code>? Gib nur die Zahl aus.', 'ls projekt/src | wc -l'),
        t('Wie viele Zeilen in <code>logs/system.log</code> enthalten <code>ERROR</code>? Nutze grep und wc.', 'grep ERROR logs/system.log | wc -l'),
        t('Zeige die ersten 3 Namen aus <code>daten/namen.txt</code> in alphabetischer Reihenfolge.', 'sort daten/namen.txt | head -n 3'),
        t('Zeige jede Stadt (Spalte 3) aus <code>kunden.csv</code> nur einmal, sortiert.', 'cut -d ";" -f 3 kunden.csv | sort | uniq'),
        t('Zeige die letzten 3 Log-Zeilen, die <code>INFO</code> enthalten.', 'grep INFO logs/system.log | tail -n 3'),
        t('Wie viele <code>.jpg</code>-Dateien gibt es ab dem aktuellen Ordner? Gib nur die Zahl aus.', 'find . -name "*.jpg" | wc -l'),
        t('Zeige die Uhrzeiten (Spalte 2, Trenner Leerzeichen) aller <code>ERROR</code>-Zeilen im Log.', 'grep ERROR logs/system.log | cut -d " " -f 2'),
        t('Zeige die zwei höchsten Umsätze (Spalte 4) aus <code>kunden.csv</code>, höchster zuerst.', 'cut -d ";" -f 4 kunden.csv | sort -nr | head -n 2'),
      ],
    },

    // ===== Rechte & Skripte =====
    {
      id: 'chmod-sym',
      chapter: 'rechte',
      title: 'chmod u+x, go-r …',
      subtitle: 'Rechte symbolisch',
      hint: 'chmod WER±RECHT DATEI – wer: u, g, o, a; Recht: r, w, x',
      require: ['chmod'],
      tasks: [
        t('Mach <code>projekt/src/main.js</code> ausführbar.', 'chmod +x projekt/src/main.js'),
        t('Entziehe Gruppe und Anderen das Leserecht für <code>projekt/.env</code>.', 'chmod go-r projekt/.env'),
        t('Nimm dir (dem Besitzer) das Schreibrecht für <code>notizen.txt</code>.', 'chmod u-w notizen.txt'),
        t('Mach <code>skripte/hallo.sh</code> nur für dich (den Besitzer) ausführbar.', 'chmod u+x skripte/hallo.sh'),
        t('Gib allen Schreibrecht auf <code>/tmp/gemeinsam.txt</code>.', 'chmod a+w /tmp/gemeinsam.txt', { setup: files({ '/tmp/gemeinsam.txt': '' }) }),
        t('<code>skripte/hallo.sh</code> ist ausführbar. Entferne das Ausführrecht für alle.', 'chmod -x skripte/hallo.sh', { setup: run('chmod +x skripte/hallo.sh') }),
      ],
    },
    {
      id: 'chmod-num',
      chapter: 'rechte',
      title: 'chmod 644, 755 …',
      subtitle: 'Rechte als Zahl',
      hint: 'r=4, w=2, x=1 – pro Gruppe addieren. rwx=7, rw-=6, r-x=5, r--=4',
      require: ['chmod'],
      tasks: [
        t('Setze <code>notizen.txt</code> auf <code>rwx------</code>.', 'chmod 700 notizen.txt'),
        t('Setze <code>skripte/hallo.sh</code> auf <code>rwxr-xr-x</code>.', 'chmod 755 skripte/hallo.sh'),
        t('Setze <code>projekt/.env</code> auf <code>rw-------</code>.', 'chmod 600 projekt/.env'),
        t('Setze <code>obst.txt</code> auf <code>r--r--r--</code>.', 'chmod 444 obst.txt'),
        t('Setze <code>kunden.csv</code> auf <code>rw-rw-r--</code>.', 'chmod 664 kunden.csv'),
        t('<code>projekt/index.html</code> hat <code>rw-------</code>. Setze sie auf <code>rw-r--r--</code>.', 'chmod 644 projekt/index.html', { setup: run('chmod 600 projekt/index.html') }),
        t('Setze den Ordner <code>projekt</code> auf <code>rwx------</code>.', 'chmod 700 projekt'),
        t('Setze <code>/tmp/skript.sh</code> auf <code>rwxrwxrwx</code>.', 'chmod 777 /tmp/skript.sh', { setup: files({ '/tmp/skript.sh': 'echo hi\n' }) }),
      ],
    },
    {
      id: 'skripte',
      chapter: 'rechte',
      title: './skript.sh',
      subtitle: 'Skripte starten',
      hint: './PFAD startet ausführbare Dateien, bash DATEI geht auch ohne x-Recht',
      tasks: [
        t('Führe <code>skripte/hallo.sh</code> mit <code>bash</code> aus, ohne es ausführbar zu machen.', 'bash skripte/hallo.sh', { require: ['bash'] }),
        t('Mach <code>skripte/hallo.sh</code> ausführbar und starte es – in einer Zeile.', 'chmod +x skripte/hallo.sh && ./skripte/hallo.sh', { contains: ['./'] }),
        t('Starte das ausführbare Skript <code>/tmp/info.sh</code>.', '/tmp/info.sh', {
          setup: all(files({ '/tmp/info.sh': '#!/bin/bash\necho "Benutzer:"\nwhoami\n' }), run('chmod +x /tmp/info.sh')),
        }),
        t('Du bist in <code>skripte</code>. Starte <code>hallo.sh</code>, das schon ausführbar ist.', './hallo.sh', {
          setup: all(run('chmod +x skripte/hallo.sh'), cd('skripte')),
        }),
        t('Erstelle das Skript <code>hi.sh</code> mit dem Inhalt <code>echo Hi</code>.', 'echo "echo Hi" > hi.sh'),
        t('Mach <code>hi.sh</code> ausführbar und starte es.', 'chmod +x hi.sh && ./hi.sh', { setup: files({ 'hi.sh': 'echo Hi\n' }) }),
      ],
    },

    // ===== Profi-Tricks =====
    {
      id: 'ketten',
      chapter: 'profi',
      title: '&& und ;',
      subtitle: 'Befehle verketten',
      hint: 'a && b führt b nur aus, wenn a geklappt hat; a ; b immer',
      contains: ['&&'],
      tasks: [
        t('Lege den Ordner <code>neu</code> an und wechsle hinein – in einer Zeile mit <code>&amp;&amp;</code>.', 'mkdir neu && cd neu'),
        t('Lege den Ordner <code>ablage</code> an und darin die leere Datei <code>x.txt</code> – in einer Zeile.', 'mkdir ablage && touch ablage/x.txt'),
        t('Kopiere <code>notizen.txt</code> nach <code>/tmp</code> und lösche danach das Original – in einer Zeile.', 'cp notizen.txt /tmp/ && rm notizen.txt'),
        t('Lege <code>logs-alt</code> an und verschiebe <code>logs/system.log</code> hinein – in einer Zeile.', 'mkdir logs-alt && mv logs/system.log logs-alt/'),
        t('Wechsle nach <code>projekt</code> und lösche dort <code>style.css</code> – in einer Zeile.', 'cd projekt && rm style.css'),
      ],
    },
    {
      id: 'variablen',
      chapter: 'profi',
      title: '$VARIABLEN',
      subtitle: 'Variablen nutzen',
      hint: 'echo $NAME liest eine Variable, NAME=wert setzt sie',
      tasks: [
        t('Gib dein Home-Verzeichnis mit der Variable <code>HOME</code> aus.', 'echo $HOME', { contains: ['$HOME'] }),
        t('Gib deinen Benutzernamen mit der Variable <code>USER</code> aus.', 'echo $USER', { contains: ['$USER'] }),
        t('Gib <code>Ich bin lerner</code> aus – den Namen über <code>$USER</code>.', 'echo "Ich bin $USER"', { contains: ['$USER'] }),
        t('Setze <code>NAME=Welt</code> und gib dann <code>Hallo Welt</code> mit <code>$NAME</code> aus – in einer Zeile.', 'NAME=Welt; echo "Hallo $NAME"', { contains: ['$NAME'] }),
        t('Du bist in <code>/etc</code>. Wechsle mit der Variable <code>HOME</code> nach Hause.', 'cd $HOME', { contains: ['$HOME'], setup: cd('/etc') }),
        t('Gib den aktuellen Ordner mit der Variable <code>PWD</code> aus.', 'echo $PWD', { contains: ['$PWD'], setup: cd('daten') }),
      ],
    },
    {
      id: 'speichern',
      chapter: 'profi',
      title: 'befehl > datei',
      subtitle: 'Ergebnisse speichern',
      hint: 'Jede Ausgabe lässt sich mit > speichern oder mit >> anhängen',
      contains: ['>'],
      tasks: [
        t('Speichere die Liste der Dateien in <code>Bilder</code> in <code>bilder.txt</code>.', 'ls Bilder > bilder.txt'),
        t('Speichere alle <code>ERROR</code>-Zeilen des Logs in <code>fehler.txt</code>.', 'grep ERROR logs/system.log > fehler.txt'),
        t('Speichere <code>obst.txt</code> sortiert in <code>obst-sortiert.txt</code>.', 'sort obst.txt > obst-sortiert.txt'),
        t('Hänge die Zeilenzahl von <code>obst.txt</code> (mit <code>wc -l obst.txt</code>) an <code>statistik.txt</code> an.', 'wc -l obst.txt >> statistik.txt', {
          setup: files({ 'statistik.txt': 'Statistik\n' }),
        }),
        t('Speichere jeden Namen aus <code>daten/namen.txt</code> nur einmal in <code>namen-einmal.txt</code>.', 'sort daten/namen.txt | uniq > namen-einmal.txt'),
        t('Speichere die Pfade aller <code>.js</code>-Dateien in <code>projekt</code> in <code>js-dateien.txt</code>.', 'find projekt -name "*.js" > js-dateien.txt'),
      ],
    },
  ];

  // --- Prüfung -----------------------------------------------------------------

  // Bildet das Dateisystem als { pfad: beschreibung } ab (ohne Zeitstempel).
  function snapshot(shell) {
    const map = {};
    const walk = (node, path) => {
      map[path || '/'] = node.type === 'dir' ? 'd' + node.mode : 'f' + node.mode + ':' + node.content;
      if (node.type === 'dir') for (const [name, child] of Object.entries(node.children)) walk(child, path + '/' + name);
    };
    walk(shell.root, '');
    return { files: map, cwd: shell.cwd };
  }

  function normalizeOutput(s) {
    return LS.stripColors(s)
      .split(H + '/')
      .join('./')
      .replace(/\b\d{2}:\d{2}\b/g, 'hh:mm')
      .split('\n')
      .map((l) => l.replace(/\s+$/, ''))
      .join('\n')
      .trim();
  }

  const uses = (line, cmd) => new RegExp('(^|[|;&]\\s*)' + cmd + '(\\s|$)').test(line.trim());

  // Bereitet eine Aufgabe vor: liefert setup(shell) und check(ctx).
  function prepare(drill, task) {
    const setup = (shell) => {
      addFiles(shell, EXTRA_FILES);
      if (drill.setup) drill.setup(shell);
      if (task.setup) task.setup(shell);
    };

    const ref = new LS.Shell();
    setup(ref);
    const before = snapshot(ref);
    const refOutput = normalizeOutput(ref.run(task.solution).output);
    const after = snapshot(ref);

    const keys = new Set([...Object.keys(before.files), ...Object.keys(after.files)]);
    const changed = [...keys].filter((k) => before.files[k] !== after.files[k]);
    const cwdChanged = before.cwd !== after.cwd;
    const mode = changed.length || cwdChanged ? 'state' : 'output';

    const needs = task.require || drill.require || [];
    const contains = task.contains || drill.contains || [];

    const check = ({ shell, line, output }) => {
      if (!needs.every((c) => uses(line, c))) return false;
      if (!contains.every((c) => line.includes(c))) return false;
      if (mode === 'output') return refOutput !== '' && normalizeOutput(output) === refOutput;
      const now = snapshot(shell);
      return changed.every((k) => now.files[k] === after.files[k]) && (!cwdChanged || now.cwd === after.cwd);
    };

    return { setup, check, mode, refOutput, changed };
  }

  const taskCount = DRILLS.reduce((n, d) => n + d.tasks.length, 0);

  const api = { DRILLS, prepare, taskCount, EXTRA_FILES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.Drills = api;
})(typeof window !== 'undefined' ? window : globalThis);
