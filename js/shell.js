// Simulierte Linux-Shell mit virtuellem Dateisystem.
// Läuft komplett im Browser – es werden keine echten Befehle ausgeführt.
(function (global) {
  'use strict';

  const USER = 'lerner';
  const HOST = 'linux';
  const HOME = '/home/' + USER;

  // ANSI-ähnliche Farbmarker; das Terminal wandelt sie in <span>s um.
  const C = {
    dir: '\x1b[34m',
    exec: '\x1b[32m',
    err: '\x1b[31m',
    hl: '\x1b[33m',
    reset: '\x1b[0m',
  };
  const stripColors = (s) => s.replace(/\x1b\[\d+m/g, '');

  // ---------------------------------------------------------------------------
  // Dateisystem
  // ---------------------------------------------------------------------------

  const now = () => Date.now();
  const dir = (children = {}, mode = 0o755) => ({ type: 'dir', children, mode, mtime: now() });
  const file = (content = '', mode = 0o644) => ({ type: 'file', content, mode, mtime: now() });

  function defaultTree() {
    return dir({
      bin: dir({}),
      etc: dir({
        hostname: file(HOST + '\n'),
        passwd: file('root:x:0:0:root:/root:/bin/bash\n' + USER + ':x:1000:1000:Lerner:' + HOME + ':/bin/bash\n'),
      }),
      tmp: dir({}, 0o777),
      home: dir({
        [USER]: dir({
          '.bashrc': file('# Einstellungen der Shell\nalias ll="ls -l"\nexport EDITOR=nano\n'),
          '.geheim': file('Glückwunsch! Du hast die versteckte Datei gefunden.\n'),
          'notizen.txt': file('Linux lernen macht Spaß!\nHeute: ls, cd und pwd üben.\n'),
          Dokumente: dir({
            'bericht.txt': file(
              'Jahresbericht 2026\n==================\nUmsatz ist gestiegen.\nKunden sind zufrieden.\n' +
                'Das Team ist gewachsen.\nNächstes Jahr: mehr Linux!\n'
            ),
            'einkauf.txt': file('Milch\nBrot\nÄpfel\nKäse\nTomaten\nNudeln\nKaffee\nButter\nEier\nReis\nHonig\nJoghurt\n'),
          }),
          Bilder: dir({
            'urlaub.jpg': file('[Binärdaten: Strandfoto]\n'),
            'katze.png': file('[Binärdaten: Katzenfoto]\n'),
            'berge.jpg': file('[Binärdaten: Bergpanorama]\n'),
          }),
          Musik: dir({}),
          daten: dir({
            'namen.txt': file('Lena\nTom\nAnna\nMax\nTom\nLena\nSophie\nBen\nAnna\nTom\n'),
            'zahlen.txt': file('42\n7\n100\n3\n25\n8\n'),
            'staedte.csv': file('Stadt,Land,Einwohner\nBerlin,DE,3700000\nWien,AT,2000000\nZürich,CH,420000\nHamburg,DE,1900000\nGraz,AT,290000\n'),
          }),
          logs: dir({
            'system.log': file(
              [
                '2026-10-01 08:00:01 INFO  System gestartet',
                '2026-10-01 08:00:05 INFO  Netzwerk verbunden',
                '2026-10-01 09:12:44 WARN  Festplatte zu 85% voll',
                '2026-10-01 10:30:00 ERROR Dienst "backup" abgestürzt',
                '2026-10-01 10:30:02 INFO  Dienst "backup" neu gestartet',
                '2026-10-01 12:00:00 INFO  Update verfügbar',
                '2026-10-01 14:45:13 ERROR Verbindung zur Datenbank verloren',
                '2026-10-01 14:45:20 INFO  Verbindung wiederhergestellt',
                '2026-10-01 18:00:00 WARN  Hohe CPU-Last',
                '2026-10-01 23:59:59 INFO  Tagesbericht erstellt',
              ].join('\n') + '\n'
            ),
          }),
          skripte: dir({
            'hallo.sh': file('#!/bin/bash\necho "Hallo vom Skript!"\necho "Du bist in:"\npwd\n'),
          }),
        }),
      }),
    });
  }

  function clone(node) {
    return JSON.parse(JSON.stringify(node));
  }

  function splitPath(p) {
    return p.split('/').filter(Boolean);
  }

  // Wandelt einen Pfad relativ zu cwd in einen absoluten, normalisierten Pfad um.
  function resolvePath(p, cwd) {
    if (p === '~' || p.startsWith('~/')) p = HOME + p.slice(1);
    const parts = p.startsWith('/') ? [] : splitPath(cwd);
    for (const seg of splitPath(p)) {
      if (seg === '.') continue;
      if (seg === '..') parts.pop();
      else parts.push(seg);
    }
    return '/' + parts.join('/');
  }

  function prettyPath(abs) {
    if (abs === HOME) return '~';
    if (abs.startsWith(HOME + '/')) return '~' + abs.slice(HOME.length);
    return abs;
  }

  function basename(p) {
    const parts = splitPath(p);
    return parts.length ? parts[parts.length - 1] : '/';
  }

  function dirname(abs) {
    const parts = splitPath(abs);
    parts.pop();
    return '/' + parts.join('/');
  }

  function modeString(node) {
    const t = node.type === 'dir' ? 'd' : '-';
    const bits = 'rwxrwxrwx';
    let s = '';
    for (let i = 0; i < 9; i++) s += node.mode & (1 << (8 - i)) ? bits[i] : '-';
    return t + s;
  }

  // ---------------------------------------------------------------------------
  // Parser
  // ---------------------------------------------------------------------------

  const OPERATORS = ['&&', '||', '>>', '2>', '|', ';', '>', '<'];

  // Zerlegt eine Zeile in Wörter und Operatoren. Wörter tragen ein Muster für
  // Wildcards, in dem nur unquotierte * und ? als Platzhalter gelten.
  function tokenize(line, env) {
    const tokens = [];
    let i = 0;
    let word = null;

    const startWord = () => {
      if (!word) word = { value: '', pattern: '', glob: false, quoted: false };
    };
    const pushLiteral = (s) => {
      startWord();
      word.value += s;
      word.pattern += s.replace(/[.+^${}()|[\]\\*?]/g, '\\$&');
    };
    const endWord = () => {
      if (word) tokens.push({ type: 'word', ...word });
      word = null;
    };
    const readVar = () => {
      // i zeigt auf '$'
      let name = '';
      if (line[i + 1] === '{') {
        const end = line.indexOf('}', i + 2);
        if (end === -1) return null;
        name = line.slice(i + 2, end);
        i = end + 1;
      } else if (line[i + 1] === '?') {
        name = '?';
        i += 2;
      } else {
        const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(line.slice(i + 1));
        if (!m) return null;
        name = m[0];
        i += 1 + name.length;
      }
      return env[name] !== undefined ? String(env[name]) : '';
    };

    while (i < line.length) {
      const ch = line[i];

      if (ch === ' ' || ch === '\t') {
        endWord();
        i++;
        continue;
      }
      if (ch === '#' && !word) break;

      if (!word || ch !== '2') {
        const op = OPERATORS.find((o) => line.startsWith(o, i));
        if (op && !(op === '2>' && word)) {
          endWord();
          tokens.push({ type: 'op', value: op });
          i += op.length;
          continue;
        }
      }

      if (ch === '\\') {
        if (i + 1 < line.length) pushLiteral(line[i + 1]);
        i += 2;
        continue;
      }
      if (ch === "'") {
        const end = line.indexOf("'", i + 1);
        if (end === -1) throw new Error('Unerwartetes Zeilenende: schließendes \' fehlt');
        startWord();
        word.quoted = true;
        pushLiteral(line.slice(i + 1, end));
        i = end + 1;
        continue;
      }
      if (ch === '"') {
        startWord();
        word.quoted = true;
        i++;
        let closed = false;
        while (i < line.length) {
          const c = line[i];
          if (c === '"') {
            closed = true;
            i++;
            break;
          }
          if (c === '\\' && '"\\$'.includes(line[i + 1])) {
            pushLiteral(line[i + 1]);
            i += 2;
          } else if (c === '$') {
            const v = readVar();
            if (v === null) {
              pushLiteral('$');
              i++;
            } else pushLiteral(v);
          } else {
            pushLiteral(c);
            i++;
          }
        }
        if (!closed) throw new Error('Unerwartetes Zeilenende: schließendes " fehlt');
        continue;
      }
      if (ch === '$') {
        const v = readVar();
        if (v === null) {
          pushLiteral('$');
          i++;
        } else {
          startWord();
          pushLiteral(v);
        }
        continue;
      }
      if (ch === '~' && !word && (i + 1 === line.length || '/ \t;|&'.includes(line[i + 1]))) {
        pushLiteral(HOME);
        i++;
        continue;
      }
      if (ch === '*' || ch === '?') {
        startWord();
        word.value += ch;
        word.pattern += ch === '*' ? '\u0001' : '\u0002';
        word.glob = true;
        i++;
        continue;
      }
      pushLiteral(ch);
      i++;
    }
    endWord();
    return tokens;
  }

  // Gruppiert Tokens zu Befehlsketten: [{ sep, pipeline: [{ words, redirects }] }]
  function parse(tokens) {
    const chain = [];
    let pipeline = [];
    let cmd = { words: [], redirects: [] };
    let sep = null;

    const syntaxError = (t) => {
      throw new Error('Syntaxfehler beim unerwarteten Symbol »' + (t ? t.value : 'newline') + '«');
    };
    const endCmd = (t) => {
      if (!cmd.words.length && !cmd.redirects.length) syntaxError(t);
      pipeline.push(cmd);
      cmd = { words: [], redirects: [] };
    };

    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t.type === 'word') {
        cmd.words.push(t);
      } else if (['>', '>>', '2>', '<'].includes(t.value)) {
        const target = tokens[++i];
        if (!target || target.type !== 'word') syntaxError(target);
        cmd.redirects.push({ op: t.value, target });
      } else if (t.value === '|') {
        endCmd(t);
      } else {
        endCmd(t);
        chain.push({ sep, pipeline });
        pipeline = [];
        sep = t.value;
      }
    }
    if (cmd.words.length || cmd.redirects.length) pipeline.push(cmd);
    else if (pipeline.length || (sep && sep !== ';')) syntaxError(null);
    if (pipeline.length) chain.push({ sep, pipeline });
    return chain;
  }

  // ---------------------------------------------------------------------------
  // Shell
  // ---------------------------------------------------------------------------

  class Shell {
    constructor(opts = {}) {
      this.reset(opts.tree);
    }

    reset(tree) {
      this.root = tree ? clone(tree) : defaultTree();
      this.cwd = HOME;
      this.oldpwd = HOME;
      this.history = [];
      this.lastStatus = 0;
      this.env = { HOME, USER, PWD: HOME, SHELL: '/bin/bash', PATH: '/usr/local/bin:/usr/bin:/bin' };
      this.depth = 0;
    }

    get prompt() {
      return USER + '@' + HOST + ':' + prettyPath(this.cwd) + '$';
    }

    // --- Dateisystem-Hilfen --------------------------------------------------

    resolve(p) {
      return resolvePath(p, this.cwd);
    }

    getNode(p) {
      let node = this.root;
      for (const seg of splitPath(this.resolve(p))) {
        if (!node || node.type !== 'dir') return null;
        node = node.children[seg];
      }
      return node || null;
    }

    exists(p) {
      return !!this.getNode(p);
    }
    isDir(p) {
      const n = this.getNode(p);
      return !!n && n.type === 'dir';
    }
    isFile(p) {
      const n = this.getNode(p);
      return !!n && n.type === 'file';
    }
    readFile(p) {
      const n = this.getNode(p);
      return n && n.type === 'file' ? n.content : null;
    }
    listDir(p) {
      const n = this.getNode(p);
      return n && n.type === 'dir' ? Object.keys(n.children).sort(compareNames) : null;
    }

    // Liefert [Elternknoten, Name] für einen Pfad, oder wirft einen Fehler.
    parentOf(p) {
      const abs = this.resolve(p);
      const parent = this.getNode(dirname(abs));
      if (!parent) throw new Error(p + ': Datei oder Verzeichnis nicht gefunden');
      if (parent.type !== 'dir') throw new Error(p + ': Ist kein Verzeichnis');
      return [parent, basename(abs)];
    }

    writeFile(p, content, append) {
      const existing = this.getNode(p);
      if (existing && existing.type === 'dir') throw new Error(p + ': Ist ein Verzeichnis');
      if (existing) {
        existing.content = append ? existing.content + content : content;
        existing.mtime = now();
        return;
      }
      const [parent, name] = this.parentOf(p);
      parent.children[name] = file(content);
      parent.mtime = now();
    }

    // Expandiert Wildcards wie *.txt oder Dokumente/*.
    expandGlob(word) {
      if (!word.glob) return [word.value];
      const abs = word.value.startsWith('/');
      const patParts = word.pattern.split('/').filter(Boolean);
      const valParts = word.value.split('/').filter(Boolean);
      let paths = [abs ? '' : null];
      for (let k = 0; k < patParts.length; k++) {
        const isGlob = /[\u0001\u0002]/.test(patParts[k]);
        const next = [];
        for (const base of paths) {
          const join = (n) => (base === null ? n : base + '/' + n);
          if (!isGlob) {
            next.push(join(valParts[k]));
            continue;
          }
          const dirPath = base === null ? '.' : base === '' ? '/' : base;
          const names = this.listDir(dirPath) || [];
          const re = new RegExp('^' + patParts[k].replace(/\u0001/g, '.*').replace(/\u0002/g, '.') + '$');
          for (const n of names) {
            if (n.startsWith('.') && !valParts[k].startsWith('.')) continue;
            if (re.test(n)) next.push(join(n));
          }
        }
        paths = next;
      }
      const matches = paths.filter((p) => p !== null && this.exists(p === '' ? '/' : p));
      return matches.length ? matches.sort(compareNames) : [word.value];
    }

    // --- Ausführung ----------------------------------------------------------

    // Führt eine Eingabezeile aus und liefert { output, clear }.
    run(line, opts = {}) {
      const result = { output: '', clear: false };
      if (!opts.noHistory && line.trim()) this.history.push(line);
      let chain;
      try {
        this.env['?'] = this.lastStatus;
        chain = parse(tokenize(line, this.env));
      } catch (e) {
        this.lastStatus = 2;
        result.output = C.err + 'bash: ' + e.message + C.reset + '\n';
        return result;
      }

      for (const { sep, pipeline } of chain) {
        if (sep === '&&' && this.lastStatus !== 0) continue;
        if (sep === '||' && this.lastStatus === 0) continue;
        let stdin = null;
        for (let k = 0; k < pipeline.length; k++) {
          const isLast = k === pipeline.length - 1;
          const r = this.runCommand(pipeline[k], stdin, isLast && !opts.capture);
          if (r.clear) {
            result.clear = true;
            result.output = '';
          }
          result.output += r.err;
          stdin = r.out;
          this.lastStatus = r.code;
          if (isLast) result.output += r.out;
        }
      }
      return result;
    }

    runCommand(cmd, stdin, tty) {
      const res = { out: '', err: '', code: 0, clear: false };
      let argv = [];
      for (const w of cmd.words) argv.push(...this.expandGlob(w));

      // Umleitungen vorbereiten
      let outTarget = null;
      let errToNull = false;
      for (const r of cmd.redirects) {
        const target = r.target.value;
        if (r.op === '<') {
          const content = this.readFile(target);
          if (content === null) {
            res.err = C.err + 'bash: ' + target + ': Datei oder Verzeichnis nicht gefunden' + C.reset + '\n';
            res.code = 1;
            return res;
          }
          stdin = content;
        } else if (r.op === '2>') {
          errToNull = target === '/dev/null';
        } else {
          outTarget = { path: target, append: r.op === '>>' };
        }
      }

      if (!argv.length) {
        argv = [':'];
      }

      // Variablenzuweisung: NAME=wert
      const assign = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(argv[0]);
      if (assign && argv.length === 1) {
        this.env[assign[1]] = assign[2];
        return res;
      }

      const name = argv[0];
      const args = expandLongOptions(name, argv.slice(1));
      const ctx = {
        shell: this,
        stdin,
        tty: tty && !outTarget,
        out: '',
        err: '',
        write(s) {
          this.out += s;
        },
        error(s) {
          this.err += s + '\n';
        },
      };

      let code = 0;
      try {
        const fn = name.includes('/') ? runScript : COMMANDS[name];
        if (!fn) {
          ctx.error(name + ': Befehl nicht gefunden');
          code = 127;
        } else {
          const r = fn.call(this, args, ctx, name);
          if (r === 'clear') res.clear = true;
          else if (typeof r === 'number') code = r;
        }
      } catch (e) {
        ctx.error(name + ': ' + e.message);
        code = 1;
      }
      if (ctx.err && code === 0) code = 1;

      let out = ctx.out;
      if (outTarget) {
        if (outTarget.path !== '/dev/null') {
          try {
            this.writeFile(outTarget.path, stripColors(out), outTarget.append);
          } catch (e) {
            ctx.err += 'bash: ' + e.message + '\n';
            code = 1;
          }
        }
        out = '';
      } else if (!ctx.tty) {
        out = stripColors(out);
      }

      res.out = out;
      res.err = errToNull || !ctx.err ? '' : C.err + ctx.err + C.reset;
      res.code = code;
      return res;
    }

    // Vervollständigt das letzte Wort einer Eingabe (Tab-Taste).
    complete(line) {
      const m = /(\S*)$/.exec(line);
      const partial = m[1];
      const before = line.slice(0, line.length - partial.length);
      const isCommand = !before.trim() || /[|;&]\s*$/.test(before);

      let candidates;
      if (isCommand && !partial.includes('/')) {
        candidates = Object.keys(COMMANDS)
          .filter((c) => c.startsWith(partial) && c !== ':')
          .map((c) => c + ' ');
      } else {
        const slash = partial.lastIndexOf('/');
        const dirPart = slash >= 0 ? partial.slice(0, slash + 1) : '';
        const namePart = partial.slice(slash + 1);
        const names = this.listDir(dirPart ? dirPart.replace(/^~/, HOME) : '.') || [];
        candidates = names
          .filter((n) => n.startsWith(namePart) && (namePart.startsWith('.') || !n.startsWith('.')))
          .map((n) => dirPart + n + (this.isDir((dirPart || './').replace(/^~/, HOME) + n) ? '/' : ' '));
      }
      if (!candidates.length) return { line, options: [] };
      if (candidates.length === 1) return { line: before + candidates[0], options: [] };
      let common = candidates[0];
      for (const c of candidates) while (!c.startsWith(common)) common = common.slice(0, -1);
      return { line: before + (common.length > partial.length ? common : partial), options: candidates.map((c) => c.trim()) };
    }
  }

  function compareNames(a, b) {
    const ka = a.replace(/^\./, '').toLowerCase();
    const kb = b.replace(/^\./, '').toLowerCase();
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  }

  // ---------------------------------------------------------------------------
  // Optionen
  // ---------------------------------------------------------------------------

  // Trennt Flags (-la) von Operanden. valueFlags nehmen einen Wert (-n 5).
  function getOpts(args, valueFlags = '') {
    const flags = {};
    const operands = [];
    let onlyOperands = false;
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (onlyOperands || !a.startsWith('-') || a === '-') {
        operands.push(a);
        continue;
      }
      if (a === '--') {
        onlyOperands = true;
        continue;
      }
      if (a.startsWith('--')) {
        const [k, v] = a.slice(2).split('=');
        flags[k] = v === undefined ? true : v;
        continue;
      }
      if (/^-\d+$/.test(a)) {
        flags.n = a.slice(1);
        continue;
      }
      for (let j = 1; j < a.length; j++) {
        const f = a[j];
        if (valueFlags.includes(f)) {
          const rest = a.slice(j + 1);
          flags[f] = rest || args[++i];
          if (flags[f] === undefined) throw new Error('Option erfordert ein Argument -- »' + f + '«');
          break;
        }
        flags[f] = true;
      }
    }
    return { flags, operands };
  }

  // Liest Eingabe aus Dateien oder – wenn keine angegeben – aus stdin.
  function readInputs(shell, files, ctx, cmd) {
    if (!files.length) return [{ name: null, content: ctx.stdin || '' }];
    const res = [];
    for (const f of files) {
      if (f === '-') {
        res.push({ name: '-', content: ctx.stdin || '' });
        continue;
      }
      const n = shell.getNode(f);
      if (!n) ctx.error(cmd + ': ' + f + ': Datei oder Verzeichnis nicht gefunden');
      else if (n.type === 'dir') ctx.error(cmd + ': ' + f + ': Ist ein Verzeichnis');
      else res.push({ name: f, content: n.content });
    }
    return res;
  }

  const lines = (s) => {
    const l = s.split('\n');
    if (l[l.length - 1] === '') l.pop();
    return l;
  };
  const joinLines = (l) => (l.length ? l.join('\n') + '\n' : '');

  function wildcardToRegex(pat) {
    return new RegExp('^' + pat.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
  }

  function formatDate(ts) {
    const d = new Date(ts);
    const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
    const pad = (n) => String(n).padStart(2, '0');
    return months[d.getMonth()] + ' ' + String(d.getDate()).padStart(2) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function colorName(name, node, tty) {
    if (!tty) return name;
    if (node.type === 'dir') return C.dir + name + C.reset;
    if (node.mode & 0o111) return C.exec + name + C.reset;
    return name;
  }

  // ---------------------------------------------------------------------------
  // Befehle
  // ---------------------------------------------------------------------------

  function runScript(args, ctx, path) {
    const node = this.getNode(path);
    if (!node) throw new Error('Datei oder Verzeichnis nicht gefunden');
    if (node.type === 'dir') throw new Error('Ist ein Verzeichnis');
    if (!(node.mode & 0o100)) throw new Error('Keine Berechtigung');
    return execScript(this, node.content, ctx);
  }

  function execScript(shell, content, ctx) {
    if (shell.depth > 5) throw new Error('zu tief verschachtelt');
    shell.depth++;
    try {
      for (const l of lines(content)) {
        if (!l.trim() || l.trim().startsWith('#')) continue;
        const r = shell.run(l, { noHistory: true, capture: !ctx.tty });
        ctx.write(r.output);
      }
    } finally {
      shell.depth--;
    }
    return shell.lastStatus;
  }

  const COMMANDS = {
    ':'() {},

    pwd(args, ctx) {
      ctx.write(this.cwd + '\n');
    },

    cd(args, ctx) {
      let target = args[0];
      if (args.length > 1) return ctx.error('cd: Zu viele Argumente'), 1;
      if (target === undefined || target === '') target = HOME;
      if (target === '-') {
        target = this.oldpwd;
        ctx.write(target + '\n');
      }
      const node = this.getNode(target);
      if (!node) return ctx.error('bash: cd: ' + args[0] + ': Datei oder Verzeichnis nicht gefunden'), 1;
      if (node.type !== 'dir') return ctx.error('bash: cd: ' + args[0] + ': Ist kein Verzeichnis'), 1;
      this.oldpwd = this.cwd;
      this.cwd = this.resolve(target);
      this.env.PWD = this.cwd;
    },

    ls(args, ctx) {
      const { flags, operands } = getOpts(args);
      const all = flags.a || flags.all;
      const long = flags.l;
      const human = flags.h;
      const targets = operands.length ? operands : ['.'];
      const fileTargets = [];
      const dirTargets = [];
      let code = 0;
      for (const t of targets) {
        const n = this.getNode(t);
        if (!n) {
          ctx.error("ls: Zugriff auf '" + t + "' nicht möglich: Datei oder Verzeichnis nicht gefunden");
          code = 2;
        } else if (n.type === 'dir' && !flags.d) dirTargets.push(t);
        else fileTargets.push(t);
      }

      const size = (n) => {
        const s = n.type === 'dir' ? 4096 : new TextEncoder().encode(n.content).length;
        if (!human || s < 1024) return String(s);
        return (s / 1024).toFixed(1).replace('.', ',') + 'K';
      };
      const fmt = (entries) => {
        if (!entries.length) return '';
        if (long) {
          const w = Math.max(...entries.map(([, n]) => size(n).length));
          return entries
            .map(
              ([name, n]) =>
                modeString(n) + ' 1 ' + USER + ' ' + USER + ' ' + size(n).padStart(w) + ' ' + formatDate(n.mtime) + ' ' + colorName(name, n, ctx.tty)
            )
            .join('\n') + '\n';
        }
        const names = entries.map(([name, n]) => colorName(name, n, ctx.tty));
        return ctx.tty ? names.join('  ') + '\n' : names.join('\n') + '\n';
      };

      const parts = [];
      if (fileTargets.length) parts.push(fmt(fileTargets.map((t) => [t, this.getNode(t)])));
      for (const t of dirTargets) {
        const n = this.getNode(t);
        let names = Object.keys(n.children).sort(compareNames);
        if (!all) names = names.filter((x) => !x.startsWith('.'));
        let entries = names.map((x) => [x, n.children[x]]);
        if (all) {
          const parent = this.getNode(this.resolve(t) + '/..');
          entries = [['.', n], ['..', parent], ...entries];
        }
        if (flags.t) entries.sort((a, b) => b[1].mtime - a[1].mtime);
        if (flags.r) entries.reverse();
        let text = fmt(entries);
        if (long) text = 'insgesamt ' + entries.length * 4 + '\n' + text;
        if (targets.length > 1) text = t + ':\n' + text;
        parts.push(text);
      }
      ctx.write(parts.filter(Boolean).join('\n'));
      return code;
    },

    mkdir(args, ctx) {
      const { flags, operands } = getOpts(args);
      if (!operands.length) return ctx.error('mkdir: Fehlender Operand'), 1;
      for (const p of operands) {
        if (flags.p) {
          let cur = this.resolve(p) === '/' ? '/' : '';
          for (const seg of splitPath(this.resolve(p))) {
            cur += '/' + seg;
            const n = this.getNode(cur);
            if (n && n.type !== 'dir') {
              ctx.error("mkdir: '" + p + "' kann nicht angelegt werden: Datei existiert bereits");
              break;
            }
            if (!n) {
              const [parent, name] = this.parentOf(cur);
              parent.children[name] = dir();
            }
          }
          continue;
        }
        if (this.exists(p)) {
          ctx.error("mkdir: Verzeichnis »" + p + "« kann nicht angelegt werden: Die Datei existiert bereits");
          continue;
        }
        try {
          const [parent, name] = this.parentOf(p);
          parent.children[name] = dir();
          parent.mtime = now();
        } catch (e) {
          ctx.error("mkdir: Verzeichnis »" + p + "« kann nicht angelegt werden: Datei oder Verzeichnis nicht gefunden");
        }
      }
    },

    rmdir(args, ctx) {
      const { operands } = getOpts(args);
      if (!operands.length) return ctx.error('rmdir: Fehlender Operand'), 1;
      for (const p of operands) {
        const n = this.getNode(p);
        if (!n) ctx.error("rmdir: '" + p + "' konnte nicht entfernt werden: Datei oder Verzeichnis nicht gefunden");
        else if (n.type !== 'dir') ctx.error("rmdir: '" + p + "' konnte nicht entfernt werden: Ist kein Verzeichnis");
        else if (Object.keys(n.children).length) ctx.error("rmdir: '" + p + "' konnte nicht entfernt werden: Das Verzeichnis ist nicht leer");
        else {
          const [parent, name] = this.parentOf(p);
          delete parent.children[name];
        }
      }
    },

    touch(args, ctx) {
      const { operands } = getOpts(args);
      if (!operands.length) return ctx.error('touch: Fehlender Dateioperand'), 1;
      for (const p of operands) {
        const n = this.getNode(p);
        if (n) n.mtime = now();
        else {
          try {
            this.writeFile(p, '');
          } catch (e) {
            ctx.error("touch: '" + p + "' kann nicht berührt werden: Datei oder Verzeichnis nicht gefunden");
          }
        }
      }
    },

    rm(args, ctx) {
      const { flags, operands } = getOpts(args);
      const recursive = flags.r || flags.R || flags.recursive;
      if (!operands.length) return flags.f ? 0 : (ctx.error('rm: Fehlender Operand'), 1);
      for (const p of operands) {
        const abs = this.resolve(p);
        const n = this.getNode(p);
        if (!n) {
          if (!flags.f) ctx.error("rm: Entfernen von '" + p + "' nicht möglich: Datei oder Verzeichnis nicht gefunden");
          continue;
        }
        if (abs === '/' || abs === HOME || this.cwd === abs || this.cwd.startsWith(abs + '/')) {
          ctx.error("rm: Entfernen von '" + p + "' verweigert (Übungsschutz)");
          continue;
        }
        if (n.type === 'dir' && !recursive) {
          ctx.error("rm: Entfernen von '" + p + "' nicht möglich: Ist ein Verzeichnis");
          continue;
        }
        const [parent, name] = this.parentOf(p);
        delete parent.children[name];
        if (flags.v) ctx.write("'" + p + "' wurde entfernt\n");
      }
    },

    cp(args, ctx) {
      const { flags, operands } = getOpts(args);
      if (operands.length < 2) return ctx.error('cp: Fehlender Zieloperand'), 1;
      const dest = operands.pop();
      const destNode = this.getNode(dest);
      if (operands.length > 1 && (!destNode || destNode.type !== 'dir')) return ctx.error("cp: Ziel '" + dest + "' ist kein Verzeichnis"), 1;
      for (const src of operands) {
        const n = this.getNode(src);
        if (!n) {
          ctx.error("cp: der Aufruf von stat für '" + src + "' ist nicht möglich: Datei oder Verzeichnis nicht gefunden");
          continue;
        }
        if (n.type === 'dir' && !(flags.r || flags.R)) {
          ctx.error("cp: -r nicht angegeben; Verzeichnis '" + src + "' wird ausgelassen");
          continue;
        }
        const target = destNode && destNode.type === 'dir' ? dest + '/' + basename(src) : dest;
        const tAbs = this.resolve(target);
        if (n.type === 'dir' && (tAbs === this.resolve(src) || tAbs.startsWith(this.resolve(src) + '/'))) {
          ctx.error("cp: Verzeichnis '" + src + "' kann nicht in sich selbst kopiert werden");
          continue;
        }
        try {
          const existing = this.getNode(target);
          if (existing && existing.type === 'dir' && n.type !== 'dir') throw new Error("'" + target + "': Ist ein Verzeichnis");
          const [parent, name] = this.parentOf(target);
          const copy = clone(n);
          copy.mtime = now();
          parent.children[name] = copy;
        } catch (e) {
          ctx.error('cp: ' + e.message);
        }
      }
    },

    mv(args, ctx) {
      const { operands } = getOpts(args);
      if (operands.length < 2) return ctx.error('mv: Fehlender Zieloperand'), 1;
      const dest = operands.pop();
      const destNode = this.getNode(dest);
      if (operands.length > 1 && (!destNode || destNode.type !== 'dir')) return ctx.error("mv: Ziel '" + dest + "' ist kein Verzeichnis"), 1;
      for (const src of operands) {
        const n = this.getNode(src);
        if (!n) {
          ctx.error("mv: der Aufruf von stat für '" + src + "' ist nicht möglich: Datei oder Verzeichnis nicht gefunden");
          continue;
        }
        const sAbs = this.resolve(src);
        const target = destNode && destNode.type === 'dir' ? dest + '/' + basename(src) : dest;
        const tAbs = this.resolve(target);
        if (tAbs === sAbs) continue;
        if (tAbs.startsWith(sAbs + '/')) {
          ctx.error("mv: '" + src + "' kann nicht in sich selbst verschoben werden");
          continue;
        }
        if (this.cwd === sAbs || this.cwd.startsWith(sAbs + '/')) {
          ctx.error("mv: '" + src + "' wird gerade benutzt (Übungsschutz)");
          continue;
        }
        try {
          const [tParent, tName] = this.parentOf(target);
          const [sParent, sName] = this.parentOf(src);
          delete sParent.children[sName];
          tParent.children[tName] = n;
        } catch (e) {
          ctx.error('mv: ' + e.message);
        }
      }
    },

    cat(args, ctx) {
      const { flags, operands } = getOpts(args);
      let n = 1;
      for (const { content } of readInputs(this, operands, ctx, 'cat')) {
        if (flags.n) ctx.write(joinLines(lines(content).map((l) => String(n++).padStart(6) + '  ' + l)));
        else ctx.write(content);
      }
    },

    echo(args, ctx) {
      let newline = true;
      let escapes = false;
      while (args.length && /^-[neE]+$/.test(args[0])) {
        const f = args.shift();
        if (f.includes('n')) newline = false;
        if (f.includes('e')) escapes = true;
      }
      let s = args.join(' ');
      if (escapes) s = s.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
      ctx.write(s + (newline ? '\n' : ''));
    },

    head(args, ctx) {
      const { flags, operands } = getOpts(args, 'n');
      const count = parseInt(flags.n || '10', 10);
      const inputs = readInputs(this, operands, ctx, 'head');
      inputs.forEach(({ name, content }, i) => {
        if (inputs.length > 1) ctx.write((i ? '\n' : '') + '==> ' + name + ' <==\n');
        ctx.write(joinLines(lines(content).slice(0, count)));
      });
    },

    tail(args, ctx) {
      const { flags, operands } = getOpts(args, 'n');
      const count = parseInt(flags.n || '10', 10);
      const inputs = readInputs(this, operands, ctx, 'tail');
      inputs.forEach(({ name, content }, i) => {
        if (inputs.length > 1) ctx.write((i ? '\n' : '') + '==> ' + name + ' <==\n');
        const l = lines(content);
        ctx.write(joinLines(count ? l.slice(-count) : []));
      });
    },

    wc(args, ctx) {
      const { flags, operands } = getOpts(args);
      const show = flags.l || flags.w || flags.c || flags.m ? flags : { l: true, w: true, c: true };
      const total = [0, 0, 0];
      const rows = [];
      const inputs = readInputs(this, operands, ctx, 'wc');
      for (const { name, content } of inputs) {
        const counts = [
          (content.match(/\n/g) || []).length,
          content.split(/\s+/).filter(Boolean).length,
          new TextEncoder().encode(content).length,
        ];
        counts.forEach((c, i) => (total[i] += c));
        rows.push([counts, name]);
      }
      if (inputs.length > 1) rows.push([total, 'insgesamt']);
      const single = [show.l, show.w, show.c || show.m].filter(Boolean).length === 1;
      for (const [counts, name] of rows) {
        const nums = [];
        if (show.l) nums.push(counts[0]);
        if (show.w) nums.push(counts[1]);
        if (show.c || show.m) nums.push(counts[2]);
        const text = single && !name ? String(nums[0]) : nums.map((x) => String(x).padStart(single ? 1 : 3)).join(' ');
        ctx.write(text + (name ? ' ' + name : '') + '\n');
      }
    },

    grep(args, ctx) {
      const { flags, operands } = getOpts(args, 'e');
      let pattern = flags.e !== undefined ? flags.e : operands.shift();
      if (pattern === undefined) return ctx.error('Aufruf: grep [OPTION]... MUSTER [DATEI]...'), 2;
      let re;
      try {
        re = new RegExp(flags.F ? pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : pattern, flags.i ? 'i' : '');
      } catch (e) {
        re = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags.i ? 'i' : '');
      }
      let files = operands;
      if (flags.r || flags.R) {
        const start = files.length ? files : ['.'];
        files = [];
        const walk = (p) => {
          const n = this.getNode(p);
          if (!n) return;
          if (n.type === 'file') files.push(p);
          else for (const c of Object.keys(n.children).sort(compareNames)) walk(p === '.' ? c : p + '/' + c);
        };
        start.forEach(walk);
      }
      const inputs = readInputs(this, files, ctx, 'grep');
      const showName = inputs.length > 1 || flags.r || flags.R;
      let found = false;
      for (const { name, content } of inputs) {
        let count = 0;
        lines(content).forEach((l, idx) => {
          const match = re.test(l) !== !!flags.v;
          if (!match) return;
          count++;
          found = true;
          if (flags.c || flags.l) return;
          let text = l;
          if (ctx.tty && !flags.v) {
            const g = new RegExp(re.source, re.flags + 'g');
            text = l.replace(g, (m) => (m ? C.hl + m + C.reset : m));
          }
          ctx.write((showName ? name + ':' : '') + (flags.n ? idx + 1 + ':' : '') + text + '\n');
        });
        if (flags.c) ctx.write((showName ? name + ':' : '') + count + '\n');
        if (flags.l && count) ctx.write(name + '\n');
      }
      return found ? 0 : 1;
    },

    sort(args, ctx) {
      const { flags, operands } = getOpts(args);
      let all = [];
      for (const { content } of readInputs(this, operands, ctx, 'sort')) all.push(...lines(content));
      if (flags.n) all.sort((a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0));
      else all.sort((a, b) => a.localeCompare(b, 'de'));
      if (flags.r) all.reverse();
      if (flags.u) all = all.filter((l, i) => i === 0 || l !== all[i - 1]);
      ctx.write(joinLines(all));
    },

    uniq(args, ctx) {
      const { flags, operands } = getOpts(args);
      const [{ content }] = readInputs(this, operands.slice(0, 1), ctx, 'uniq');
      const groups = [];
      for (const l of lines(content)) {
        if (groups.length && groups[groups.length - 1][0] === l) groups[groups.length - 1][1]++;
        else groups.push([l, 1]);
      }
      let res = groups;
      if (flags.d) res = res.filter((g) => g[1] > 1);
      if (flags.u) res = res.filter((g) => g[1] === 1);
      ctx.write(joinLines(res.map(([l, c]) => (flags.c ? String(c).padStart(7) + ' ' + l : l))));
    },

    cut(args, ctx) {
      const { flags, operands } = getOpts(args, 'df');
      if (!flags.f) return ctx.error('cut: Sie müssen eine Liste von Feldern angeben (-f)'), 1;
      const delim = flags.d === undefined ? '\t' : flags.d;
      const fields = new Set();
      for (const part of String(flags.f).split(',')) {
        const [a, b] = part.split('-').map((x) => parseInt(x, 10));
        if (part.includes('-')) for (let k = a || 1; k <= (b || 100); k++) fields.add(k);
        else fields.add(a);
      }
      for (const { content } of readInputs(this, operands, ctx, 'cut')) {
        ctx.write(joinLines(lines(content).map((l) => l.split(delim).filter((_, i) => fields.has(i + 1)).join(delim))));
      }
    },

    find(args, ctx) {
      const starts = [];
      let i = 0;
      while (i < args.length && !args[i].startsWith('-')) starts.push(args[i++]);
      if (!starts.length) starts.push('.');
      let nameRe = null;
      let type = null;
      for (; i < args.length; i++) {
        if (args[i] === '-name' || args[i] === '-iname') {
          const p = args[++i];
          if (p === undefined) return ctx.error('find: Fehlendes Argument für »' + args[i - 1] + '«'), 1;
          nameRe = wildcardToRegex(p);
          if (args[i - 1] === '-iname') nameRe = new RegExp(nameRe.source, 'i');
        } else if (args[i] === '-type') {
          type = args[++i];
          if (type !== 'f' && type !== 'd') return ctx.error('find: Unbekanntes Argument für -type: ' + type), 1;
        } else return ctx.error('find: Unbekannte Option »' + args[i] + '«'), 1;
      }
      const walk = (p, n) => {
        const okType = !type || (type === 'd' ? n.type === 'dir' : n.type === 'file');
        const okName = !nameRe || nameRe.test(basename(p) === '.' ? '.' : basename(p));
        if (okType && okName) ctx.write(p + '\n');
        if (n.type === 'dir') for (const c of Object.keys(n.children).sort(compareNames)) walk(p.replace(/\/$/, '') + '/' + c, n.children[c]);
      };
      for (const s of starts) {
        const n = this.getNode(s);
        if (!n) ctx.error("find: '" + s + "': Datei oder Verzeichnis nicht gefunden");
        else walk(s, n);
      }
    },

    chmod(args, ctx) {
      const recursive = args.includes('-R');
      const rest = args.filter((a) => a !== '-R');
      if (rest.length < 2) return ctx.error('chmod: Fehlender Operand'), 1;
      const mode = rest[0];
      const apply = (n) => {
        if (/^[0-7]{3,4}$/.test(mode)) {
          n.mode = parseInt(mode, 8) & 0o777;
          return true;
        }
        for (const clause of mode.split(',')) {
          const m = /^([ugoa]*)([+\-=])([rwx]*)$/.exec(clause);
          if (!m) return false;
          const who = m[1] || 'a';
          let bits = 0;
          for (const p of m[3]) bits |= { r: 4, w: 2, x: 1 }[p];
          let mask = 0;
          if (who.includes('u') || who.includes('a')) mask |= bits << 6;
          if (who.includes('g') || who.includes('a')) mask |= bits << 3;
          if (who.includes('o') || who.includes('a')) mask |= bits;
          if (m[2] === '+') n.mode |= mask;
          else if (m[2] === '-') n.mode &= ~mask;
          else {
            let clear = 0;
            if (who.includes('u') || who.includes('a')) clear |= 0o700;
            if (who.includes('g') || who.includes('a')) clear |= 0o070;
            if (who.includes('o') || who.includes('a')) clear |= 0o007;
            n.mode = (n.mode & ~clear) | mask;
          }
        }
        return true;
      };
      for (const p of rest.slice(1)) {
        const n = this.getNode(p);
        if (!n) {
          ctx.error("chmod: Zugriff auf '" + p + "' nicht möglich: Datei oder Verzeichnis nicht gefunden");
          continue;
        }
        const visit = (node) => {
          if (!apply(node)) throw new Error("Ungültiger Modus: »" + mode + "«");
          if (recursive && node.type === 'dir') Object.values(node.children).forEach(visit);
        };
        visit(n);
      }
    },

    tree(args, ctx) {
      const { flags, operands } = getOpts(args);
      const start = operands[0] || '.';
      const root = this.getNode(start);
      if (!root || root.type !== 'dir') return ctx.error(start + ' [Fehler beim Öffnen des Verzeichnisses]'), 1;
      let dirs = 0;
      let files = 0;
      ctx.write(colorName(start, root, ctx.tty) + '\n');
      const walk = (n, prefix) => {
        let names = Object.keys(n.children).sort(compareNames);
        if (!flags.a) names = names.filter((x) => !x.startsWith('.'));
        names.forEach((name, i) => {
          const child = n.children[name];
          const last = i === names.length - 1;
          ctx.write(prefix + (last ? '└── ' : '├── ') + colorName(name, child, ctx.tty) + '\n');
          if (child.type === 'dir') {
            dirs++;
            walk(child, prefix + (last ? '    ' : '│   '));
          } else files++;
        });
      };
      walk(root, '');
      ctx.write('\n' + dirs + ' Verzeichnisse, ' + files + ' Dateien\n');
    },

    whoami(args, ctx) {
      ctx.write(USER + '\n');
    },

    hostname(args, ctx) {
      ctx.write(HOST + '\n');
    },

    date(args, ctx) {
      ctx.write(
        new Date().toLocaleString('de-DE', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + '\n'
      );
    },

    clear() {
      return 'clear';
    },

    history(args, ctx) {
      this.history.forEach((h, i) => ctx.write(String(i + 1).padStart(5) + '  ' + h + '\n'));
    },

    env(args, ctx) {
      for (const [k, v] of Object.entries(this.env)) if (k !== '?') ctx.write(k + '=' + v + '\n');
    },

    export(args) {
      for (const a of args) {
        const m = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(a);
        if (m) this.env[m[1]] = m[2];
      }
    },

    which(args, ctx) {
      let code = 0;
      for (const a of args) {
        if (COMMANDS[a]) ctx.write('/usr/bin/' + a + '\n');
        else code = 1;
      }
      return code;
    },

    bash(args, ctx) {
      if (!args.length) return ctx.error('bash: Interaktive Unter-Shells werden hier nicht unterstützt'), 1;
      const n = this.getNode(args[0]);
      if (!n || n.type !== 'file') return ctx.error('bash: ' + args[0] + ': Datei oder Verzeichnis nicht gefunden'), 127;
      return execScript(this, n.content, ctx);
    },

    true() {
      return 0;
    },
    false() {
      return 1;
    },

    exit(args, ctx) {
      ctx.write('(In dieser Übungs-Shell gibt es kein Exit – mach einfach weiter!)\n');
    },

    sudo(args, ctx) {
      ctx.write('[sudo] Passwort für ' + USER + ': \n');
      ctx.error(USER + ' ist nicht in der sudoers-Datei. Dieser Vorfall wird gemeldet. 😉');
      return 1;
    },

    nano(args, ctx) {
      ctx.error('Editoren gibt es in dieser Übungs-Shell nicht. Tipp: echo "Text" > datei.txt');
      return 1;
    },

    man(args, ctx) {
      if (!args.length) return ctx.error('Welche Handbuchseite wollen Sie?'), 1;
      const help = MANUAL[args[0]];
      if (!help) return ctx.error('Kein Handbucheintrag für ' + args[0] + ' vorhanden'), 16;
      ctx.write(args[0].toUpperCase() + '\n\n' + help + '\n');
    },

    help(args, ctx) {
      ctx.write('Verfügbare Befehle:\n\n');
      for (const name of Object.keys(MANUAL)) ctx.write('  ' + name.padEnd(9) + MANUAL[name].split('\n')[0] + '\n');
      ctx.write('\nMehr zu einem Befehl: man BEFEHL\n');
    },
  };
  // Lange Optionen (--parents) auf ihre Kurzform (-p) abbilden, damit beide
  // Schreibweisen funktionieren. --lines=3 wird zu -n 3.
  const LONG_OPTIONS = {
    ls: { all: 'a', 'human-readable': 'h', reverse: 'r', directory: 'd' },
    mkdir: { parents: 'p' },
    rm: { recursive: 'r', force: 'f', verbose: 'v' },
    cp: { recursive: 'r' },
    cat: { number: 'n' },
    head: { lines: 'n' },
    tail: { lines: 'n' },
    wc: { lines: 'l', words: 'w', bytes: 'c', chars: 'm' },
    grep: {
      'ignore-case': 'i',
      'invert-match': 'v',
      count: 'c',
      'line-number': 'n',
      recursive: 'r',
      'files-with-matches': 'l',
      'extended-regexp': 'E',
      'fixed-strings': 'F',
    },
    sort: { 'numeric-sort': 'n', reverse: 'r', unique: 'u' },
    uniq: { count: 'c', repeated: 'd', unique: 'u' },
    cut: { delimiter: 'd', fields: 'f' },
    chmod: { recursive: 'R' },
  };

  function expandLongOptions(name, args) {
    const map = LONG_OPTIONS[name];
    if (!map) return args;
    const res = [];
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--') return res.concat(args.slice(i));
      const m = /^--([a-z-]+)(?:=(.*))?$/.exec(args[i]);
      if (m && map[m[1]]) res.push('-' + map[m[1]], ...(m[2] !== undefined ? [m[2]] : []));
      else res.push(args[i]);
    }
    return res;
  }

  COMMANDS.less = COMMANDS.more = COMMANDS.cat;
  COMMANDS.vi = COMMANDS.vim = COMMANDS.nano;
  COMMANDS.sh = COMMANDS.bash;
  COMMANDS.ll = function (args, ctx) {
    return COMMANDS.ls.call(this, ['-l', ...args], ctx);
  };

  const MANUAL = {
    pwd: 'Zeigt das aktuelle Verzeichnis (print working directory).',
    ls: 'Listet Dateien und Ordner auf.\n  -a  auch versteckte Dateien (beginnen mit .)\n  -l  ausführliche Liste mit Rechten, Größe, Datum\n  -h  Größen lesbar (mit -l)\n  -t  nach Änderungszeit sortieren\n  -r  Reihenfolge umkehren',
    cd: 'Wechselt das Verzeichnis.\n  cd ordner   in einen Ordner\n  cd ..       eine Ebene nach oben\n  cd ~ / cd   ins Home-Verzeichnis\n  cd -        zurück zum vorherigen Ordner',
    mkdir: 'Legt Verzeichnisse an.\n  -p  fehlende Elternordner mit anlegen',
    rmdir: 'Löscht leere Verzeichnisse.',
    touch: 'Legt eine leere Datei an (oder aktualisiert ihr Datum).',
    rm: 'Löscht Dateien.\n  -r  Ordner samt Inhalt löschen\n  -f  keine Fehlermeldung, wenn nicht vorhanden\n  Achtung: Es gibt keinen Papierkorb!',
    cp: 'Kopiert Dateien.\n  cp quelle ziel\n  -r  Ordner rekursiv kopieren',
    mv: 'Verschiebt oder benennt um.\n  mv alt.txt neu.txt   umbenennen\n  mv datei ordner/     verschieben',
    cat: 'Gibt den Inhalt von Dateien aus.\n  -n  Zeilennummern anzeigen',
    echo: 'Gibt Text aus.\n  echo "Hallo" > datei   in Datei schreiben (überschreibt)\n  echo "Hallo" >> datei  an Datei anhängen',
    head: 'Zeigt den Anfang einer Datei (Standard: 10 Zeilen).\n  -n ZAHL  Anzahl der Zeilen',
    tail: 'Zeigt das Ende einer Datei (Standard: 10 Zeilen).\n  -n ZAHL  Anzahl der Zeilen',
    wc: 'Zählt Zeilen, Wörter und Bytes.\n  -l  nur Zeilen\n  -w  nur Wörter\n  -c  nur Bytes',
    grep: 'Sucht Zeilen, die ein Muster enthalten.\n  -i  Groß-/Kleinschreibung ignorieren\n  -v  Zeilen OHNE Treffer\n  -n  Zeilennummern\n  -c  nur Anzahl der Treffer\n  -r  rekursiv in Ordnern suchen\n  -l  nur Dateinamen',
    sort: 'Sortiert Zeilen.\n  -r  umgekehrt\n  -n  numerisch\n  -u  Duplikate entfernen',
    uniq: 'Entfernt aufeinanderfolgende doppelte Zeilen (meist nach sort).\n  -c  Anzahl voranstellen\n  -d  nur doppelte Zeilen',
    cut: 'Schneidet Spalten aus.\n  -d ZEICHEN  Trennzeichen\n  -f LISTE   Felder, z. B. -f 1 oder -f 1,3',
    find: 'Sucht Dateien.\n  find ORT -name "*.txt"\n  -type f  nur Dateien\n  -type d  nur Ordner',
    chmod: 'Ändert Zugriffsrechte.\n  chmod +x datei   ausführbar machen\n  chmod 644 datei  rw-r--r--\n  chmod u-w datei  Schreibrecht für Besitzer entfernen',
    tree: 'Zeigt Ordner als Baum.',
    whoami: 'Zeigt deinen Benutzernamen.',
    date: 'Zeigt Datum und Uhrzeit.',
    history: 'Zeigt die zuletzt eingegebenen Befehle.',
    clear: 'Leert den Bildschirm.',
    env: 'Zeigt Umgebungsvariablen. Nutze sie mit $NAME, z. B. echo $HOME.',
    which: 'Zeigt, wo ein Befehl liegt.',
    man: 'Zeigt die Hilfe zu einem Befehl.',
  };

  const api = { Shell, defaultTree, stripColors, prettyPath, resolvePath, COMMANDS, MANUAL, HOME, USER, HOST };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.LinuxShell = api;
})(typeof window !== 'undefined' ? window : globalThis);
