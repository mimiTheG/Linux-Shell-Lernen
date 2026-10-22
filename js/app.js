// App-Steuerung: Navigation, Fortschritt, Übungen, Training, Challenges, Vokabeln und Spickzettel.
(function () {
  'use strict';

  const { Shell, MANUAL } = window.LinuxShell;
  const { CHAPTERS } = window.Lessons;
  const { DRILLS, prepare, taskCount } = window.Drills;
  const Vocab = window.Vocab;

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
  const DRILL_KEY = 'shelltrainer.drills';
  const BEST_KEY = 'shelltrainer.challengeBest';
  const SANDBOX_KEY = 'shelltrainer.sandbox';
  const VOCAB_KEY = 'shelltrainer.vocab';
  let progress = store.get(PROGRESS_KEY, {});
  let drillProgress = store.get(DRILL_KEY, {});

  const exKey = (ch, ex) => ch.id + '/' + ex.id;
  const isDone = (ch, ex) => !!progress[exKey(ch, ex)];
  const markDone = (ch, ex) => {
    progress[exKey(ch, ex)] = true;
    store.set(PROGRESS_KEY, progress);
  };
  const chapterDone = (ch) => ch.exercises.filter((ex) => isDone(ch, ex)).length;
  const totalCount = CHAPTERS.reduce((n, ch) => n + ch.exercises.length, 0);
  const totalDone = () => CHAPTERS.reduce((n, ch) => n + chapterDone(ch), 0);

  const drillTaskDone = (drill, i) => !!(drillProgress[drill.id] && drillProgress[drill.id][i]);
  const drillDone = (drill) => drill.tasks.filter((_, i) => drillTaskDone(drill, i)).length;
  const markDrillTask = (drill, i) => {
    drillProgress[drill.id] = drillProgress[drill.id] || {};
    drillProgress[drill.id][i] = true;
    store.set(DRILL_KEY, drillProgress);
  };
  const drillTotalDone = () => DRILLS.reduce((n, d) => n + drillDone(d), 0);

  // --- Hilfen ---------------------------------------------------------------

  function h(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (v !== false && v !== null && v !== undefined) el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) el.append(c);
    return el;
  }

  function progressBar(done, total) {
    const pct = total ? Math.round((done / total) * 100) : 0;
    return h('div', { class: 'progress', role: 'progressbar', 'aria-valuenow': pct, 'aria-valuemin': 0, 'aria-valuemax': 100 }, h('span', { style: 'width:' + pct + '%' }));
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function setChrome({ title, back, tab, extra, focus }) {
    titleEl.textContent = title;
    document.title = title === 'Shell Trainer' ? title : title + ' · Shell Trainer';
    backBtn.hidden = !back;
    backBtn.onclick = back ? () => navigate(back) : null;
    extraEl.replaceChildren(...(extra ? [extra] : []));
    for (const b of tabbar.querySelectorAll('button')) b.classList.toggle('active', b.dataset.tab === tab);
    document.body.classList.toggle('in-exercise', !!focus);
  }

  function navigate(hash) {
    if (location.hash === hash) render();
    else location.hash = hash;
  }

  // Ersetzt den Inhalt der Hauptansicht; Arrays werden flach gemacht, leere Einträge ignoriert.
  const show = (...nodes) => view.replaceChildren(...nodes.flat(Infinity).filter((n) => n !== null && n !== undefined && n !== false));

  const isTouch = () => matchMedia('(pointer: coarse)').matches;

  // --- Aufgabenansicht (für Lektionen, Training und Challenges) ---------------
  //
  // o: { chrome, meta, heading, task, explain, explainOpen, hint, solution,
  //      setup(shell), check(ctx), onSolved(), onHelp(), next: { label, go },
  //      actions: [Element] }

  function renderTaskView(o) {
    setChrome({ ...o.chrome, focus: true });

    const shell = new Shell();
    o.setup(shell);

    const hintBox = h('div', { class: 'hint', hidden: true });
    let term;
    const showHint = (isSolution) => {
      if (o.onHelp) o.onHelp(isSolution);
      hintBox.hidden = false;
      hintBox.replaceChildren(
        h('span', {}, isSolution ? '👀 Lösung: ' : '💡 Tipp: '),
        isSolution ? h('code', {}, o.solution) : o.hint,
        isSolution
          ? h(
              'button',
              {
                class: 'link',
                onclick: () => {
                  term.input.value = o.solution;
                  term.focus();
                },
              },
              'einfügen'
            )
          : null
      );
    };

    const success = h(
      'div',
      { class: 'success', hidden: true, role: 'status' },
      h('span', { class: 'success-text' }, '✅ Geschafft!'),
      o.next ? h('button', { class: 'primary small', onclick: o.next.go }, o.next.label) : null
    );

    const card = h(
      'section',
      { class: 'task-card' },
      h('div', { class: 'task-meta' }, o.meta),
      o.heading ? h('h2', {}, o.heading) : null,
      h('p', { class: 'task', html: o.task }),
      o.explain ? h('details', { class: 'explain', open: o.explainOpen }, h('summary', {}, 'Erklärung'), h('p', { html: o.explain })) : null,
      h(
        'div',
        { class: 'task-actions' },
        h('button', { class: 'chip', onclick: () => showHint(false) }, '💡 Tipp'),
        h('button', { class: 'chip', onclick: () => showHint(true) }, '👀 Lösung'),
        o.actions || []
      ),
      hintBox,
      success
    );

    const termWrap = h('div', { class: 'term-wrap' });
    show(h('div', { class: 'exercise' }, card, termWrap));

    let solved = false;
    term = new window.Terminal(termWrap, shell, {
      onCommand(line, output) {
        if (solved) return;
        let ok = false;
        try {
          ok = o.check({ shell, line, output });
        } catch (e) {
          ok = false;
        }
        if (!ok) return;
        solved = true;
        o.onSolved();
        success.hidden = false;
        card.classList.add('solved');
        if (navigator.vibrate) navigator.vibrate(40);
        card.scrollTop = card.scrollHeight;
      },
    });
    if (!isTouch()) term.focus();
  }

  const restartButton = (fn) => h('button', { class: 'icon-btn', 'aria-label': 'Aufgabe neu starten', title: 'Neu starten', onclick: fn }, '↺');

  // --- Lernen ---------------------------------------------------------------

  function renderHome() {
    setChrome({ title: 'Shell Trainer', tab: 'learn' });
    const done = totalDone();
    const next = findNext();
    show(
      h(
        'section',
        { class: 'hero' },
        h('div', { class: 'hero-prompt', 'aria-hidden': 'true' }, 'lerner@linux:~$ ', h('span', { class: 'cursor' })),
        h('h2', {}, done ? 'Weiter geht’s!' : 'Lerne die Linux-Shell'),
        h('p', {}, done ? done + ' von ' + totalCount + ' Lektionen geschafft.' : 'Kleine Aufgaben, echtes Tippen, sofortiges Feedback. Alles läuft offline in einer sicheren Übungs-Shell.'),
        progressBar(done, totalCount),
        next
          ? h('button', { class: 'primary', onclick: () => navigate('#/uebung/' + next.ch.id + '/' + next.ex.id) }, done ? 'Weiter mit „' + next.ex.title + '“' : 'Erste Übung starten')
          : h('button', { class: 'primary', onclick: () => navigate('#/training') }, '🏆 Alles gelernt – ab ins Training!')
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
    const drills = DRILLS.filter((d) => d.chapter === ch.id);
    show(
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
      ),
      drills.length
        ? h(
            'section',
            {},
            h('h3', { class: 'section-title' }, 'Mehr üben zu diesem Kapitel'),
            h('div', { class: 'drill-grid' }, drills.map(drillCard))
          )
        : null
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
    const nextEx = ch.exercises[idx + 1] ? { ch, ex: ch.exercises[idx + 1] } : findNext(ch, ex);
    const chapterFinished = !ch.exercises[idx + 1];
    const drills = DRILLS.filter((d) => d.chapter === ch.id);
    renderTaskView({
      chrome: { title: ch.title, back: '#/kapitel/' + ch.id, extra: restartButton(() => renderExercise(ch, ex)) },
      meta: ch.icon + ' Übung ' + (idx + 1) + ' von ' + ch.exercises.length + (isDone(ch, ex) ? ' · ✓ erledigt' : ''),
      heading: ex.title,
      task: ex.task,
      explain: ex.explain,
      explainOpen: !isDone(ch, ex),
      hint: ex.hint,
      solution: ex.solution,
      setup: (shell) => ex.setup && ex.setup(shell),
      check: ex.check,
      onSolved: () => markDone(ch, ex),
      next:
        chapterFinished && drills.length
          ? { label: 'Kapitel üben →', go: () => navigate('#/kapitel/' + ch.id) }
          : nextEx
            ? { label: 'Weiter →', go: () => navigate('#/uebung/' + nextEx.ch.id + '/' + nextEx.ex.id) }
            : { label: 'Übersicht', go: () => navigate('#/') },
    });
  }

  // --- Training -------------------------------------------------------------

  // Themen, deren Kapitel schon begonnen wurde (oder die schon geübt wurden).
  function learnedDrills() {
    const started = new Set(CHAPTERS.filter((ch) => chapterDone(ch) > 0).map((ch) => ch.id));
    const pool = DRILLS.filter((d) => started.has(d.chapter) || drillDone(d) > 0);
    return pool.length ? pool : DRILLS.filter((d) => d.chapter === CHAPTERS[0].id);
  }

  function drillCard(drill) {
    const d = drillDone(drill);
    const n = drill.tasks.length;
    const firstOpen = drill.tasks.findIndex((_, i) => !drillTaskDone(drill, i));
    return h(
      'a',
      { class: 'card drill-card' + (d === n ? ' done' : ''), href: '#/drill/' + drill.id + '/' + (firstOpen < 0 ? 0 : firstOpen) },
      h('code', { class: 'drill-title' }, drill.title),
      h('span', { class: 'muted small' }, drill.subtitle),
      h('span', { class: 'drill-count' }, d + ' / ' + n + (d === n ? ' ✓' : '')),
      progressBar(d, n)
    );
  }

  function renderTraining() {
    setChrome({ title: 'Training', tab: 'training' });
    const best = store.get(BEST_KEY, null);
    const pool = learnedDrills();
    const learnedChapters = new Set(pool.map((d) => d.chapter));
    show(
      h(
        'section',
        { class: 'hero challenge-hero' },
        h('div', { class: 'hero-prompt', 'aria-hidden': 'true' }, '$ challenge --start'),
        h('h2', {}, '⚡ Challenge'),
        h(
          'p',
          {},
          CHALLENGE_LENGTH + ' zufällige Aufgaben aus ' + (learnedChapters.size === CHAPTERS.length ? 'allen Kapiteln' : 'den Kapiteln, die du schon begonnen hast') + '. Ohne Erklärung – zeig, was du kannst!'
        ),
        best ? h('p', { class: 'best' }, '🏅 Bestwert: ' + best.score + ' / ' + best.total + ' Punkte') : null,
        h('button', { class: 'primary', onclick: () => startChallenge() }, 'Challenge starten')
      ),
      h('div', { class: 'section-head' }, h('h3', { class: 'section-title' }, 'Gezielt üben'), h('span', { class: 'muted small' }, drillTotalDone() + ' / ' + taskCount)),
      CHAPTERS.map((ch) => {
        const drills = DRILLS.filter((d) => d.chapter === ch.id);
        if (!drills.length) return null;
        return h('section', { class: 'drill-group' }, h('h4', {}, ch.icon + ' ' + ch.title), h('div', { class: 'drill-grid' }, drills.map(drillCard)));
      }),
      h(
        'a',
        { class: 'card sandbox-link', href: '#/terminal' },
        h('span', { class: 'chapter-icon', 'aria-hidden': 'true' }, '⌨️'),
        h('span', {}, h('strong', {}, 'Freies Terminal'), h('span', { class: 'muted small' }, 'Ohne Aufgabe frei ausprobieren'))
      )
    );
  }

  function taskDots(drill, current) {
    return h(
      'span',
      { class: 'dots' },
      drill.tasks.map((_, i) =>
        h('a', {
          href: '#/drill/' + drill.id + '/' + i,
          class: 'dot' + (drillTaskDone(drill, i) ? ' done' : '') + (i === current ? ' current' : ''),
          'aria-label': 'Aufgabe ' + (i + 1) + (drillTaskDone(drill, i) ? ' (erledigt)' : ''),
        })
      )
    );
  }

  function renderDrill(drill, i) {
    const task = drill.tasks[i];
    const p = prepare(drill, task);
    const nextOpen = drill.tasks.findIndex((_, k) => k > i && !drillTaskDone(drill, k));
    const next =
      i + 1 < drill.tasks.length
        ? { label: 'Nächste →', go: () => navigate('#/drill/' + drill.id + '/' + (i + 1)) }
        : nextOpen >= 0
          ? { label: 'Weiter →', go: () => navigate('#/drill/' + drill.id + '/' + nextOpen) }
          : { label: 'Fertig ✓', go: () => navigate('#/training') };
    renderTaskView({
      chrome: { title: drill.title, back: '#/training', extra: restartButton(() => renderDrill(drill, i)) },
      meta: [h('span', {}, drill.subtitle + ' · ' + (i + 1) + ' / ' + drill.tasks.length), taskDots(drill, i)],
      task: task.task,
      hint: drill.hint,
      solution: task.solution,
      setup: p.setup,
      check: p.check,
      onSolved: () => markDrillTask(drill, i),
      next,
    });
  }

  // --- Challenge --------------------------------------------------------------

  const CHALLENGE_LENGTH = 10;
  let challenge = null;

  function startChallenge() {
    // Pro Thema eine Warteschlange, ungelöste Aufgaben zuerst; dann reihum
    // aus allen Themen ziehen, damit die Challenge möglichst gemischt ist.
    const queues = shuffle(learnedDrills()).map((drill) => {
      const idx = shuffle(drill.tasks.map((_, i) => i));
      return { drill, queue: [...idx.filter((i) => !drillTaskDone(drill, i)), ...idx.filter((i) => drillTaskDone(drill, i))] };
    });
    const items = [];
    while (items.length < CHALLENGE_LENGTH && queues.some((q) => q.queue.length)) {
      for (const q of queues) {
        if (items.length < CHALLENGE_LENGTH && q.queue.length) items.push({ drill: q.drill, index: q.queue.shift(), result: null, helped: false });
      }
    }
    challenge = { items: shuffle(items), pos: 0 };
    navigate('#/challenge');
  }

  const POINTS = { solved: 2, helped: 1, skipped: 0 };

  function renderChallenge() {
    if (!challenge) return startChallenge();
    if (challenge.pos >= challenge.items.length) return renderChallengeResult();
    const item = challenge.items[challenge.pos];
    const task = item.drill.tasks[item.index];
    const p = prepare(item.drill, task);
    const advance = () => {
      challenge.pos++;
      renderChallenge();
    };
    const skip = h(
      'button',
      {
        class: 'chip',
        onclick: () => {
          if (!item.result) item.result = 'skipped';
          advance();
        },
      },
      '⏭ Überspringen'
    );
    const score = challenge.items.reduce((n, x) => n + (x.result ? POINTS[x.result] : 0), 0);
    renderTaskView({
      chrome: {
        title: 'Challenge',
        back: '#/training',
        extra: h('span', { class: 'score-pill', 'aria-label': score + ' Punkte' }, score + ' P'),
      },
      meta: [h('span', {}, '⚡ Aufgabe ' + (challenge.pos + 1) + ' von ' + challenge.items.length), challengeDots()],
      task: task.task,
      hint: item.drill.hint,
      solution: task.solution,
      setup: p.setup,
      check: p.check,
      onHelp: () => {
        item.helped = true;
      },
      onSolved: () => {
        item.result = item.helped ? 'helped' : 'solved';
        markDrillTask(item.drill, item.index);
        skip.remove();
      },
      next: { label: challenge.pos + 1 < challenge.items.length ? 'Weiter →' : 'Ergebnis →', go: advance },
      actions: [skip],
    });
  }

  function challengeDots() {
    return h(
      'span',
      { class: 'dots' },
      challenge.items.map((x, i) => h('span', { class: 'dot' + (x.result ? ' ' + x.result : '') + (i === challenge.pos ? ' current' : '') }))
    );
  }

  function renderChallengeResult() {
    setChrome({ title: 'Ergebnis', back: '#/training', tab: 'training' });
    const items = challenge.items;
    const score = items.reduce((n, x) => n + POINTS[x.result || 'skipped'], 0);
    const total = items.length * POINTS.solved;
    const best = store.get(BEST_KEY, null);
    const isBest = !best || score > best.score;
    if (isBest) store.set(BEST_KEY, { score, total });
    const pct = score / total;
    const verdict = pct === 1 ? '🏆 Perfekt!' : pct >= 0.8 ? '🎉 Stark!' : pct >= 0.5 ? '👍 Gut gemacht!' : '💪 Dranbleiben!';
    const label = { solved: '✅ allein gelöst', helped: '💡 mit Hilfe', skipped: '⏭ übersprungen' };
    const weak = [...new Set(items.filter((x) => x.result !== 'solved').map((x) => x.drill))];

    show(
      h(
        'section',
        { class: 'hero result-hero' },
        h('h2', {}, verdict),
        h('p', { class: 'result-score' }, score + ' / ' + total + ' Punkte'),
        isBest && best ? h('p', { class: 'best' }, '🏅 Neuer Bestwert!') : null,
        h('button', { class: 'primary', onclick: () => startChallenge() }, 'Neue Challenge')
      ),
      h(
        'ol',
        { class: 'result-list' },
        items.map((x) =>
          h(
            'li',
            { class: 'card' },
            h('span', { class: 'result-badge ' + (x.result || 'skipped') }, label[x.result || 'skipped']),
            h('span', { class: 'small', html: x.drill.tasks[x.index].task }),
            h('code', { class: 'small' }, x.drill.tasks[x.index].solution)
          )
        )
      ),
      weak.length
        ? h('section', {}, h('h3', { class: 'section-title' }, 'Das solltest du nochmal üben'), h('div', { class: 'drill-grid' }, weak.map(drillCard)))
        : null
    );
  }

  // --- Vokabeln ----------------------------------------------------------------

  const vocabStore = store.get(VOCAB_KEY, null) || {};
  const vocab = { cards: vocabStore.cards || {}, modes: vocabStore.modes || Vocab.MODES.map((m) => m.id) };
  const saveVocab = () => store.set(VOCAB_KEY, vocab);
  let vocabRun = null;

  const BOX_LABELS = ['Neu', 'Fach 1', 'Fach 2', 'Fach 3', 'Fach 4', 'Fach 5'];

  function renderVocab() {
    setChrome({ title: 'Vokabeln', tab: 'vocab' });
    const st = Vocab.stats(vocab.cards, vocab.modes);
    const mastered = st.boxes.slice(4).reduce((a, b) => a + b, 0);
    const nothingDue = st.due === 0 && st.fresh === 0;

    const modeChips = Vocab.MODES.map((m) => {
      const on = vocab.modes.includes(m.id);
      return h(
        'button',
        {
          class: 'mode-chip' + (on ? ' on' : ''),
          'aria-pressed': on ? 'true' : 'false',
          onclick: () => {
            if (on && vocab.modes.length === 1) return; // mindestens eine Art bleibt aktiv
            vocab.modes = on ? vocab.modes.filter((x) => x !== m.id) : [...vocab.modes, m.id];
            saveVocab();
            renderVocab();
          },
        },
        h('strong', {}, (on ? '✓ ' : '') + m.label),
        h('span', { class: 'muted small' }, m.example)
      );
    });

    const maxBox = Math.max(1, ...st.boxes);
    show(
      h(
        'section',
        { class: 'hero vocab-hero' },
        h('div', { class: 'hero-prompt', 'aria-hidden': 'true' }, '$ man mkdir'),
        h('h2', {}, '🧠 Vokabeln'),
        h('p', {}, 'Befehle und Optionen wie Vokabeln lernen. Was du sicher kannst, kommt seltener dran – was du vergisst, sofort wieder.'),
        h(
          'div',
          { class: 'vocab-stats' },
          h('span', {}, h('b', {}, String(st.due)), ' fällig'),
          h('span', {}, h('b', {}, String(st.fresh)), ' neu'),
          h('span', {}, h('b', {}, String(mastered)), ' sitzen')
        ),
        h('button', { class: 'primary', onclick: () => startVocabRun(nothingDue) }, nothingDue ? 'Alles erledigt – trotzdem üben' : 'Runde starten')
      ),
      h('h3', { class: 'section-title' }, 'Abfragen'),
      h('div', { class: 'mode-list' }, modeChips),
      h('h3', { class: 'section-title' }, 'Karteikasten'),
      h(
        'div',
        { class: 'card boxes' },
        st.boxes.map((n, i) =>
          h(
            'div',
            { class: 'box-col' },
            h('span', { class: 'box-count' }, String(n)),
            h('span', { class: 'box-bar' }, h('span', { class: 'box-fill box-' + i, style: 'height:' + Math.round((n / maxBox) * 100) + '%' })),
            h('span', { class: 'box-label' }, BOX_LABELS[i])
          )
        )
      ),
      h('p', { class: 'muted small box-help' }, 'Richtig → ein Fach weiter (wieder fällig nach 1, 3, 7, 14, 30 Tagen). Falsch → zurück in Fach 1.'),
      h('h3', { class: 'section-title' }, 'Alle Vokabeln zum Nachschlagen'),
      vocabList()
    );
  }

  function vocabList() {
    return h(
      'div',
      { class: 'vocab-list' },
      Vocab.COMMANDS.map(([cmd, meaning, origin]) => {
        const opts = Vocab.OPTIONS.filter((o) => o[0] === cmd);
        return h(
          'details',
          { class: 'card vocab-entry' },
          h('summary', {}, h('code', { class: 'ref-cmd' }, cmd), h('span', {}, meaning)),
          h('p', { class: 'origin', html: '💡 ' + origin }),
          opts.length
            ? h(
                'table',
                { class: 'opt-table' },
                h('tbody', {}, opts.map(([, opt, long, m]) => h('tr', {}, h('td', {}, h('code', {}, opt)), h('td', {}, long ? h('code', {}, long) : h('span', { class: 'muted' }, '–')), h('td', {}, m))))
              )
            : null
        );
      })
    );
  }

  function startVocabRun(extra) {
    // „Trotzdem üben“: alle schon gelernten Karten gelten als fällig.
    let cards = Vocab.buildSession(vocab.cards, vocab.modes, extra ? { now: Infinity } : {});
    if (!cards.length) cards = Vocab.buildSession(vocab.cards, vocab.modes, { now: Infinity });
    vocabRun = { queue: cards, pos: 0, total: cards.length, firstTry: new Map(), answered: false };
    navigate('#/vokabeln/runde');
  }

  const PROMPT_LABEL = { befehl: 'Welcher Befehl?', lang: 'Wie heißt die lange Form?', option: 'Welche Option?' };

  function cardTitle(card) {
    if (card.mode === 'befehl') return h('code', {}, card.cmd);
    return h('code', {}, card.cmd + ' ' + card.opt + (card.long ? ', ' + card.long : ''));
  }

  function renderVocabCard() {
    if (!vocabRun) return startVocabRun(false);
    if (vocabRun.pos >= vocabRun.queue.length) return renderVocabResult();
    const card = vocabRun.queue[vocabRun.pos];
    const done = vocabRun.firstTry.size;
    setChrome({ title: 'Vokabeln', back: '#/vokabeln', focus: true });

    let prompt;
    if (card.mode === 'befehl') prompt = h('p', { class: 'vocab-prompt' }, card.meaning);
    else if (card.mode === 'lang') prompt = h('p', { class: 'vocab-prompt' }, h('code', {}, card.cmd + ' ' + card.opt));
    else prompt = h('p', { class: 'vocab-prompt' }, h('code', {}, card.cmd), ' ', card.meaning);

    const input = h('input', {
      class: 'vocab-input',
      type: 'text',
      autocapitalize: 'off',
      autocorrect: 'off',
      autocomplete: 'off',
      spellcheck: 'false',
      enterkeyhint: 'done',
      'aria-label': 'Deine Antwort',
      placeholder: card.mode === 'befehl' ? 'Befehl' : card.mode === 'lang' ? '--…' : '-…',
    });
    const feedback = h('div', { class: 'vocab-feedback', hidden: true, role: 'status' });
    const submitBtn = h('button', { class: 'primary', type: 'submit' }, 'Prüfen');
    const insert = (text) => {
      input.value += text;
      input.focus();
    };
    const helpers =
      card.mode === 'befehl'
        ? null
        : h(
            'div',
            { class: 'vocab-keys' },
            ['-', '--'].map((k) => h('button', { type: 'button', onpointerdown: (e) => e.preventDefault(), onclick: () => insert(k) }, k))
          );
    const dontKnow = h('button', { type: 'button', class: 'link', onclick: () => answer(null) }, 'Weiß ich nicht');

    const answer = (value) => {
      if (vocabRun.answered) return;
      vocabRun.answered = true;
      const correct = value !== null && Vocab.isCorrect(card, value);
      if (!vocabRun.firstTry.has(card.id)) {
        vocabRun.firstTry.set(card.id, correct);
        Vocab.review(vocab.cards, card, correct);
        saveVocab();
      }
      // Falsche Karten kommen in dieser Runde nochmal – drei Karten später.
      if (!correct) vocabRun.queue.splice(Math.min(vocabRun.pos + 4, vocabRun.queue.length), 0, card);
      input.disabled = true;
      dontKnow.remove();
      if (helpers) helpers.remove();
      feedback.hidden = false;
      feedback.className = 'vocab-feedback ' + (correct ? 'right' : 'wrong');
      feedback.replaceChildren(
        h('strong', {}, correct ? '✅ Richtig!' : value === null ? '📖 So geht’s:' : '❌ Nicht ganz.'),
        !correct && value !== null ? h('span', { class: 'small' }, 'Deine Antwort: ', h('code', {}, value || '–')) : null,
        h('div', { class: 'vocab-answer' }, cardTitle(card)),
        h('p', {}, card.meaning),
        card.origin ? h('p', { class: 'origin', html: '💡 ' + card.cmd + ': ' + card.origin }) : null
      );
      submitBtn.textContent = 'Weiter →';
      submitBtn.focus();
    };

    const form = h(
      'form',
      {
        class: 'vocab-form',
        autocomplete: 'off',
        onsubmit: (e) => {
          e.preventDefault();
          if (!vocabRun.answered) {
            if (!input.value.trim()) return input.focus();
            return answer(input.value);
          }
          vocabRun.pos++;
          vocabRun.answered = false;
          renderVocabCard();
        },
      },
      h('label', { class: 'vocab-label' }, PROMPT_LABEL[card.mode]),
      prompt,
      input,
      helpers,
      feedback,
      h('div', { class: 'vocab-actions' }, submitBtn, dontKnow)
    );

    show(
      h(
        'div',
        { class: 'vocab-run' },
        h('div', { class: 'vocab-progress' }, h('span', { class: 'muted small' }, 'Karte ' + Math.min(done + 1, vocabRun.total) + ' von ' + vocabRun.total), progressBar(done, vocabRun.total)),
        h('section', { class: 'card vocab-card' }, form)
      )
    );
    input.focus();
  }

  function renderVocabResult() {
    setChrome({ title: 'Vokabeln', back: '#/vokabeln', tab: 'vocab' });
    const results = [...vocabRun.firstTry.entries()];
    const right = results.filter(([, ok]) => ok).length;
    const wrongCards = results.filter(([, ok]) => !ok).map(([id]) => Vocab.CARDS.find((c) => c.id === id));
    show(
      h(
        'section',
        { class: 'hero result-hero' },
        h('h2', {}, right === results.length ? '🏆 Alles gewusst!' : right >= results.length * 0.7 ? '🎉 Gut gemacht!' : '💪 Weiter so!'),
        h('p', { class: 'result-score' }, right + ' / ' + results.length),
        h('p', {}, 'beim ersten Versuch richtig'),
        h('button', { class: 'primary', onclick: () => startVocabRun(false) }, 'Neue Runde')
      ),
      wrongCards.length
        ? [
            h('h3', { class: 'section-title' }, 'Diese Karten kommen bald wieder'),
            h(
              'div',
              { class: 'result-list' },
              wrongCards.map((c) => h('div', { class: 'card' }, h('div', {}, cardTitle(c)), h('span', { class: 'small' }, c.meaning)))
            ),
          ]
        : null
    );
  }

  // --- Freies Terminal --------------------------------------------------------

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
    setChrome({ title: 'Freies Terminal', back: '#/training', tab: 'training', extra: reset });
    if (!sandbox) sandbox = loadSandbox();
    const wrap = h('div', { class: 'term-wrap full' });
    show(wrap);
    const term = new window.Terminal(wrap, sandbox, {
      welcome: 'Willkommen im freien Terminal! Hier kannst du alles ausprobieren – nichts kann kaputtgehen.\nTippe \x1b[33mhelp\x1b[0m für alle Befehle oder \x1b[33mtree\x1b[0m für einen Überblick.\n',
      onCommand() {
        store.set(SANDBOX_KEY, { root: sandbox.root, cwd: sandbox.cwd, history: sandbox.history.slice(-100) });
      },
    });
    if (!isTouch()) term.focus();
  }

  // --- Spickzettel ------------------------------------------------------------

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
    show(search, list);
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
    } else if (parts[0] === 'training') {
      return renderTraining();
    } else if (parts[0] === 'drill') {
      const drill = DRILLS.find((d) => d.id === parts[1]);
      const i = parseInt(parts[2] || '0', 10);
      if (drill && drill.tasks[i]) return renderDrill(drill, i);
      if (drill) return renderDrill(drill, 0);
    } else if (parts[0] === 'challenge') {
      return renderChallenge();
    } else if (parts[0] === 'vokabeln') {
      return parts[1] === 'runde' ? renderVocabCard() : renderVocab();
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
    navigate({ learn: '#/', training: '#/training', vocab: '#/vokabeln', reference: '#/spickzettel' }[b.dataset.tab]);
  });
  window.addEventListener('hashchange', render);
  render();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
