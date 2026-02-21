/**
 * Synthesis — Anthropic API Integration for The Ledger
 *
 * Capabilities:
 * 1. generateSearchQueries: Turn plain-English into Congress.gov search terms
 * 2. generatePlainSummaries: Translate bill metadata into plain language
 * 3. generate: Synthesize bills into a receipted brief (streaming)
 */

const Synthesis = (() => {
  const API_URL = 'https://api.anthropic.com/v1/messages';
  const MODEL = 'claude-sonnet-4-20250514';

  // ── Shared API call (non-streaming) ──

  async function callAPI(apiKey, system, userContent, maxTokens) {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens || 1024,
        system: system,
        messages: [{ role: 'user', content: userContent }]
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      var msg = 'API error (' + response.status + ')';
      try {
        var errJson = JSON.parse(errBody);
        if (errJson.error && errJson.error.message) msg = errJson.error.message;
      } catch (e) { /* use default */ }
      throw new Error(msg);
    }

    const data = await response.json();
    return data.content && data.content[0] ? data.content[0].text : '';
  }

  // ═══════════════════════════════════════════════════════════
  //  SEARCH QUERY GENERATION
  // ═══════════════════════════════════════════════════════════

  const SEARCH_SYSTEM = 'You are a Congress.gov search expert. Your job is to turn a plain-English question about U.S. federal legislation into optimized Congress.gov API search queries.\n\n## Rules\n1. Generate 3-4 search queries, from broad to specific.\n2. Use keywords that match bill titles, policy areas, and actions.\n3. Include relevant synonyms and alternative phrasings.\n4. Consider both House and Senate bills.\n5. Keep queries concise but effective for the Congress.gov keyword search API.\n\n## Output Format\nReturn ONLY a JSON array of objects. No markdown, no explanation, no code fences.\nEach object has:\n- "query": the Congress.gov search string\n- "strategy": a brief plain-English description of what this query targets (1 sentence)\n\nExample output:\n[{"query":"data privacy consumer protection","strategy":"Broad search for data privacy and consumer protection bills"},{"query":"online privacy children COPPA","strategy":"Targeted search for children\'s online privacy legislation"}]';

  async function generateSearchQueries(opts) {
    var prompt = 'Question: ' + opts.question;
    if (opts.context) prompt += '\nDecision context: ' + opts.context;
    prompt += '\n\nGenerate Congress.gov search queries for this question about federal legislation.';

    var raw = await callAPI(opts.apiKey, SEARCH_SYSTEM, prompt);

    var cleaned = raw.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }

    try {
      return JSON.parse(cleaned);
    } catch (e) {
      var match = cleaned.match(/\[[\s\S]*\]/);
      if (match) return JSON.parse(match[0]);
      throw new Error('Failed to parse search queries from AI response');
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  PLAIN-LANGUAGE SUMMARIES
  // ═══════════════════════════════════════════════════════════

  const SUMMARY_SYSTEM = 'You translate U.S. federal legislation titles and metadata into plain language for regular citizens.\n\n## Rules\n1. Use no legislative jargon. If a procedural concept is essential, explain it in parentheses.\n2. Be specific about what the bill does when the title provides enough information.\n3. Each summary should help a non-expert decide if this bill is relevant to their question.\n\n## Output Format\nReturn ONLY a JSON array in the same order as the bills provided. No markdown, no explanation.\nEach object has:\n- "plain_title": A clear, jargon-free title (5-15 words)\n- "plain_summary": One or two sentences explaining what this bill does in everyday language';

  async function generatePlainSummaries(opts) {
    var prompt = 'The user\'s question: "' + opts.question + '"\n\nBills to translate:\n\n';
    for (var i = 0; i < opts.bills.length; i++) {
      var b = opts.bills[i];
      prompt += 'Bill ' + (i + 1) + ' (' + b.receiptToken + '):\n';
      prompt += 'Title: ' + b.title + '\n';
      if (b.policyArea) prompt += 'Policy Area: ' + b.policyArea + '\n';
      if (b.sponsor) prompt += 'Sponsor: ' + b.sponsor + '\n';
      if (b.latestActionText) prompt += 'Latest Action: ' + b.latestActionText + '\n';
      prompt += 'URL: ' + b.congressGovUrl + '\n\n';
    }
    prompt += 'Translate each bill into plain language.';

    var raw = await callAPI(opts.apiKey, SUMMARY_SYSTEM, prompt, 2048);

    var cleaned = raw.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }

    try {
      return JSON.parse(cleaned);
    } catch (e) {
      var match = cleaned.match(/\[[\s\S]*\]/);
      if (match) return JSON.parse(match[0]);
      return opts.bills.map(function() { return { plain_title: '', plain_summary: '' }; });
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  BRIEF SYNTHESIS (streaming)
  // ═══════════════════════════════════════════════════════════

  const SYNTH_SYSTEM = 'You are a legislative translator for The Ledger, a tool that helps regular citizens understand what Congress is doing by reading the actual public record.\n\n## Your Rules\n\n1. **Separate observation from inference.** First state what the bills and votes actually say. Then state what you infer. Never blend the two.\n\n2. **Every claim needs receipts.** Link each claim to one or more receipt tokens. Format citations as [BILL:118-HR1] or [ACTION:118-HR1-10000] or [VOTE:HOUSE:118-123]. If you cannot link a claim to a bill provided, mark it as [UNWITNESSED].\n\n3. **Surface contradictions.** If bills address the same issue differently, say so. Do not smooth over disagreement.\n\n4. **Write in common tongue.** No legislative jargon. If a procedural term is unavoidable, translate it in parentheses immediately. Short sentences. No corporate language.\n\n5. **Do not patronize.** The reader is not stupid. They are busy. Respect their time and intelligence.\n\n6. **State confidence honestly.** Say whether the bill has passed, is in committee, or is stalled. Give procedural context: where is it in the process?\n\n7. **Name what is unknown.** If the bills do not address a question the reader likely cares about, say so.\n\n8. **Do not hallucinate.** If you are unsure, say so. Never invent bill provisions. Never cite a receipt token that was not provided to you.\n\n## Output Format\n\nProduce a markdown document with exactly these sections:\n\n# [Title derived from the question]\n\n**Question:** [The user\'s question]\n**Context:** [The user\'s decision context]\n\n---\n\n## What the bills say\n\n[For each key provision or action, state what the bills actually contain in plain language. Group by theme. Always cite with receipt tokens like [BILL:118-HR1].]\n\n## What we infer (with receipts)\n\n[Numbered claims. Each claim MUST be followed by receipt token citations. Surface contradictions. Mark anything without receipts as [UNWITNESSED].]\n\n## What is unknown\n\n[Questions the bills do not answer that the reader probably cares about.]\n\n## Procedural status\n\n[Where each bill stands: introduced, in committee, passed one chamber, signed into law, etc. Be specific about dates and actions.]\n\n---\n\n*Generated by The Ledger. Receipts only.*';

  function buildUserMessage(question, context, bills, actions) {
    var lines = [];
    lines.push('**Question:** ' + question);
    if (context) lines.push('**Context:** ' + context);
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('**Bills provided (' + bills.length + '):**');
    lines.push('');

    for (var i = 0; i < bills.length; i++) {
      var b = bills[i];
      lines.push('### ' + b.receiptToken);
      lines.push('**Title:** ' + b.title);
      if (b.sponsor) lines.push('**Sponsor:** ' + b.sponsor);
      if (b.introducedDate) lines.push('**Introduced:** ' + b.introducedDate);
      if (b.policyArea) lines.push('**Policy Area:** ' + b.policyArea);
      if (b.latestActionText) lines.push('**Latest Action (' + (b.latestActionDate || '') + '):** ' + b.latestActionText);
      if (b.summaryText) {
        lines.push('**Summary:**');
        lines.push(b.summaryText.replace(/<[^>]+>/g, '').substring(0, 1000));
      }
      lines.push('**Source:** ' + b.congressGovUrl);
      lines.push('');

      // Include actions for this bill
      var billActions = (actions || []).filter(function(a) { return a.receiptToken && a.receiptToken.indexOf(b.congress + '-' + b.chamber + b.number) !== -1; });
      if (billActions.length > 0) {
        lines.push('**Actions:**');
        for (var j = 0; j < Math.min(billActions.length, 10); j++) {
          lines.push('- ' + billActions[j].date + ': ' + billActions[j].text + ' ' + billActions[j].receiptToken);
        }
        lines.push('');
      }

      lines.push('---');
      lines.push('');
    }

    lines.push('Based on these bills and their actions, generate a plain-language legislative brief.');
    lines.push('Follow all rules strictly. Every claim must cite receipt tokens.');
    lines.push('Surface contradictions. State procedural status honestly.');
    lines.push('Write for a regular citizen making a real decision.');

    return lines.join('\n');
  }

  async function generate(opts) {
    var userMessage = buildUserMessage(opts.question, opts.context, opts.bills, opts.actions);

    try {
      var response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': opts.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 4096,
          stream: true,
          system: SYNTH_SYSTEM,
          messages: [{ role: 'user', content: userMessage }]
        })
      });

      if (!response.ok) {
        var errBody = await response.text();
        var msg = 'API error (' + response.status + ')';
        try {
          var errJson = JSON.parse(errBody);
          if (errJson.error && errJson.error.message) msg = errJson.error.message;
        } catch (e) { /* default */ }
        throw new Error(msg);
      }

      var reader = response.body.getReader();
      var decoder = new TextDecoder();
      var buffer = '';
      var fullText = '';

      while (true) {
        var result = await reader.read();
        if (result.done) break;

        buffer += decoder.decode(result.value, { stream: true });
        var lines = buffer.split('\n');
        buffer = lines.pop();

        for (var i = 0; i < lines.length; i++) {
          var line = lines[i];
          if (!line.startsWith('data: ')) continue;
          var data = line.slice(6).trim();
          if (!data || data === '[DONE]') continue;

          try {
            var parsed = JSON.parse(data);
            if (parsed.type === 'content_block_delta' && parsed.delta && parsed.delta.type === 'text_delta') {
              fullText += parsed.delta.text;
              if (opts.onChunk) opts.onChunk(parsed.delta.text, fullText);
            }
            if (parsed.type === 'error') {
              throw new Error(parsed.error ? parsed.error.message : 'Stream error');
            }
          } catch (parseErr) {
            if (parseErr.message && !parseErr.message.includes('JSON')) throw parseErr;
          }
        }
      }

      if (opts.onDone) opts.onDone(fullText);
      return fullText;

    } catch (err) {
      if (opts.onError) opts.onError(err);
      throw err;
    }
  }

  return {
    generateSearchQueries: generateSearchQueries,
    generatePlainSummaries: generatePlainSummaries,
    generate: generate,
    buildUserMessage: buildUserMessage,
    SEARCH_SYSTEM: SEARCH_SYSTEM,
    SUMMARY_SYSTEM: SUMMARY_SYSTEM,
    SYNTH_SYSTEM: SYNTH_SYSTEM,
    MODEL: MODEL
  };
})();
