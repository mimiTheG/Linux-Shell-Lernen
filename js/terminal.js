// Terminal-Ansicht: Ausgabe, Eingabezeile und Sondertasten-Leiste für Touch-Geräte.
(function (global) {
  'use strict';

  const COLOR_CLASS = { 31: 'c-err', 32: 'c-exec', 33: 'c-hl', 34: 'c-dir' };

  function escapeHtml(s) {
    return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  }

  // Wandelt die Farbmarker der Shell in <span>-Elemente um.
  function renderAnsi(text) {
    let open = false;
    const html = escapeHtml(text).replace(/\x1b\[(\d+)m/g, (_, code) => {
      let s = open ? '</span>' : '';
      open = false;
      if (COLOR_CLASS[code]) {
        s += '<span class="' + COLOR_CLASS[code] + '">';
        open = true;
      }
      return s;
    });
    return open ? html + '</span>' : html;
  }

  const KEYS = [
    { label: 'Tab', action: 'tab' },
    { label: '↑', action: 'up', aria: 'Vorheriger Befehl' },
    { label: '↓', action: 'down', aria: 'Nächster Befehl' },
    { label: '|', text: ' | ' },
    { label: '/', text: '/' },
    { label: '-', text: '-' },
    { label: '~', text: '~' },
    { label: '.', text: '.' },
    { label: '>', text: ' > ' },
    { label: '*', text: '*' },
    { label: '"', text: '"' },
    { label: '&&', text: ' && ' },
    { label: '$', text: '$' },
  ];

  class Terminal {
    // onCommand(line, output) wird nach jedem ausgeführten Befehl aufgerufen.
    constructor(parent, shell, { onCommand, welcome } = {}) {
      this.shell = shell;
      this.onCommand = onCommand;
      this.histIndex = null;
      this.draft = '';

      this.el = document.createElement('div');
      this.el.className = 'terminal';
      this.el.innerHTML =
        '<div class="term-screen" role="log" aria-live="polite">' +
        '<div class="term-output"></div>' +
        '<form class="term-line" autocomplete="off">' +
        '<label class="term-prompt"></label>' +
        '<input class="term-input" type="text" enterkeyhint="send" autocapitalize="off" autocorrect="off" autocomplete="off" spellcheck="false" aria-label="Befehl eingeben" />' +
        '</form></div>' +
        '<div class="keybar" role="toolbar" aria-label="Sondertasten"></div>';
      parent.appendChild(this.el);

      this.screen = this.el.querySelector('.term-screen');
      this.output = this.el.querySelector('.term-output');
      this.promptEl = this.el.querySelector('.term-prompt');
      this.input = this.el.querySelector('.term-input');
      this.updatePrompt();

      const keybar = this.el.querySelector('.keybar');
      for (const k of KEYS) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = k.label;
        if (k.aria) b.setAttribute('aria-label', k.aria);
        // pointerdown + preventDefault hält die Bildschirmtastatur offen.
        b.addEventListener('pointerdown', (e) => e.preventDefault());
        b.addEventListener('click', () => {
          if (k.action === 'tab') this.complete();
          else if (k.action === 'up') this.historyStep(-1);
          else if (k.action === 'down') this.historyStep(1);
          else this.insert(k.text);
          this.input.focus();
        });
        keybar.appendChild(b);
      }

      this.el.querySelector('form').addEventListener('submit', (e) => {
        e.preventDefault();
        this.submit();
      });
      this.input.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          e.preventDefault();
          this.complete();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.historyStep(-1);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.historyStep(1);
        } else if (e.key === 'l' && e.ctrlKey) {
          e.preventDefault();
          this.output.innerHTML = '';
        }
      });
      this.screen.addEventListener('click', () => {
        if (!window.getSelection().toString()) this.input.focus();
      });

      if (welcome) this.print(welcome, 'term-welcome');
    }

    updatePrompt() {
      this.promptEl.textContent = this.shell.prompt + ' ';
    }

    print(text, cls) {
      const div = document.createElement('div');
      if (cls) div.className = cls;
      div.innerHTML = renderAnsi(text);
      this.output.appendChild(div);
      this.scroll();
    }

    scroll() {
      this.screen.scrollTop = this.screen.scrollHeight;
    }

    insert(text) {
      const inp = this.input;
      const start = inp.selectionStart ?? inp.value.length;
      const end = inp.selectionEnd ?? inp.value.length;
      // Doppelte Leerzeichen um Operatoren vermeiden.
      if (text.startsWith(' ') && inp.value.slice(0, start).endsWith(' ')) text = text.slice(1);
      inp.value = inp.value.slice(0, start) + text + inp.value.slice(end);
      const pos = start + text.length;
      inp.setSelectionRange(pos, pos);
    }

    complete() {
      const before = this.input.value.slice(0, this.input.selectionStart ?? this.input.value.length);
      const after = this.input.value.slice(before.length);
      const { line, options } = this.shell.complete(before);
      if (options.length) {
        this.print(this.shell.prompt + ' ' + this.input.value, 'term-cmd');
        this.print(options.join('  '));
      }
      this.input.value = line + after;
      this.input.setSelectionRange(line.length, line.length);
    }

    historyStep(dir) {
      const hist = this.shell.history;
      if (!hist.length) return;
      if (this.histIndex === null) {
        if (dir > 0) return;
        this.draft = this.input.value;
        this.histIndex = hist.length;
      }
      this.histIndex = Math.max(0, Math.min(hist.length, this.histIndex + dir));
      this.input.value = this.histIndex === hist.length ? this.draft : hist[this.histIndex];
      if (this.histIndex === hist.length) this.histIndex = null;
      const n = this.input.value.length;
      this.input.setSelectionRange(n, n);
    }

    run(line) {
      this.print(this.shell.prompt + ' ' + line, 'term-cmd');
      const result = this.shell.run(line);
      if (result.clear) this.output.innerHTML = '';
      else if (result.output) this.print(result.output.replace(/\n$/, ''));
      this.updatePrompt();
      this.scroll();
      if (this.onCommand) this.onCommand(line, global.LinuxShell.stripColors(result.output));
    }

    submit() {
      const line = this.input.value;
      this.input.value = '';
      this.histIndex = null;
      this.run(line);
    }

    focus() {
      this.input.focus({ preventScroll: true });
    }
  }

  global.Terminal = Terminal;
})(window);
