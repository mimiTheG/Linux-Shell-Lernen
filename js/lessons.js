// Kapitel und Übungen. Jede Übung startet mit einem frischen Dateisystem.
// check({ shell, line, output }) wird nach jedem Befehl aufgerufen und
// gibt true zurück, sobald die Aufgabe gelöst ist.
(function (global) {
  'use strict';

  const H = '/home/lerner';
  // Prüft, ob die Zeile einen bestimmten Befehl (als eigenes Wort) aufruft.
  const uses = (line, cmd) => new RegExp('(^|[|;&]\\s*)' + cmd + '(\\s|$)').test(line.trim());
  const has = (line, s) => line.includes(s);

  const CHAPTERS = [
    {
      id: 'orientierung',
      title: 'Orientierung',
      icon: '🧭',
      intro: 'Wo bin ich, und was liegt hier? Die ersten Befehle, um sich im Dateisystem zurechtzufinden.',
      exercises: [
        {
          id: 'pwd',
          title: 'Wo bin ich?',
          task: 'Finde heraus, in welchem Verzeichnis du dich gerade befindest.',
          explain:
            '<code>pwd</code> steht für „print working directory“. Es zeigt den vollständigen Pfad des aktuellen Ordners. Dein persönlicher Ordner heißt <em>Home-Verzeichnis</em> und wird oft mit <code>~</code> abgekürzt.',
          hint: 'Der Befehl hat drei Buchstaben: p, w, d.',
          solution: 'pwd',
          check: ({ line, output }) => uses(line, 'pwd') && output.includes(H),
        },
        {
          id: 'ls',
          title: 'Was liegt hier?',
          task: 'Liste den Inhalt deines aktuellen Verzeichnisses auf.',
          explain: '<code>ls</code> (list) zeigt Dateien und Ordner. Ordner erscheinen blau.',
          hint: 'Zwei Buchstaben: l und s.',
          solution: 'ls',
          check: ({ line }) => uses(line, 'ls'),
        },
        {
          id: 'ls-a',
          title: 'Versteckte Dateien',
          task: 'In deinem Home-Verzeichnis gibt es versteckte Dateien. Mach sie sichtbar!',
          explain:
            'Dateien, deren Name mit einem Punkt beginnt (z. B. <code>.bashrc</code>), sind versteckt. Mit der Option <code>-a</code> (all) zeigt <code>ls</code> sie trotzdem an.',
          hint: 'Hänge an ls eine Option an: ls -…',
          solution: 'ls -a',
          check: ({ output }) => output.includes('.geheim'),
        },
        {
          id: 'ls-l',
          title: 'Details anzeigen',
          task: 'Zeige den Inhalt deines Home-Verzeichnisses als ausführliche Liste mit Rechten, Größe und Datum.',
          explain:
            'Mit <code>ls -l</code> (long) bekommst du eine Zeile pro Eintrag. Das erste Zeichen verrät den Typ: <code>d</code> = Ordner, <code>-</code> = Datei. Optionen lassen sich kombinieren: <code>ls -la</code>.',
          hint: 'Die Option ist ein kleines L.',
          solution: 'ls -l',
          check: ({ line, output }) => uses(line, 'ls') && /-l|ll/.test(line) && output.includes('drwx'),
        },
        {
          id: 'cd',
          title: 'Ordner wechseln',
          task: 'Wechsle in den Ordner <code>Dokumente</code>.',
          explain:
            '<code>cd</code> (change directory) wechselt den Ordner. Achtung: Linux unterscheidet Groß- und Kleinschreibung! Tipp: Tippe <code>cd Do</code> und drücke <kbd>Tab</kbd> – der Name wird vervollständigt.',
          hint: 'cd gefolgt vom Ordnernamen.',
          solution: 'cd Dokumente',
          check: ({ shell }) => shell.cwd === H + '/Dokumente',
        },
        {
          id: 'cd-up',
          title: 'Eine Ebene nach oben',
          task: 'Du bist jetzt in <code>Dokumente</code>. Gehe eine Ebene nach oben zurück ins Home-Verzeichnis.',
          explain: '<code>..</code> steht immer für den übergeordneten Ordner, <code>.</code> für den aktuellen.',
          hint: 'cd mit zwei Punkten.',
          solution: 'cd ..',
          setup: (shell) => shell.run('cd Dokumente', { noHistory: true }),
          check: ({ shell }) => shell.cwd === H,
        },
        {
          id: 'cd-abs',
          title: 'Absolute Pfade',
          task: 'Springe direkt in das Verzeichnis <code>/etc</code> und schau dir an, was dort liegt.',
          explain:
            'Pfade, die mit <code>/</code> beginnen, sind <em>absolut</em> – sie starten an der Wurzel des Dateisystems. Alle anderen sind <em>relativ</em> zum aktuellen Ordner.',
          hint: 'Erst cd /etc, dann ls. Du kannst beides mit ; in eine Zeile schreiben.',
          solution: 'cd /etc; ls',
          check: ({ shell, line }) => shell.cwd === '/etc' && uses(line, 'ls'),
        },
        {
          id: 'cd-home',
          title: 'Ab nach Hause',
          task: 'Du bist irgendwo in <code>/etc</code>. Kehre auf dem kürzesten Weg in dein Home-Verzeichnis zurück.',
          explain: '<code>cd</code> ohne Argument oder <code>cd ~</code> bringt dich immer nach Hause.',
          hint: 'Probier mal cd ganz ohne Ziel.',
          solution: 'cd',
          setup: (shell) => shell.run('cd /etc', { noHistory: true }),
          check: ({ shell }) => shell.cwd === H,
        },
      ],
    },
    {
      id: 'dateien',
      title: 'Dateien & Ordner',
      icon: '📁',
      intro: 'Anlegen, kopieren, verschieben, löschen – das tägliche Handwerk.',
      exercises: [
        {
          id: 'mkdir',
          title: 'Ordner anlegen',
          task: 'Lege einen neuen Ordner namens <code>projekt</code> an.',
          explain: '<code>mkdir</code> (make directory) erstellt einen Ordner.',
          hint: 'mkdir NAME',
          solution: 'mkdir projekt',
          check: ({ shell }) => shell.isDir(H + '/projekt'),
        },
        {
          id: 'touch',
          title: 'Leere Datei',
          task: 'Erstelle eine leere Datei <code>todo.txt</code> im Home-Verzeichnis.',
          explain: '<code>touch</code> legt eine leere Datei an – oder aktualisiert das Datum einer bestehenden.',
          hint: 'touch DATEINAME',
          solution: 'touch todo.txt',
          check: ({ shell }) => shell.isFile(H + '/todo.txt'),
        },
        {
          id: 'mkdir-p',
          title: 'Verschachtelte Ordner',
          task: 'Lege mit <em>einem</em> Befehl die Ordnerstruktur <code>web/css/themes</code> an.',
          explain:
            'Normalerweise scheitert <code>mkdir</code>, wenn der Elternordner fehlt. Mit <code>-p</code> (parents) werden alle fehlenden Ordner mit angelegt.',
          hint: 'mkdir mit der Option -p',
          solution: 'mkdir -p web/css/themes',
          check: ({ shell }) => shell.isDir(H + '/web/css/themes'),
        },
        {
          id: 'cp',
          title: 'Kopieren',
          task: 'Erstelle eine Sicherheitskopie von <code>notizen.txt</code> mit dem Namen <code>notizen.bak</code>.',
          explain: '<code>cp QUELLE ZIEL</code> kopiert eine Datei. Das Original bleibt erhalten.',
          hint: 'cp notizen.txt …',
          solution: 'cp notizen.txt notizen.bak',
          check: ({ shell }) => shell.isFile(H + '/notizen.bak') && shell.isFile(H + '/notizen.txt'),
        },
        {
          id: 'mv-rename',
          title: 'Umbenennen',
          task: 'Benenne die Datei <code>notizen.txt</code> in <code>ideen.txt</code> um.',
          explain: 'Einen eigenen Befehl zum Umbenennen gibt es nicht – man „verschiebt“ die Datei mit <code>mv</code> unter einen neuen Namen.',
          hint: 'mv ALT NEU',
          solution: 'mv notizen.txt ideen.txt',
          check: ({ shell }) => shell.isFile(H + '/ideen.txt') && !shell.exists(H + '/notizen.txt'),
        },
        {
          id: 'mv-move',
          title: 'Verschieben',
          task: 'Im Home-Verzeichnis liegt <code>lied.mp3</code>. Verschiebe sie in den Ordner <code>Musik</code>.',
          explain: 'Ist das Ziel von <code>mv</code> ein Ordner, wird die Datei dort hinein verschoben und behält ihren Namen.',
          hint: 'mv DATEI ORDNER/',
          solution: 'mv lied.mp3 Musik/',
          setup: (shell) => shell.writeFile(H + '/lied.mp3', '[Binärdaten: Musik]\n'),
          check: ({ shell }) => shell.isFile(H + '/Musik/lied.mp3') && !shell.exists(H + '/lied.mp3'),
        },
        {
          id: 'wildcard',
          title: 'Wildcards',
          task: 'Kopiere <em>alle</em> <code>.jpg</code>-Dateien aus <code>Bilder</code> in den (schon vorhandenen) Ordner <code>auswahl</code> – mit einem einzigen Befehl.',
          explain:
            'Der Stern <code>*</code> steht für „beliebig viele Zeichen“. <code>Bilder/*.jpg</code> passt also auf alle Dateien in <code>Bilder</code>, die auf <code>.jpg</code> enden. Die Shell ersetzt das Muster vor der Ausführung durch die passenden Namen.',
          hint: 'cp Bilder/*.jpg …',
          solution: 'cp Bilder/*.jpg auswahl/',
          setup: (shell) => shell.run('mkdir auswahl', { noHistory: true }),
          check: ({ shell }) =>
            shell.isFile(H + '/auswahl/urlaub.jpg') && shell.isFile(H + '/auswahl/berge.jpg') && !shell.exists(H + '/auswahl/katze.png'),
        },
        {
          id: 'rm',
          title: 'Datei löschen',
          task: 'Lösche die Datei <code>muell.txt</code>.',
          explain: '<code>rm</code> (remove) löscht Dateien <strong>endgültig</strong> – es gibt keinen Papierkorb!',
          hint: 'rm DATEI',
          solution: 'rm muell.txt',
          setup: (shell) => shell.writeFile(H + '/muell.txt', 'weg damit\n'),
          check: ({ shell }) => !shell.exists(H + '/muell.txt'),
        },
        {
          id: 'rm-r',
          title: 'Ordner löschen',
          task: 'Lösche den Ordner <code>alt</code> samt seinem gesamten Inhalt.',
          explain:
            'Ein Ordner mit Inhalt lässt sich nur mit <code>rm -r</code> (rekursiv) löschen. <code>rmdir</code> funktioniert nur bei leeren Ordnern. Mit <code>rm -rf</code> immer doppelt hinschauen!',
          hint: 'rm mit der Option -r',
          solution: 'rm -r alt',
          setup: (shell) => shell.run('mkdir -p alt/2019 && touch alt/a.txt alt/2019/b.txt', { noHistory: true }),
          check: ({ shell }) => !shell.exists(H + '/alt'),
        },
      ],
    },
    {
      id: 'inhalte',
      title: 'Dateiinhalte',
      icon: '📄',
      intro: 'Dateien anzeigen, Text schreiben und Teile davon herausholen.',
      exercises: [
        {
          id: 'cat',
          title: 'Datei anzeigen',
          task: 'Zeige den Inhalt der Datei <code>notizen.txt</code> an.',
          explain: '<code>cat</code> gibt den kompletten Inhalt einer Datei aus. Bei langen Dateien nutzt man oft <code>less</code>.',
          hint: 'cat DATEI',
          solution: 'cat notizen.txt',
          check: ({ output }) => output.includes('Linux lernen macht Spaß'),
        },
        {
          id: 'echo',
          title: 'Text ausgeben',
          task: 'Gib den Text <code>Hallo Welt</code> im Terminal aus.',
          explain: '<code>echo</code> gibt einfach seine Argumente aus. Texte mit Leerzeichen setzt man am besten in Anführungszeichen.',
          hint: 'echo "…"',
          solution: 'echo "Hallo Welt"',
          check: ({ line, output }) => uses(line, 'echo') && output.trim() === 'Hallo Welt',
        },
        {
          id: 'redirect',
          title: 'In Datei schreiben',
          task: 'Schreibe den Text <code>Einkaufen gehen</code> in eine neue Datei <code>aufgabe.txt</code>.',
          explain:
            'Das Zeichen <code>&gt;</code> leitet die Ausgabe eines Befehls in eine Datei um, statt sie anzuzeigen. Achtung: Eine vorhandene Datei wird dabei <strong>überschrieben</strong>.',
          hint: 'echo "…" > DATEI',
          solution: 'echo "Einkaufen gehen" > aufgabe.txt',
          check: ({ shell }) => (shell.readFile(H + '/aufgabe.txt') || '').trim() === 'Einkaufen gehen',
        },
        {
          id: 'append',
          title: 'An Datei anhängen',
          task: 'Hänge die Zeile <code>Butter</code> an die Datei <code>liste.txt</code> an, ohne den bisherigen Inhalt zu verlieren.',
          explain: 'Mit <code>&gt;&gt;</code> wird die Ausgabe ans Ende der Datei angehängt statt sie zu überschreiben.',
          hint: 'Zwei Größer-Zeichen: >>',
          solution: 'echo "Butter" >> liste.txt',
          setup: (shell) => shell.writeFile(H + '/liste.txt', 'Milch\nBrot\n'),
          check: ({ shell }) => shell.readFile(H + '/liste.txt') === 'Milch\nBrot\nButter\n',
        },
        {
          id: 'head',
          title: 'Der Anfang',
          task: 'Zeige nur die <strong>ersten 3 Zeilen</strong> von <code>Dokumente/einkauf.txt</code>.',
          explain: '<code>head</code> zeigt den Anfang einer Datei – standardmäßig 10 Zeilen. Mit <code>-n ZAHL</code> legst du die Anzahl fest.',
          hint: 'head -n 3 …',
          solution: 'head -n 3 Dokumente/einkauf.txt',
          check: ({ output }) => output.trim() === 'Milch\nBrot\nÄpfel',
        },
        {
          id: 'tail',
          title: 'Das Ende',
          task: 'Zeige die <strong>letzten 2 Zeilen</strong> der Logdatei <code>logs/system.log</code>.',
          explain: '<code>tail</code> ist das Gegenstück zu <code>head</code>. Besonders praktisch bei Logdateien, wo die neuesten Einträge unten stehen.',
          hint: 'tail -n 2 …',
          solution: 'tail -n 2 logs/system.log',
          check: ({ output }) => {
            const l = output.trim().split('\n');
            return l.length === 2 && l[0].includes('Hohe CPU-Last') && l[1].includes('Tagesbericht');
          },
        },
        {
          id: 'wc',
          title: 'Zeilen zählen',
          task: 'Wie viele Zeilen hat die Datei <code>Dokumente/einkauf.txt</code>? Lass es dir anzeigen.',
          explain: '<code>wc</code> (word count) zählt Zeilen, Wörter und Bytes. Mit <code>-l</code> nur die Zeilen.',
          hint: 'wc -l …',
          solution: 'wc -l Dokumente/einkauf.txt',
          check: ({ line, output }) => uses(line, 'wc') && /^\s*12\b/.test(output),
        },
      ],
    },
    {
      id: 'suchen',
      title: 'Suchen & Filtern',
      icon: '🔍',
      intro: 'Mit grep, find und Pipes findest du die Nadel im Heuhaufen.',
      exercises: [
        {
          id: 'grep',
          title: 'Text suchen',
          task: 'Zeige alle Zeilen aus <code>logs/system.log</code>, die das Wort <code>ERROR</code> enthalten.',
          explain: '<code>grep MUSTER DATEI</code> gibt nur die Zeilen aus, in denen das Muster vorkommt.',
          hint: 'grep ERROR …',
          solution: 'grep ERROR logs/system.log',
          check: ({ line, output }) => uses(line, 'grep') && output.trim().split('\n').length === 2 && output.includes('Datenbank'),
        },
        {
          id: 'grep-i',
          title: 'Groß/klein egal',
          task: 'Suche in <code>Dokumente/bericht.txt</code> nach <code>linux</code> – egal ob groß oder klein geschrieben.',
          explain: 'Mit <code>-i</code> (ignore case) ignoriert grep die Groß- und Kleinschreibung.',
          hint: 'grep -i …',
          solution: 'grep -i linux Dokumente/bericht.txt',
          check: ({ line, output }) => uses(line, 'grep') && output.includes('mehr Linux'),
        },
        {
          id: 'grep-c',
          title: 'Treffer zählen',
          task: 'Wie viele Zeilen in <code>logs/system.log</code> enthalten <code>INFO</code>? Lass grep zählen.',
          explain: 'Mit <code>-c</code> (count) gibt grep nur die Anzahl der passenden Zeilen aus.',
          hint: 'grep -c …',
          solution: 'grep -c INFO logs/system.log',
          check: ({ output }) => output.trim() === '6',
        },
        {
          id: 'pipe',
          title: 'Die Pipe |',
          task: 'Zeige die Liste in <code>daten/namen.txt</code> <strong>alphabetisch sortiert</strong> an, indem du <code>cat</code> und <code>sort</code> mit einer Pipe verbindest.',
          explain:
            'Die Pipe <code>|</code> schickt die Ausgabe des linken Befehls als Eingabe an den rechten. So baust du aus kleinen Werkzeugen mächtige Ketten. (Das Zeichen findest du auch in der Tastenleiste unten.)',
          hint: 'cat DATEI | sort',
          solution: 'cat daten/namen.txt | sort',
          check: ({ line, output }) => has(line, '|') && uses(line, 'sort') && output.startsWith('Anna\nAnna\nBen'),
        },
        {
          id: 'uniq',
          title: 'Doppelte entfernen',
          task: 'Gib jeden Namen aus <code>daten/namen.txt</code> nur <strong>einmal</strong> aus (sortiert).',
          explain:
            '<code>uniq</code> entfernt doppelte Zeilen – aber nur, wenn sie direkt aufeinander folgen. Deshalb wird vorher sortiert: <code>sort | uniq</code>. (Kurzform: <code>sort -u</code>.)',
          hint: 'sort DATEI | uniq',
          solution: 'sort daten/namen.txt | uniq',
          check: ({ output }) => output.trim() === 'Anna\nBen\nLena\nMax\nSophie\nTom',
        },
        {
          id: 'pipe-count',
          title: 'Ketten bauen',
          task: 'Wie viele Dateien und Ordner enthält <code>Bilder</code>? Verbinde <code>ls</code> und <code>wc -l</code> mit einer Pipe.',
          explain: 'Wenn <code>ls</code> in eine Pipe schreibt, gibt es einen Eintrag pro Zeile aus – perfekt zum Zählen.',
          hint: 'ls Bilder | wc -l',
          solution: 'ls Bilder | wc -l',
          check: ({ line, output }) => has(line, '|') && output.trim() === '3',
        },
        {
          id: 'find',
          title: 'Dateien finden',
          task: 'Finde alle Dateien, die auf <code>.txt</code> enden – im Home-Verzeichnis und allen Unterordnern.',
          explain:
            '<code>find ORT -name MUSTER</code> durchsucht Ordner rekursiv. Setze das Muster in Anführungszeichen, damit die Shell den <code>*</code> nicht vorher selbst ersetzt.',
          hint: 'find . -name "*.txt"',
          solution: 'find . -name "*.txt"',
          check: ({ line, output }) => uses(line, 'find') && output.includes('daten/namen.txt') && output.includes('Dokumente/bericht.txt'),
        },
        {
          id: 'sort-n',
          title: 'Zahlen sortieren',
          task: 'Sortiere <code>daten/zahlen.txt</code> numerisch – die <strong>größte Zahl zuerst</strong>.',
          explain:
            'Normales <code>sort</code> sortiert wie im Wörterbuch (dann käme 100 vor 25). <code>-n</code> sortiert nach Zahlenwert, <code>-r</code> dreht die Reihenfolge um.',
          hint: 'sort -n -r … (oder kurz -nr)',
          solution: 'sort -nr daten/zahlen.txt',
          check: ({ output }) => output.trim() === '100\n42\n25\n8\n7\n3',
        },
        {
          id: 'cut',
          title: 'Spalten ausschneiden',
          task: 'Gib aus <code>daten/staedte.csv</code> nur die <strong>erste Spalte</strong> (die Städtenamen) aus. Die Spalten sind durch Kommas getrennt.',
          explain: '<code>cut -d TRENNER -f FELD</code> schneidet bestimmte Spalten aus jeder Zeile.',
          hint: 'cut -d , -f 1 …',
          solution: 'cut -d , -f 1 daten/staedte.csv',
          check: ({ output }) => output.trim().split('\n').join(',') === 'Stadt,Berlin,Wien,Zürich,Hamburg,Graz',
        },
      ],
    },
    {
      id: 'rechte',
      title: 'Rechte & Skripte',
      icon: '🔐',
      intro: 'Wer darf was? Zugriffsrechte lesen, ändern und Skripte ausführen.',
      exercises: [
        {
          id: 'rights-read',
          title: 'Rechte lesen',
          task: 'Schau dir mit <code>ls -l</code> die Rechte der Dateien im Ordner <code>skripte</code> an.',
          explain:
            'Die Zeichenkette <code>-rw-r--r--</code> besteht aus 3 Gruppen: <strong>Besitzer</strong> (rw-), <strong>Gruppe</strong> (r--), <strong>Andere</strong> (r--). <code>r</code> = lesen, <code>w</code> = schreiben, <code>x</code> = ausführen.',
          hint: 'ls -l skripte',
          solution: 'ls -l skripte',
          check: ({ output }) => output.includes('-rw-r--r--') && output.includes('hallo.sh'),
        },
        {
          id: 'chmod-x',
          title: 'Ausführbar machen',
          task: 'Mach das Skript <code>skripte/hallo.sh</code> ausführbar.',
          explain: '<code>chmod +x DATEI</code> fügt das Ausführrecht hinzu. Ohne dieses Recht kann ein Skript nicht gestartet werden.',
          hint: 'chmod +x …',
          solution: 'chmod +x skripte/hallo.sh',
          check: ({ shell }) => (shell.getNode(H + '/skripte/hallo.sh').mode & 0o100) !== 0,
        },
        {
          id: 'run-script',
          title: 'Skript starten',
          task: 'Das Skript <code>skripte/hallo.sh</code> ist jetzt ausführbar. Starte es!',
          explain:
            'Programme im aktuellen Ordner startet man mit vorangestelltem Pfad, z. B. <code>./skript.sh</code>. Das <code>./</code> bedeutet „hier in diesem Ordner“.',
          hint: './skripte/hallo.sh',
          solution: './skripte/hallo.sh',
          setup: (shell) => shell.run('chmod +x skripte/hallo.sh', { noHistory: true }),
          check: ({ output }) => output.includes('Hallo vom Skript!'),
        },
        {
          id: 'chmod-num',
          title: 'Rechte als Zahl',
          task: 'Setze die Rechte von <code>notizen.txt</code> so, dass <strong>nur du</strong> sie lesen und schreiben darfst (<code>-rw-------</code>).',
          explain:
            'Rechte lassen sich als Zahl angeben: r = 4, w = 2, x = 1, pro Gruppe addiert. <code>rw-</code> = 6, <code>r--</code> = 4, <code>---</code> = 0. Also: <code>chmod 600</code>.',
          hint: 'chmod 600 …',
          solution: 'chmod 600 notizen.txt',
          check: ({ shell }) => (shell.getNode(H + '/notizen.txt').mode & 0o777) === 0o600,
        },
      ],
    },
    {
      id: 'profi',
      title: 'Profi-Tricks',
      icon: '🚀',
      intro: 'Variablen, Befehlsketten und kleine Abkürzungen für den Alltag.',
      exercises: [
        {
          id: 'and',
          title: 'Befehle verketten',
          task: 'Lege den Ordner <code>backup</code> an <strong>und</strong> wechsle direkt hinein – in einer Zeile.',
          explain:
            '<code>&amp;&amp;</code> führt den zweiten Befehl nur aus, wenn der erste erfolgreich war. <code>;</code> führt ihn immer aus.',
          hint: 'mkdir … && cd …',
          solution: 'mkdir backup && cd backup',
          check: ({ shell, line }) => has(line, '&&') && shell.cwd === H + '/backup',
        },
        {
          id: 'var',
          title: 'Variablen',
          task: 'Gib mit <code>echo</code> den Pfad deines Home-Verzeichnisses aus – benutze dafür die Variable <code>HOME</code>.',
          explain: 'Umgebungsvariablen liest man mit <code>$NAME</code>. Alle anzeigen: <code>env</code>.',
          hint: 'echo $HOME',
          solution: 'echo $HOME',
          check: ({ line, output }) => has(line, '$HOME') && output.trim() === H,
        },
        {
          id: 'top-names',
          title: 'Häufigkeiten',
          task: 'Zähle, wie oft jeder Name in <code>daten/namen.txt</code> vorkommt, und sortiere so, dass der <strong>häufigste oben</strong> steht.',
          explain: '<code>uniq -c</code> schreibt die Anzahl vor jede Zeile. Danach sortiert <code>sort -nr</code> nach dieser Zahl absteigend.',
          hint: 'sort … | uniq -c | sort -nr',
          solution: 'sort daten/namen.txt | uniq -c | sort -nr',
          check: ({ output }) => /^\s*3 Tom/.test(output) && output.trim().split('\n').length === 6,
        },
        {
          id: 'errors-file',
          title: 'Fehler-Report',
          task: 'Speichere alle Zeilen aus <code>logs/system.log</code>, die <code>ERROR</code> <strong>oder</strong> <code>WARN</code> enthalten, in der Datei <code>probleme.txt</code>.',
          explain:
            'grep versteht Muster (reguläre Ausdrücke). <code>|</code> innerhalb des Musters bedeutet „oder“ – in Anführungszeichen gesetzt, damit die Shell es nicht als Pipe versteht: <code>"ERROR|WARN"</code>. Alternativ geht auch <code>grep -v INFO</code>.',
          hint: 'grep -E "ERROR|WARN" logs/system.log > probleme.txt',
          solution: 'grep -E "ERROR|WARN" logs/system.log > probleme.txt',
          check: ({ shell }) => {
            const c = shell.readFile(H + '/probleme.txt') || '';
            return c.trim().split('\n').length === 4 && !c.includes('INFO');
          },
        },
      ],
    },
  ];

  const api = { CHAPTERS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.Lessons = api;
})(typeof window !== 'undefined' ? window : globalThis);
