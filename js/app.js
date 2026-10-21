// App-Steuerung: Navigation, Fortschritt, Übungen, Terminal und Spickzettel.
(function () {
  'use strict';

  const { Shell, MANUAL } = window.LinuxShell;
  const { CHAPTERS } = window.Lessons;

  const view = document.getElementById('view');
  const titleEl = document.getElementById('title');
  const backBtn = document.getElementById('back-btn');
  const extraEl = document.getElementById('topbar-extra');
  const tabbar = document.getElementById('tabbar');

  // --- Speicher (alle Zugriffe abgesichert, z. B. im privaten Modus) --------

  const store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(key);
        return v === null ? fallback : JSON.parse(v);
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        /* ignorieren */
      }
    },
  };

  const PROGRESS_KEY = 'shelltrainer.progress';
  const SANDBOX_KEY = 'shelltrainer.sandbox';
  let progress = store.get(PROGRESS_KEY, {});

  const exKey = (ch, ex) => ch.id + '/' + ex.id;
  const isDone = (ch, ex) => !!progress[exKey(ch, ex)];
  const markDone = (ch, ex) => {
    progress[exKey(ch, ex)] = true;
    store.set(PROGRESS_KEY, progress);
  };
  const chapterDone = (ch) => ch.exercises.filter((ex) => isDone(ch, ex)).length;
  const totalCount = CHAPTERS.reduce((n, ch) => n + ch.exercises.length, 0);
  const totalDone = () => CHAPTERS.reduce((n, ch) => n + chapterDone(ch), 0);

  // --- Hilfen ---------------------------------------------------------------

  function h(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (v !== false && v !== null && v !== undefined) el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat()) if (c !== null && c !== undefined) el.append(c);
    return el;
  }

  function progressBar(done, total) {
    const pct = total ? Math.round((done / total) * 100) : 0;
    return h('div', { class: 'progress', role: 'progressbar', 'aria-valuenow': pct, 'aria-valuemin': 0, 'aria-valuemax': 100 }, h('span', { style: 'width:' + pct + '%' }));
  }

  function setChrome({ title, back, tab, extra }) {
    titleEl.textContent = title;
    document.title = title === 'Shell Trainer' ? title : title + ' · Shell Trainer';
    backBtn.hidden = !back;
    backBtn.onclick = back ? () => navigate(back) : null;
    extraEl.replaceChildren(...(extra ? [extra] : []));
    for (const b of tabbar.querySelectorAll('button')) b.classList.toggle('active', b.dataset.tab === tab);
    document.body.classList.toggle('in-exercise', tab === 'exercise');
  }

  function navigate(hash) {
    if (location.hash === hash) render();
    else location.hash = hash;
  }

  // --- Ansichten ------------------------------------------------------------

  function renderHome() {
    setChrome({ title: 'Shell Trainer', tab: 'learn' });
    const done = totalDone();
    const next = findNext();
    view.replaceChildren(
      h(
        'section',
        { class: 'hero' },
        h('div', { class: 'hero-prompt', 'aria-hidden': 'true' }, 'lerner@linux:~$ ', h('span', { class: 'cursor' })),
        h('h2', {}, done ? 'Weiter geht’s!' : 'Lerne die Linux-Shell'),
        h('p', {}, done ? done + ' von ' + totalCount + ' Übungen geschafft.' : 'Kleine Aufgaben, echtes Tippen, sofortiges Feedback. Alles läuft offline in einer sicheren Übungs-Shell.'),
        progressBar(done, totalCount),
        next
          ? h('button', { class: 'primary', onclick: () => navigate('#/uebung/' + next.ch.id + '/' + next.ex.id) }, done ? 'Weiter mit „' + next.ex.title + '“' : 'Erste Übung starten')
          : h('p', { class: 'all-done' }, '🏆 Alle Übungen geschafft! Im Terminal kannst du frei weiter üben.')
      ),
      h(
        'ul',
        { class: 'chapters' },
        CHAPTERS.map((ch, i) => {
          const d = chapterDone(ch);
          return h(
            'li',
            {},
            h(
              'a',
              { class: 'card chapter-card', href: '#/kapitel/' + ch.id },
              h('span', { class: 'chapter-icon', 'aria-hidden': 'true' }, ch.icon),
              h(
                'span',
                { class: 'chapter-body' },
                h('span', { class: 'chapter-num' }, 'Kapitel ' + (i + 1)),
                h('strong', {}, ch.title),
                h('span', { class: 'muted' }, d + ' / ' + ch.exercises.length + (d === ch.exercises.length ? ' ✓' : '')),
                progressBar(d, ch.exercises.length)
              )
            )
          );
        })
      )
    );
  }

  function renderChapter(ch) {
    setChrome({ title: ch.title, back: '#/', tab: 'learn' });
    view.replaceChildren(
      h('p', { class: 'chapter-intro' }, ch.intro),
      h(
        'ol',
        { class: 'exercises' },
        ch.exercises.map((ex) =>
          h(
            'li',
            {},
            h(
              'a',
              { class: 'card exercise-card' + (isDone(ch, ex) ? ' done' : ''), href: '#/uebung/' + ch.id + '/' + ex.id },
              h('span', { class: 'check', 'aria-label': isDone(ch, ex) ? 'erledigt' : 'offen' }, isDone(ch, ex) ? '✓' : ''),
              h('span', {}, h('strong', {}, ex.title), h('span', { class: 'muted small', html: ex.task }))
            )
          )
        )
      )
    );
  }

  function findNext(afterCh, afterEx) {
    const flat = CHAPTERS.flatMap((ch) => ch.exercises.map((ex) => ({ ch, ex })));
    let start = 0;
    if (afterEx) start = flat.findIndex((x) => x.ch === afterCh && x.ex === afterEx) + 1;
    for (let i = 0; i < flat.length; i++) {
      const x = flat[(start + i) % flat.length];
      if (!isDone(x.ch, x.ex)) return x;
    }
    return afterEx ? flat[start] || null : null;
  }

  function renderExercise(ch, ex) {
    const idx = ch.exercises.indexOf(ex);
    const restart = h('button', { class: 'icon-btn', 'aria-label': 'Übung neu starten', title: 'Neu starten', onclick: () => renderExercise(ch, ex) }, '↺');
    setChrome({ title: ch.title, back: '#/kapitel/' + ch.id, tab: 'exercise', extra: restart });

    const shell = new Shell();
    if (ex.setup) ex.setup(shell);

    const hintBox = h('div', { class: 'hint', hidden: true });
    const showHint = (text, isSolution) => {
      hintBox.hidden = false;
      hintBox.replaceChildren(
        h('span', {}, isSolution ? '👀 Lösung: ' : '💡 Tipp: '),
        isSolution ? h('code', {}, text) : text,
        isSolution ? h('button', { class: 'link', onclick: () => { term.input.value = text; term.focus(); } }, 'einfügen') : null
      );
    };

    const nextEx = ch.exercises[idx + 1] ? { ch, ex: ch.exercises[idx + 1] } : findNext(ch, ex);
    const success = h(
      'div',
      { class: 'success', hidden: true, role: 'status' },
      h('span', { class: 'success-text' }, '✅ Geschafft!'),
      nextEx
        ? h('button', { class: 'primary small', onclick: () => navigate('#/uebung/' + nextEx.ch.id + '/' + nextEx.ex.id) }, 'Weiter →')
        : h('button', { class: 'primary small', onclick: () => navigate('#/') }, 'Übersicht')
    );

    const card = h(
      'section',
      { class: 'task-card' },
      h('div', { class: 'task-meta' }, ch.icon + ' Übung ' + (idx + 1) + ' von ' + ch.exercises.length + (isDone(ch, ex) ? ' · ✓ erledigt' : '')),
      h('h2', {}, ex.title),
      h('p', { class: 'task', html: ex.task }),
      h('details', { class: 'explain', open: !isDone(ch, ex) }, h('summary', {}, 'Erklärung'), h('p', { html: ex.explain })),
      h(
        'div',
        { class: 'task-actions' },
        h('button', { class: 'chip', onclick: () => showHint(ex.hint) }, '💡 Tipp'),
        h('button', { class: 'chip', onclick: () => showHint(ex.solution, true) }, '👀 Lösung')
      ),
      hintBox,
      success
    );

    const termWrap = h('div', { class: 'term-wrap' });
    view.replaceChildren(h('div', { class: 'exercise' }, card, termWrap));

    let solved = false;
    const term = new window.Terminal(termWrap, shell, {
      onCommand(line, output) {
        if (solved) return;
        let ok = false;
        try {
          ok = ex.check({ shell, line, output });
        } catch (e) {
          ok = false;
        }
        if (!ok) return;
        solved = true;
        markDone(ch, ex);
        success.hidden = false;
        card.classList.add('solved');
        if (navigator.vibrate) navigator.vibrate(40);
        card.scrollTop = card.scrollHeight;
      },
    });
    if (!matchMedia('(pointer: coarse)').matches) term.focus();
  }

  let sandbox = null;
  function loadSandbox() {
    const saved = store.get(SANDBOX_KEY, null);
    const shell = new Shell();
    if (saved && saved.root) {
      shell.root = saved.root;
      shell.cwd = shell.isDir(saved.cwd) ? saved.cwd : shell.cwd;
      shell.history = saved.history || [];
      shell.env.PWD = shell.cwd;
    }
    return shell;
  }

  function renderSandbox() {
    const reset = h(
      'button',
      {
        class: 'icon-btn',
        'aria-label': 'Terminal zurücksetzen',
        title: 'Zurücksetzen',
        onclick: () => {
          if (!confirm('Alle Dateien im Übungs-Terminal auf den Anfangszustand zurücksetzen?')) return;
          sandbox = new Shell();
          store.set(SANDBOX_KEY, null);
          renderSandbox();
        },
      },
      '↺'
    );
    setChrome({ title: 'Freies Terminal', tab: 'sandbox', extra: reset });
    if (!sandbox) sandbox = loadSandbox();
    const wrap = h('div', { class: 'term-wrap full' });
    view.replaceChildren(wrap);
    const term = new window.Terminal(wrap, sandbox, {
      welcome: 'Willkommen im freien Terminal! Hier kannst du alles ausprobieren – nichts kann kaputtgehen.\nTippe \x1b[33mhelp\x1b[0m für alle Befehle oder \x1b[33mtree\x1b[0m für einen Überblick.\n',
      onCommand() {
        store.set(SANDBOX_KEY, { root: sandbox.root, cwd: sandbox.cwd, history: sandbox.history.slice(-100) });
      },
    });
    if (!matchMedia('(pointer: coarse)').matches) term.focus();
  }

  const GROUPS = [
    ['Navigation', ['pwd', 'ls', 'cd', 'tree']],
    ['Dateien & Ordner', ['mkdir', 'touch', 'cp', 'mv', 'rm', 'rmdir']],
    ['Inhalte', ['cat', 'echo', 'head', 'tail', 'wc']],
    ['Suchen & Filtern', ['grep', 'find', 'sort', 'uniq', 'cut']],
    ['Rechte', ['chmod']],
    ['System & Shell', ['whoami', 'date', 'history', 'clear', 'env', 'which', 'man']],
  ];
  const SYNTAX = [
    ['a | b', 'Ausgabe von a als Eingabe an b (Pipe)'],
    ['a > datei', 'Ausgabe in Datei schreiben (überschreibt)'],
    ['a >> datei', 'Ausgabe an Datei anhängen'],
    ['a < datei', 'Datei als Eingabe verwenden'],
    ['a && b', 'b nur, wenn a erfolgreich war'],
    ['a ; b', 'erst a, dann b'],
    ['*  ?', 'Wildcards: beliebig viele / genau ein Zeichen'],
    ['~  .  ..', 'Home, aktueller Ordner, Elternordner'],
    ['$NAME', 'Wert einer Variable, z. B. $HOME'],
  ];

  function renderReference() {
    setChrome({ title: 'Spickzettel', tab: 'reference' });
    const search = h('input', { type: 'search', class: 'search', placeholder: 'Befehl suchen …', 'aria-label': 'Befehl suchen' });
    const list = h('div', {});
    const draw = () => {
      const q = search.value.trim().toLowerCase();
      const sections = GROUPS.map(([name, cmds]) => {
        const items = cmds.filter((c) => !q || c.includes(q) || MANUAL[c].toLowerCase().includes(q));
        if (!items.length) return null;
        return h(
          'section',
          { class: 'ref-group' },
          h('h3', {}, name),
          items.map((c) => {
            const [first, ...rest] = MANUAL[c].split('\n');
            return h('div', { class: 'card ref-item' }, h('code', { class: 'ref-cmd' }, c), h('p', {}, first), rest.length ? h('pre', {}, rest.map((l) => l.trim()).join('\n')) : null);
          })
        );
      });
      const syntax = SYNTAX.filter(([s, d]) => !q || s.includes(q) || d.toLowerCase().includes(q));
      if (syntax.length) {
        sections.push(
          h('section', { class: 'ref-group' }, h('h3', {}, 'Shell-Syntax'), h('div', { class: 'card' }, h('dl', { class: 'syntax' }, syntax.map(([s, d]) => [h('dt', {}, h('code', {}, s)), h('dd', {}, d)]))))
        );
      }
      const visible = sections.filter(Boolean);
      list.replaceChildren(...(visible.length ? visible : [h('p', { class: 'muted' }, 'Nichts gefunden.')]));
    };
    search.addEventListener('input', draw);
    draw();
    view.replaceChildren(search, list);
  }

  // --- Router ---------------------------------------------------------------

  function render() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    view.scrollTop = 0;
    window.scrollTo(0, 0);
    if (parts[0] === 'kapitel') {
      const ch = CHAPTERS.find((c) => c.id === parts[1]);
      if (ch) return renderChapter(ch);
    } else if (parts[0] === 'uebung') {
      const ch = CHAPTERS.find((c) => c.id === parts[1]);
      const ex = ch && ch.exercises.find((e) => e.id === parts[2]);
      if (ex) return renderExercise(ch, ex);
    } else if (parts[0] === 'terminal') {
      return renderSandbox();
    } else if (parts[0] === 'spickzettel') {
      return renderReference();
    }
    renderHome();
  }

  tabbar.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    navigate({ learn: '#/', sandbox: '#/terminal', reference: '#/spickzettel' }[b.dataset.tab]);
  });
  window.addEventListener('hashchange', render);
  render();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
