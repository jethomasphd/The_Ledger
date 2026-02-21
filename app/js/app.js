/**
 * App — The Ledger
 *
 * Cinematic intro -> Ask question -> AI searches Congress.gov -> AI translates bills ->
 * User curates -> Claude synthesizes -> Beautiful brief with exports.
 *
 * Adapted from Tables Turned for federal legislative data.
 */

const App = (() => {
  // ── State ──
  const state = {
    question: '',
    context: '',
    searchQueries: [],
    allFoundBills: [],
    plainSummaries: [],
    selectedTokens: new Set(),
    bills: [],
    actions: [],
    briefMarkdown: null,
    synthUserMessage: '',
    provenance: []
  };

  const KEY_STORE = 'ledger_anthropic_key';
  const GOV_KEY_STORE = 'ledger_gov_key';

  function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }
  function $(id) { return document.getElementById(id); }
  function show(el) { if (el) el.classList.remove('hidden'); }
  function hide(el) { if (el) el.classList.add('hidden'); }

  function logProv(action, detail) {
    state.provenance.push({ timestamp: new Date().toISOString(), action: action, detail: detail || null });
  }

  function getKey() { return ($('key') ? $('key').value : '') || localStorage.getItem(KEY_STORE) || ''; }
  function getGovKey() { return ($('gov-key') ? $('gov-key').value : '') || localStorage.getItem(GOV_KEY_STORE) || ''; }

  function setPhase(n) {
    for (var i = 1; i <= 4; i++) {
      var el = $('prog-phase-' + i);
      if (!el) continue;
      el.classList.remove('active', 'done');
      if (i < n) el.classList.add('done');
      else if (i === n) el.classList.add('active');
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  CINEMATIC INTRO
  // ═══════════════════════════════════════════════════════════

  const INTRO_LINES = [
    { id: 'ln1', text: 'The public record of every law.' },
    { pause: 600 },
    { id: 'ln2', text: 'Your representatives voted on them\u2026' },
    { pause: 900 },
    { id: 'ln3', text: 'But the system buries them in procedure.' },
    { pause: 1000 },
    { id: 'ln4', text: 'When you have a question about what Congress did\u2026' },
    { pause: 1200 },
    { id: 'ln5', text: 'The record is set against you.' }
  ];

  var introSkipped = false;

  async function typeText(el, text) {
    el.classList.add('typing');
    for (var i = 0; i < text.length; i++) {
      if (introSkipped) { el.textContent = text; el.classList.remove('typing'); return; }
      el.textContent += text[i];
      await sleep(25 + Math.random() * 20);
    }
    el.classList.remove('typing');
  }

  async function playIntro() {
    await sleep(800);
    for (var j = 0; j < INTRO_LINES.length; j++) {
      var line = INTRO_LINES[j];
      if (introSkipped) {
        for (var k = 0; k < INTRO_LINES.length; k++) {
          if (INTRO_LINES[k].id) $(INTRO_LINES[k].id).textContent = INTRO_LINES[k].text;
        }
        return;
      }
      if (line.pause) { await sleep(line.pause); continue; }
      await typeText($(line.id), line.text);
      await sleep(400);
    }
    if (!introSkipped) {
      await sleep(1000);
      show($('flip-btn'));
    }
  }

  function doFlip() {
    $('intro-card').classList.add('flipped');
    setTimeout(function() {
      var intro = $('intro');
      intro.style.opacity = '0';
      intro.style.transition = 'opacity 0.8s ease';
      setTimeout(function() {
        intro.style.display = 'none';
        show($('app'));
        initApp();
      }, 800);
    }, 1800);
  }

  function enterApp() {
    introSkipped = true;
    var intro = $('intro');
    intro.style.opacity = '0';
    intro.style.transition = 'opacity 0.6s ease';
    setTimeout(function() { intro.style.display = 'none'; show($('app')); initApp(); }, 600);
  }

  function initIntro() {
    $('skip-intro').addEventListener('click', enterApp);
    $('flip-btn').addEventListener('click', function(e) { e.stopPropagation(); doFlip(); });

    document.addEventListener('keydown', function(e) {
      if ($('intro').style.display === 'none') return;
      if (e.key === 'Escape') { enterApp(); return; }
      if ((e.key === ' ' || e.key === 'Enter') && !$('flip-btn').classList.contains('hidden')) {
        e.preventDefault();
        doFlip();
      }
    });

    playIntro();
  }

  // ═══════════════════════════════════════════════════════════
  //  INIT APP
  // ═══════════════════════════════════════════════════════════

  function initApp() {
    // Restore saved keys
    var savedKey = localStorage.getItem(KEY_STORE) || '';
    var savedGovKey = localStorage.getItem(GOV_KEY_STORE) || '';
    if (savedKey) {
      if ($('key')) $('key').value = savedKey;
      if ($('s-key')) $('s-key').value = savedKey;
    }
    if (savedGovKey) {
      if ($('gov-key')) $('gov-key').value = savedGovKey;
      if ($('s-gov-key')) $('s-gov-key').value = savedGovKey;
    }

    // Settings sync
    if ($('s-key')) $('s-key').addEventListener('change', function(e) { localStorage.setItem(KEY_STORE, e.target.value); if ($('key')) $('key').value = e.target.value; });
    if ($('key')) $('key').addEventListener('change', function(e) { localStorage.setItem(KEY_STORE, e.target.value); if ($('s-key')) $('s-key').value = e.target.value; });
    if ($('s-gov-key')) $('s-gov-key').addEventListener('change', function(e) { localStorage.setItem(GOV_KEY_STORE, e.target.value); if ($('gov-key')) $('gov-key').value = e.target.value; });
    if ($('gov-key')) $('gov-key').addEventListener('change', function(e) { localStorage.setItem(GOV_KEY_STORE, e.target.value); if ($('s-gov-key')) $('s-gov-key').value = e.target.value; });

    // Scroll reveal
    var revealObserver = new IntersectionObserver(function(entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) {
          entries[i].target.classList.add('visible');
          revealObserver.unobserve(entries[i].target);
        }
      }
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(function(el) { revealObserver.observe(el); });

    // About toggle
    $('about-toggle').addEventListener('click', function() {
      $('about-section').classList.toggle('open');
      var body = $('about-body');
      if ($('about-section').classList.contains('open')) {
        show(body);
        populatePromptDocs();
        body.querySelectorAll('.reveal:not(.visible)').forEach(function(el) { revealObserver.observe(el); });
      } else {
        hide(body);
      }
    });

    // Learn more link
    if ($('learn-more-link')) {
      $('learn-more-link').addEventListener('click', function(e) {
        e.preventDefault();
        $('about-section').classList.add('open');
        show($('about-body'));
        populatePromptDocs();
        $('about-section').scrollIntoView({ behavior: 'smooth' });
      });
    }

    // Search button
    $('search-btn').addEventListener('click', handleSearch);

    // Manual entry
    $('manual-btn').addEventListener('click', handleManualEntry);

    // Curate actions
    $('select-all-btn').addEventListener('click', function() { state.allFoundBills.forEach(function(b) { state.selectedTokens.add(b.receiptToken); }); renderCurateList(); });
    $('select-none-btn').addEventListener('click', function() { state.selectedTokens.clear(); renderCurateList(); });
    $('synthesize-btn').addEventListener('click', handleSynthesize);
    $('back-to-search').addEventListener('click', function() { hide($('curate-view')); show($('landing-wrap')); });

    // Export
    $('dl-docx').addEventListener('click', function() { if (state.briefMarkdown) downloadDocx(state.briefMarkdown); });
    $('dl-brief').addEventListener('click', function() { if (state.briefMarkdown) downloadMd(state.briefMarkdown); });
    $('dl-tablet').addEventListener('click', exportTablet);

    // New question
    $('again-btn').addEventListener('click', resetToStart);
  }

  function populatePromptDocs() {
    var se = $('doc-prompt-search');
    var su = $('doc-prompt-summary');
    var sy = $('doc-prompt-synth');
    if (se && !se.textContent) se.textContent = Synthesis.SEARCH_SYSTEM;
    if (su && !su.textContent) su.textContent = Synthesis.SUMMARY_SYSTEM;
    if (sy && !sy.textContent) sy.textContent = Synthesis.SYNTH_SYSTEM;
  }

  // ═══════════════════════════════════════════════════════════
  //  STEP 1: AI-POWERED CONGRESS.GOV SEARCH
  // ═══════════════════════════════════════════════════════════

  async function handleSearch() {
    var question = ($('q').value || '').trim();
    var context = ($('ctx').value || '').trim();
    var apiKey = getKey();
    var govKey = getGovKey();
    var statusEl = $('search-status');
    var depth = parseInt(($('s-depth') ? $('s-depth').value : '10'), 10);
    var congress = parseInt(($('s-congress') ? $('s-congress').value : '118'), 10);

    if (!question) { statusEl.textContent = 'Ask a question first.'; statusEl.className = 'error'; return; }
    if (!apiKey) { statusEl.textContent = 'Enter your Anthropic API key.'; statusEl.className = 'error'; return; }
    if (!govKey) { statusEl.textContent = 'Enter your api.data.gov key.'; statusEl.className = 'error'; return; }

    localStorage.setItem(KEY_STORE, apiKey);
    localStorage.setItem(GOV_KEY_STORE, govKey);

    state.question = question;
    state.context = context;

    $('search-btn').disabled = true;
    statusEl.textContent = '';
    statusEl.className = '';

    var progEl = $('search-progress');
    show(progEl);
    setPhase(1);

    logProv('search_started', question);

    try {
      // Phase 1: Translate question into search queries
      var queries = await Synthesis.generateSearchQueries({ apiKey: apiKey, question: question, context: context });
      state.searchQueries = queries;
      logProv('search_queries_generated', queries.map(function(q) { return q.query; }).join(' | '));

      setPhase(2);
      $('prog-phase-2').querySelector('.progress-detail').textContent =
        queries.length + ' strategies against Congress.gov';

      // Phase 2: Execute each query
      var allBills = [];
      var seenTokens = new Set();
      var RATE_MS = 350;

      for (var i = 0; i < queries.length; i++) {
        $('prog-phase-2').querySelector('.progress-detail').textContent =
          'Strategy ' + (i + 1) + ' of ' + queries.length + ': ' + queries[i].strategy;
        try {
          var result = await Shoreline.searchBills(queries[i].query, govKey, { limit: depth, congress: congress });
          logProv('congress_searched', '"' + queries[i].query + '" -> ' + result.total + ' total, fetched ' + result.bills.length);

          for (var j = 0; j < result.bills.length; j++) {
            if (!seenTokens.has(result.bills[j].receiptToken)) {
              seenTokens.add(result.bills[j].receiptToken);
              allBills.push(result.bills[j]);
            }
          }

          setPhase(3);
          $('prog-phase-3').querySelector('.progress-detail').textContent =
            allBills.length + ' bills so far';

          if (i < queries.length - 1) setPhase(2);
          await sleep(RATE_MS);
        } catch (e) {
          console.error('Search query failed:', e);
          logProv('search_query_failed', queries[i].query + ': ' + e.message);
        }
      }

      if (allBills.length === 0) {
        hide(progEl);
        statusEl.textContent = 'No bills found. Try rephrasing your question.';
        statusEl.className = 'error';
        $('search-btn').disabled = false;
        return;
      }

      var cappedBills = allBills.slice(0, 12);
      logProv('bills_found', allBills.length + ' unique bills from ' + queries.length + ' queries, showing top ' + cappedBills.length);

      // Phase 4: Generate plain-language summaries
      setPhase(4);
      $('prog-phase-4').querySelector('.progress-detail').textContent =
        'Translating ' + cappedBills.length + ' bills';

      var summaries = [];
      try {
        summaries = await Synthesis.generatePlainSummaries({ apiKey: apiKey, bills: cappedBills, question: question });
        logProv('plain_summaries_generated', summaries.length + ' bills translated');
      } catch (e) {
        logProv('plain_summaries_failed', e.message);
        summaries = cappedBills.map(function() { return { plain_title: '', plain_summary: '' }; });
      }

      hide(progEl);

      state.allFoundBills = cappedBills;
      state.plainSummaries = summaries;
      state.selectedTokens = new Set(cappedBills.map(function(b) { return b.receiptToken; }));

      // Populate search prompt display
      var searchPromptEl = $('search-prompt-display');
      if (searchPromptEl) {
        searchPromptEl.textContent = Synthesis.SEARCH_SYSTEM + '\n\n---\n\nUser message:\nQuestion: ' + question + (context ? '\nDecision context: ' + context : '') + '\n\nGenerate Congress.gov search queries.';
      }

      var evoQ = $('evolution-question');
      if (evoQ) evoQ.textContent = '\u201C' + question + '\u201D' + (context ? ' \u2014 ' + context : '');
      displaySearchTerms(queries);
      $('search-stats').textContent = 'Congress.gov returned ' + allBills.length + ' bills. Showing the top ' + cappedBills.length + '.';
      renderCurateList();

      hide($('landing-wrap'));
      show($('curate-view'));
      window.scrollTo(0, 0);

    } catch (err) {
      hide(progEl);
      statusEl.textContent = err.message;
      statusEl.className = 'error';
    } finally {
      $('search-btn').disabled = false;
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  MANUAL ENTRY
  // ═══════════════════════════════════════════════════════════

  async function handleManualEntry() {
    var linksText = ($('links').value || '').trim();
    var question = ($('q').value || '').trim();
    var context = ($('ctx').value || '').trim();
    var apiKey = getKey();
    var govKey = getGovKey();
    var statusEl = $('search-status');

    if (!question) { statusEl.textContent = 'Ask a question first.'; statusEl.className = 'error'; return; }
    if (!linksText) { statusEl.textContent = 'Enter at least one bill number.'; statusEl.className = 'error'; return; }
    if (!apiKey) { statusEl.textContent = 'Enter your Anthropic API key.'; statusEl.className = 'error'; return; }
    if (!govKey) { statusEl.textContent = 'Enter your api.data.gov key.'; statusEl.className = 'error'; return; }

    localStorage.setItem(KEY_STORE, apiKey);
    localStorage.setItem(GOV_KEY_STORE, govKey);
    state.question = question;
    state.context = context;

    $('manual-btn').disabled = true;
    statusEl.textContent = 'Fetching bills...';
    logProv('manual_entry', 'User provided bill numbers directly');

    var congress = parseInt(($('s-congress') ? $('s-congress').value : '118'), 10);

    try {
      var result = await Shoreline.ingest(linksText, govKey, congress, function(msg) { statusEl.textContent = msg; });

      if (result.bills.length === 0) {
        statusEl.textContent = 'No bills found. Check your bill numbers.';
        statusEl.className = 'error';
        $('manual-btn').disabled = false;
        return;
      }

      logProv('bills_ingested', result.bills.length + ' bills');

      statusEl.textContent = 'Translating ' + result.bills.length + ' bills into plain language...';
      var summaries = [];
      try {
        summaries = await Synthesis.generatePlainSummaries({ apiKey: apiKey, bills: result.bills, question: question });
      } catch (e) {
        summaries = result.bills.map(function() { return { plain_title: '', plain_summary: '' }; });
      }

      state.allFoundBills = result.bills;
      state.plainSummaries = summaries;
      state.selectedTokens = new Set(result.bills.map(function(b) { return b.receiptToken; }));
      state.searchQueries = [{ query: '(user-provided bill numbers)', strategy: 'Direct entry' }];

      var evoQ = $('evolution-question');
      if (evoQ) evoQ.textContent = '\u201C' + question + '\u201D' + (context ? ' \u2014 ' + context : '');
      displaySearchTerms(state.searchQueries);
      $('search-stats').textContent = result.bills.length + ' bills from direct entry.';
      renderCurateList();

      hide($('landing-wrap'));
      show($('curate-view'));
      window.scrollTo(0, 0);

    } catch (err) {
      statusEl.textContent = err.message;
      statusEl.className = 'error';
    } finally {
      $('manual-btn').disabled = false;
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  STEP 2: CURATE
  // ═══════════════════════════════════════════════════════════

  function displaySearchTerms(queries) {
    var el = $('search-terms-display');
    var html = '<div class="search-term-label">Search strategies used</div>';
    for (var i = 0; i < queries.length; i++) {
      html += '<div style="margin-bottom:0.4rem;"><span style="color:var(--text)">' + escapeHtml(queries[i].query) + '</span><br><span style="font-family:var(--sans);font-size:0.72rem;color:var(--text-muted)">' + escapeHtml(queries[i].strategy) + '</span></div>';
    }
    el.innerHTML = html;
  }

  function renderCurateList() {
    var list = $('curate-list');
    list.innerHTML = '';

    for (var i = 0; i < state.allFoundBills.length; i++) {
      var b = state.allFoundBills[i];
      var summary = state.plainSummaries[i] || {};
      var selected = state.selectedTokens.has(b.receiptToken);
      var card = document.createElement('div');
      card.className = 'curate-card' + (selected ? ' selected' : '');
      card.dataset.token = b.receiptToken;

      var meta = [b.policyArea, b.sponsor, b.latestActionDate].filter(Boolean).join(' \u00B7 ');
      var plainTitle = summary.plain_title || '';
      var plainSummary = summary.plain_summary || '';
      var displayTitle = plainTitle || b.title;

      var topHtml = '<div class="curate-card-top" data-action="toggle">' +
        '<div class="curate-check">' + (selected ? '\u2713' : '') + '</div>' +
        '<div class="curate-info">' +
          '<div class="curate-plain-title">' + escapeHtml(displayTitle) + '</div>' +
          (plainSummary ? '<div class="curate-plain-summary">' + escapeHtml(plainSummary) + '</div>' : '') +
          (plainTitle ? '<div class="curate-technical-title">' + escapeHtml(b.title) + '</div>' : '') +
          '<div class="curate-meta">' + escapeHtml(meta) + '</div>' +
          '<div class="curate-bill-id">' + b.receiptToken + ' &middot; <a href="' + b.congressGovUrl + '" target="_blank" rel="noopener">Congress.gov \u2192</a></div>' +
        '</div>' +
      '</div>';

      var expandBtn = '<button class="curate-expand-btn" data-action="expand">Show details \u25BE</button>';

      var detailHtml = '<div class="curate-expand">' +
        '<div class="curate-detail">' +
          (b.latestActionText ? '<p><strong>Latest action:</strong> ' + escapeHtml(b.latestActionText) + ' (' + (b.latestActionDate || '') + ')</p>' : '') +
          (b.policyArea ? '<p><strong>Policy area:</strong> ' + escapeHtml(b.policyArea) + '</p>' : '') +
          '<p><a href="' + b.congressGovUrl + '" target="_blank" rel="noopener">View full bill on Congress.gov \u2192</a></p>' +
        '</div>' +
      '</div>';

      card.innerHTML = topHtml + expandBtn + detailHtml;

      (function(bill) {
        card.querySelector('[data-action="toggle"]').addEventListener('click', function() {
          if (state.selectedTokens.has(bill.receiptToken)) state.selectedTokens.delete(bill.receiptToken);
          else state.selectedTokens.add(bill.receiptToken);
          renderCurateList();
        });
      })(b);

      card.querySelector('[data-action="expand"]').addEventListener('click', function(e) {
        e.stopPropagation();
        var c = e.target.closest('.curate-card');
        c.classList.toggle('expanded');
        e.target.textContent = c.classList.contains('expanded') ? 'Hide details \u25B4' : 'Show details \u25BE';
      });

      list.appendChild(card);
    }

    $('curate-count').textContent = state.selectedTokens.size + ' of ' + state.allFoundBills.length + ' selected';
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ═══════════════════════════════════════════════════════════
  //  STEP 3: SYNTHESIZE
  // ═══════════════════════════════════════════════════════════

  async function handleSynthesize() {
    var selected = state.allFoundBills.filter(function(b) { return state.selectedTokens.has(b.receiptToken); });
    if (selected.length === 0) { alert('Select at least one bill.'); return; }

    state.bills = selected;
    logProv('bills_selected_for_synthesis', selected.length + ' bills');

    hide($('curate-view'));
    show($('processing-view'));
    window.scrollTo(0, 0);

    var procStatus = $('proc-status');
    var procBills = $('proc-bills');
    var streamOut = $('stream-out');

    procBills.innerHTML = '';
    streamOut.textContent = '';
    streamOut.classList.remove('visible');

    // Show bills being read
    for (var i = 0; i < selected.length; i++) {
      var div = document.createElement('div');
      div.className = 'paper-found';
      var shortTitle = selected[i].title.length > 70 ? selected[i].title.substring(0, 70) + '...' : selected[i].title;
      div.textContent = selected[i].chamber + ' ' + selected[i].number + ': ' + shortTitle;
      procBills.appendChild(div);
    }

    // Fetch actions for selected bills
    var govKey = getGovKey();
    var allActions = [];
    procStatus.textContent = 'Fetching bill actions...';

    for (var j = 0; j < selected.length; j++) {
      try {
        // Also fetch detail for summary
        var detail = await Shoreline.getBillDetail(selected[j].congress, selected[j].chamber.toLowerCase(), selected[j].number, govKey);
        if (detail) {
          selected[j].sponsor = detail.sponsor || selected[j].sponsor;
          selected[j].introducedDate = detail.introducedDate || selected[j].introducedDate;
          selected[j].summaryText = detail.summaryText || selected[j].summaryText;
        }

        var acts = await Shoreline.getBillActions(selected[j].congress, selected[j].chamber.toLowerCase(), selected[j].number, govKey);
        allActions = allActions.concat(acts);
        logProv('actions_fetched', selected[j].receiptToken + ': ' + acts.length + ' actions');
        await sleep(Shoreline.RATE_LIMIT_MS);
      } catch (e) {
        logProv('actions_fetch_failed', selected[j].receiptToken + ': ' + e.message);
      }
    }
    state.actions = allActions;

    // Build user message and populate prompt display
    var userMsg = Synthesis.buildUserMessage(state.question, state.context, selected, allActions);
    state.synthUserMessage = userMsg;
    var synthPromptEl = $('synth-prompt-display');
    if (synthPromptEl) {
      synthPromptEl.textContent = 'SYSTEM PROMPT:\n' + Synthesis.SYNTH_SYSTEM + '\n\n---\n\nUSER MESSAGE:\n' + userMsg.substring(0, 3000) + (userMsg.length > 3000 ? '\n...(truncated for display)' : '');
    }
    var resultPromptEl = $('result-prompt-display');
    if (resultPromptEl) resultPromptEl.textContent = synthPromptEl.textContent;

    procStatus.textContent = selected.length + ' bills selected. ' + allActions.length + ' actions loaded. Generating brief...';
    await sleep(600);

    streamOut.classList.add('visible');
    procStatus.textContent = 'Generating your legislative brief with Claude...';

    var apiKey = getKey();

    try {
      await Synthesis.generate({
        apiKey: apiKey,
        question: state.question,
        context: state.context,
        bills: selected,
        actions: allActions,
        onChunk: function(chunk, full) {
          streamOut.textContent = full;
          streamOut.scrollTop = streamOut.scrollHeight;
        },
        onDone: function(fullText) {
          state.briefMarkdown = fullText;
          logProv('synthesis_generated', fullText.length + ' chars, ' + selected.length + ' bills');

          setTimeout(function() {
            hide($('processing-view'));
            show($('results-view'));
            renderBrief(fullText);
            renderProvenance();
            window.scrollTo(0, 0);
          }, 500);
        },
        onError: function(err) {
          procStatus.textContent = 'Synthesis failed: ' + err.message;
          streamOut.classList.remove('visible');
          logProv('synthesis_failed', err.message);
          setTimeout(function() {
            hide($('processing-view'));
            show($('curate-view'));
          }, 3000);
        }
      });
    } catch (err) { /* handled in onError */ }
  }

  // ═══════════════════════════════════════════════════════════
  //  BRIEF RENDERER
  // ═══════════════════════════════════════════════════════════

  function renderBrief(markdown) {
    var container = $('brief-out');
    var lines = markdown.split('\n');
    var html = [];
    var inUl = false;
    var inOl = false;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (line.startsWith('### ')) { closeList(); html.push('<h3>' + inline(line.slice(4)) + '</h3>'); }
      else if (line.startsWith('## ')) { closeList(); html.push('<h2>' + inline(line.slice(3)) + '</h2>'); }
      else if (line.startsWith('# ')) { closeList(); html.push('<h1>' + inline(line.slice(2)) + '</h1>'); }
      else if (/^---+\s*$/.test(line)) { closeList(); html.push('<hr>'); }
      else if (/^[-*]\s+/.test(line)) {
        if (inOl) { html.push('</ol>'); inOl = false; }
        if (!inUl) { html.push('<ul>'); inUl = true; }
        html.push('<li>' + inline(line.replace(/^[-*]\s+/, '')) + '</li>');
      }
      else if (/^\d+\.\s+/.test(line)) {
        if (inUl) { html.push('</ul>'); inUl = false; }
        if (!inOl) { html.push('<ol>'); inOl = true; }
        html.push('<li>' + inline(line.replace(/^\d+\.\s+/, '')) + '</li>');
      }
      else if (line.trim() === '') { closeList(); }
      else { closeList(); html.push('<p>' + inline(line) + '</p>'); }
    }
    closeList();

    function closeList() {
      if (inUl) { html.push('</ul>'); inUl = false; }
      if (inOl) { html.push('</ol>'); inOl = false; }
    }

    function inline(text) {
      return text
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/\[(BILL:\d+-[A-Z]+\d+)\]/g, '<span class="receipt">[$1]</span>')
        .replace(/\[(ACTION:\d+-[A-Z]+\d+-\S+?)\]/g, '<span class="receipt">[$1]</span>')
        .replace(/\[(VOTE:(?:HOUSE|SENATE):\d+-\d+)\]/g, '<span class="receipt">[$1]</span>')
        .replace(/\[UNWITNESSED\]/g, '<span class="tag-unwitnessed">[UNWITNESSED]</span>')
        .replace(/\[CONTESTED\]/g, '<span class="tag-contested">[CONTESTED]</span>')
        .replace(/`(.+?)`/g, '<code>$1</code>');
    }

    container.innerHTML = html.join('\n');
  }

  // ═══════════════════════════════════════════════════════════
  //  PROVENANCE
  // ═══════════════════════════════════════════════════════════

  function renderProvenance() {
    var log = $('provenance-log');
    if (!log) return;
    var html = '';
    for (var i = 0; i < state.provenance.length; i++) {
      var entry = state.provenance[i];
      var time = new Date(entry.timestamp).toLocaleTimeString();
      html += '<div class="prov-entry"><span class="prov-time">' + time + '</span> <span class="prov-action">' + escapeHtml(entry.action) + '</span>' + (entry.detail ? ': ' + escapeHtml(entry.detail).substring(0, 140) : '') + '</div>';
    }
    log.innerHTML = html;
  }

  // ═══════════════════════════════════════════════════════════
  //  EXPORTS
  // ═══════════════════════════════════════════════════════════

  function downloadMd(markdown) {
    var blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'The_Ledger_Brief.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    logProv('brief_downloaded', 'Markdown format');
  }

  function downloadDocx(markdown) {
    var htmlContent = markdownToDocxHtml(markdown);
    var docContent = '<!DOCTYPE html>\n<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">\n<head>\n<meta charset="utf-8">\n<title>The Ledger Brief</title>\n<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->\n<style>\n@page { margin: 1in; }\nbody { font-family: \'Crimson Pro\', Georgia, serif; font-size: 11pt; line-height: 1.7; color: #1a1a1a; }\nh1 { font-family: \'Cormorant Garamond\', Georgia, serif; font-size: 18pt; color: #8B6914; font-weight: normal; margin-bottom: 12pt; border-bottom: 1px solid #d4c5a9; padding-bottom: 6pt; }\nh2 { font-family: \'Cormorant Garamond\', Georgia, serif; font-size: 14pt; color: #1a1a1a; font-weight: 600; margin-top: 18pt; margin-bottom: 8pt; }\nh3 { font-size: 12pt; color: #666; font-weight: normal; margin-top: 14pt; }\np { margin-bottom: 8pt; }\nhr { border: none; border-top: 1px solid #d4c5a9; margin: 16pt 0; }\nul, ol { margin-bottom: 8pt; margin-left: 20pt; }\nli { margin-bottom: 4pt; }\n.receipt { font-family: \'IBM Plex Mono\', monospace; font-size: 9pt; color: #8B6914; background: #FFF8E7; padding: 1px 3px; }\n.unwitnessed { font-family: Arial, sans-serif; font-size: 8pt; color: #8B0000; background: #FFF0F0; padding: 1px 4px; }\n.footer { font-size: 9pt; color: #999; font-style: italic; margin-top: 24pt; padding-top: 8pt; border-top: 1px solid #e0d8c8; }\n</style>\n</head>\n<body>\n' + htmlContent + '\n<div class="footer">Generated by The Ledger \u00B7 ' + new Date().toLocaleDateString() + ' \u00B7 Receipts only. \u00B7 The Word Against The Flood</div>\n</body>\n</html>';

    var blob = new Blob([docContent], { type: 'application/msword' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'The_Ledger_Brief.doc';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    logProv('brief_downloaded', 'DOCX format');
  }

  function markdownToDocxHtml(markdown) {
    var lines = markdown.split('\n');
    var html = [];
    var inUl = false, inOl = false;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (line.startsWith('### ')) { close(); html.push('<h3>' + di(line.slice(4)) + '</h3>'); }
      else if (line.startsWith('## ')) { close(); html.push('<h2>' + di(line.slice(3)) + '</h2>'); }
      else if (line.startsWith('# ')) { close(); html.push('<h1>' + di(line.slice(2)) + '</h1>'); }
      else if (/^---+\s*$/.test(line)) { close(); html.push('<hr>'); }
      else if (/^[-*]\s+/.test(line)) {
        if (inOl) { html.push('</ol>'); inOl = false; }
        if (!inUl) { html.push('<ul>'); inUl = true; }
        html.push('<li>' + di(line.replace(/^[-*]\s+/, '')) + '</li>');
      }
      else if (/^\d+\.\s+/.test(line)) {
        if (inUl) { html.push('</ul>'); inUl = false; }
        if (!inOl) { html.push('<ol>'); inOl = true; }
        html.push('<li>' + di(line.replace(/^\d+\.\s+/, '')) + '</li>');
      }
      else if (line.trim() === '') { close(); }
      else { close(); html.push('<p>' + di(line) + '</p>'); }
    }
    close();

    function close() {
      if (inUl) { html.push('</ul>'); inUl = false; }
      if (inOl) { html.push('</ol>'); inOl = false; }
    }

    function di(text) {
      return text
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/\[(BILL:\d+-[A-Z]+\d+)\]/g, '<span class="receipt">[$1]</span>')
        .replace(/\[(ACTION:\d+-[A-Z]+\d+-\S+?)\]/g, '<span class="receipt">[$1]</span>')
        .replace(/\[(VOTE:(?:HOUSE|SENATE):\d+-\d+)\]/g, '<span class="receipt">[$1]</span>')
        .replace(/\[UNWITNESSED\]/g, '<span class="unwitnessed">[UNWITNESSED]</span>')
        .replace(/`(.+?)`/g, '<code>$1</code>');
    }

    return html.join('\n');
  }

  function exportTablet() {
    var tablet = {
      title: (state.question || '').substring(0, 100) || 'Untitled Ledger Session',
      sessionId: 'ledger-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 8),
      sessionCreated: new Date().toISOString(),
      intent: { question: state.question, decision_context: state.context },
      bills: state.bills,
      allFoundBills: state.allFoundBills,
      selectedTokens: Array.from(state.selectedTokens),
      searchQueries: state.searchQueries,
      plainSummaries: state.plainSummaries,
      actions: state.actions,
      provenance: state.provenance,
      briefMarkdown: state.briefMarkdown,
      status: 'sealed'
    };

    var json = JSON.stringify(tablet, null, 2);
    var blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'The_Ledger_Tablet.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    logProv('tablet_exported', 'JSON');
  }

  // ═══════════════════════════════════════════════════════════
  //  RESET
  // ═══════════════════════════════════════════════════════════

  function resetToStart() {
    hide($('results-view'));
    hide($('processing-view'));
    hide($('curate-view'));
    show($('landing-wrap'));
    state.bills = [];
    state.allFoundBills = [];
    state.plainSummaries = [];
    state.selectedTokens = new Set();
    state.actions = [];
    state.briefMarkdown = null;
    state.searchQueries = [];
    state.synthUserMessage = '';
    state.provenance = [];
    $('search-status').textContent = '';
    $('search-status').className = '';
    hide($('search-progress'));
    window.scrollTo(0, 0);
  }

  // ── Boot ──
  document.addEventListener('DOMContentLoaded', initIntro);

  return { state: state };
})();
