# Verify: Measure Before and After

Measurement is part of the work, not an optional extra. Keep conditions identical before and
after (same URL, prompt or interaction, and CPU setting). Repeat each measurement at least three
times and report the median.

## With Chrome DevTools MCP (Coding Agents)

Configuration (Gemini CLI, Claude Code, Antigravity, Cursor, and others):

```json
{ "mcpServers": { "chrome-devtools": { "command": "npx", "args": ["-y", "chrome-devtools-mcp@latest"] } } }
```

Measure **both phases**: page load (skeletons should be present at first paint) and content
generation. A typical workflow for a streaming UI:

1. Use `new_page` or `navigate_page` to open the app (for example, `http://localhost:5173`).
2. Call `emulate` with `{ "cpuThrottlingRate": 4 }` (and slow network throttling if load matters).
3. **CLS during generation:** call `performance_start_trace` with
   `{ "reload": false, "autoStop": false }` → trigger generation (`fill`/`click` using the uids
   from `take_snapshot`) → wait for it to finish (`wait_for`) → call `performance_stop_trace` →
   analyze `CLSCulprits` with `performance_analyze_insight`.
4. **INP for an interaction:** use the same pattern, but perform the click you want to measure;
   analyze `INPBreakdown` (input delay, processing duration, presentation delay).
5. **Initial load:** call `performance_start_trace` with `{ "reload": true }` → analyze
   `LCPBreakdown`.
6. Apply the change and repeat the same step. Use `screencast_start`/`screencast_stop` to record
   before-and-after video if useful.

To inspect custom metrics or verify values, use `evaluate_script` with a PerformanceObserver. For
example, this logs layout shifts without recent input:

```js
() => new Promise((resolve) => {
  let cls = 0;
  new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) cls += e.value; }))
    .observe({ type: 'layout-shift', buffered: true });
  setTimeout(() => resolve({ cls }), 500);
})
```

Trace and video file paths must be inside the workspace folder exposed to the MCP server.

## Without an Agent: Chrome DevTools Performance Panel

1. Open DevTools → **Performance** and set CPU throttling to **4×** (or choose a calibrated
   preset).
2. **Live Metrics** shows local LCP, INP, and CLS as you interact. CrUX field data may also be
   available for public URLs.
3. Click Record, reproduce generation or the interaction, then stop recording.
4. Review **Insights**: *Layout shift culprits*, *INP breakdown*, and *LCP breakdown*. In the
   **Frames** track, striped patterns indicate partially presented or dropped frames; they do not
   identify LoAF entries by themselves.
5. To inspect LoAF entries, run this in the Console while the page is active:

   ```js
   new PerformanceObserver((list) => {
     console.table(list.getEntries().map((entry) => ({
       startTime: entry.startTime,
       duration: entry.duration,
       blockingDuration: entry.blockingDuration,
       scripts: entry.scripts?.map((script) => script.sourceFunctionName || script.invoker).join(', '),
     })));
   }).observe({ type: 'long-animation-frame', buffered: true });
   ```

   LoAF entries represent frames longer than 50 ms. Their script details help diagnose slow
   rendering and interactions, but `duration` alone does not mean the entire frame blocked input;
   inspect `blockingDuration` as well. The demo HUD also reports LoAF count and maximum duration.
6. Right-click an insight or event → **Ask AI** for an explanation using trace context.
7. Rendering (⋮ → More tools) → **Layout Shift Regions** to see shifts live.
8. More tools → **Performance monitor** to watch DOM Nodes and Layouts/sec during generation.

## In the Field (Real Users)

- Use RUM with web-vitals (see `patrones.md`, section 8), segmenting hard and soft navigations.
- Use CrUX or PageSpeed Insights for public p75 data by URL or origin. CrUX metrics that include
   soft navigations are experimental and do not change the stable Core Web Vitals.

## Thresholds (p75)

| Metric | Good | Needs improvement | Poor |
|---|---|---|---|
| LCP | ≤ 2,5 s | ≤ 4 s | > 4 s |
| INP | ≤ 200 ms | ≤ 500 ms | > 500 ms |
| CLS | ≤ 0,1 | ≤ 0,25 | > 0,25 |
