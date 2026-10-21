# Shell Trainer – Linux-Befehle üben

Eine App zum Lernen der Linux-Kommandozeile, gemacht fürs Handy. Du tippst echte Befehle
in ein simuliertes Terminal und bekommst sofort Feedback. Es läuft alles offline im
Browser, auf deinem Gerät wird nichts ausgeführt.

## Was drin ist

- **41 Übungen in 6 Kapiteln**: Orientierung (`pwd`, `ls`, `cd`), Dateien & Ordner
  (`mkdir`, `cp`, `mv`, `rm`, Wildcards), Dateiinhalte (`cat`, `echo`, `>`/`>>`, `head`,
  `tail`, `wc`), Suchen & Filtern (`grep`, `find`, `sort`, `uniq`, `cut`, Pipes),
  Rechte & Skripte (`chmod`, `./skript.sh`) und Profi-Tricks (`&&`, Variablen, lange Pipes)
- Zu jeder Übung gibt es eine Erklärung, einen Tipp und die Lösung. Der Fortschritt wird gespeichert.
- **Freies Terminal** zum Ausprobieren. Dein Dateisystem bleibt erhalten und lässt sich zurücksetzen.
- **Spickzettel** mit Suche
- **Sondertasten-Leiste** (Tab, ↑/↓, `|`, `/`, `~`, `>` …), weil Handy-Tastaturen diese Zeichen kaum bieten
- Tab-Vervollständigung, Befehlsverlauf, farbige Ausgabe, Dark Mode

## Auf Android installieren

Die App ist eine *Progressive Web App*. Sie wird über einen Webserver ausgeliefert und
dann wie eine normale App installiert:

1. Dateien veröffentlichen, z. B. über **GitHub Pages**: Im Repository unter
   *Settings → Pages* bei *Source* „Deploy from a branch“ wählen, dann den Branch und
   den Ordner `/ (root)` auswählen.
2. Die Seite (`https://<nutzer>.github.io/<repo>/`) auf dem Handy in **Chrome** öffnen.
3. Menü ⋮ → **„App installieren“** bzw. **„Zum Startbildschirm hinzufügen“**.

Danach liegt *Shell Trainer* mit eigenem Icon auf dem Startbildschirm, startet im
Vollbild und funktioniert auch ohne Internet.

## Lokal starten und testen

```bash
npm start   # Server auf http://localhost:8080
npm test    # prüft, dass jede Musterlösung ihre Übung besteht
```

## Aufbau

| Datei | Inhalt |
| --- | --- |
| `js/shell.js` | Simulierte Bash: Parser (Pipes, Umleitungen, `&&`, Quotes, Variablen, Wildcards), virtuelles Dateisystem, ~40 Befehle |
| `js/lessons.js` | Kapitel und Übungen, jeweils mit Prüffunktion |
| `js/terminal.js` | Terminal-Oberfläche mit Sondertasten |
| `js/app.js` | Navigation, Fortschritt, freies Terminal, Spickzettel |
| `sw.js` | Service Worker für den Offline-Betrieb |

### Eigene Übung hinzufügen

In `js/lessons.js` ein Objekt zu einem Kapitel hinzufügen:

```js
{
  id: 'mein-id',
  title: 'Titel',
  task: 'Aufgabe (HTML erlaubt)',
  explain: 'Erklärung',
  hint: 'Tipp',
  solution: 'befehl',
  setup: (shell) => shell.writeFile('/home/lerner/x.txt', 'Inhalt\n'), // optional
  check: ({ shell, line, output }) => /* true, wenn gelöst */,
}
```

Danach in `sw.js` die Cache-Version erhöhen, damit installierte Apps das Update laden.
