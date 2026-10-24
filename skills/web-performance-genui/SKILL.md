---
name: web-performance-genui
description: 'Web performance practices for interfaces generated or updated as streams arrive (generative UI, LLM responses, component-based chats, live dashboards, and SPAs). Use when building, reviewing, or optimizing apps that render streamed content (tokens, SSE, streaming fetch, partial JSON), display long lists, or change views without reloading. Also use when users mention CLS, INP, LCP, LoAF, layout shifts, freezing, buttons jumping, rerenders, Core Web Vitals, soft navigations, or Chrome DevTools measurement, even if they do not say "performance". Includes implementation patterns and verification with Chrome DevTools MCP.'
---

# Web Performance for Generative UI

When an interface is generated as a model response arrives, each token can create work for the
main thread: parsing, updating state, creating nodes, calculating layout, and painting. The model
can be fast while the experience feels slow. This skill helps you build interfaces that **stay
visually stable (CLS), respond quickly (INP), and show important content early (LCP)**, then
**verify the results with measurements** instead of assumptions.

Targets at the 75th percentile of real-user visits: **LCP ≤ 2.5 s · INP ≤ 200 ms · CLS ≤ 0.1**.
The p75 matters: three out of four visits should rate "good," not just the developer's laptop.

## Workflow

1. **Measure first.** Before changing code, record a lab baseline. Use Chrome DevTools MCP when
   available; otherwise, explain how to measure with the Performance panel. See
   `references/verificar.md`.
2. **Design the data contract before the UI.** The model should return data from a closed
   component catalog validated by a schema, not arbitrary HTML. Order the schema for streaming:
   above-the-fold content first.
3. **Apply the 10 rules** below. See `references/patrones.md` for code examples, adapted to the
   project's framework (React, Angular, Vue, Svelte, or vanilla JavaScript).
4. **Measure again** under the same conditions (4× CPU throttling or a calibrated preset, same
   prompt) and report before → after. If a metric did not improve, say so and explain why.

## The 10 Rules

1. **Measure on a slow device.** Use 4× CPU throttling (or a calibrated preset) and a slow
   network. Use lab measurements to find causes and field data (CrUX, web-vitals) to confirm.
2. **Return data, not HTML.** Use a component catalog and JSON Schema (`responseConstraint` in
   the Prompt API, `responseJsonSchema` in Gemini, or equivalent provider options). Avoid
   inserting model-generated text with `innerHTML`: it is unsafe and expensive.
3. **Reserve space from the first paint.** Give each slot its final dimensions (`min-height`,
   `aspect-ratio`, `line-clamp`, `contain`) in the initial HTML/CSS. Creating skeletons with
   JavaScript after load can itself cause a layout shift. Do not insert content above what the
   user is reading. Use `content-visibility: auto` only for completed sections.
4. **Parse each character once.** Do not call `JSON.parse(bufferComplete)` on every token (O(n²)).
   Use an incremental parser or request newline-delimited JSON (NDJSON) and process complete
   items.
5. **Render once per frame.** Batch updates and paint with `requestAnimationFrame`; 70 tokens/s
   does not mean 70 renders/s. Network reads arrive in bursts, so do not render for every event.
6. **Yield to the browser.** Break up long tasks with `scheduler.yield()` (with a fallback) and
   move expensive work (ranking, filtering, embeddings) to a Web Worker. Give immediate feedback
   when a user clicks.
7. **Use stable keys.** Keep one node per id, not per position; update only changed text and
   animate reordering with View Transitions. This preserves focus, hover, and decoded images.
8. **Recycle long lists.** Virtualize with a node pool: DOM size should depend on the viewport,
   not the model response. Monitor memory during long sessions.
9. **Keep state outside rendering.** Use one store per stream (draft vs. committed; keep the
   previous content visible until its replacement arrives), subscribe by key, and derive values
   in code.
10. **Measure soft navigations.** If the UI changes view and URL without a document reload, report
    LCP, INP, and CLS per view (`soft-navigation`, `interaction-contentful-paint`, or web-vitals
    with `reportSoftNavs`). Segment hard and soft navigations in RUM. Soft-navigation APIs and
    metrics have limited browser support; CrUX soft-navigation metrics are experimental.

Accessibility during generation: set `aria-busy` on the changing region, keep announcements
brief and spaced out (`role="status"`), never move focus without the user's action, and respect
`prefers-reduced-motion`.

## Antipatterns to Flag

- `el.innerHTML = render(fullState)` on every token or chunk.
- Parsing the entire accumulated buffer with `JSON.parse` (or a partial-JSON library that does
   the same) on every token.
- Images in generated components without `width`/`height` or `aspect-ratio`.
- Skeletons or containers created with JavaScript after first paint that change page height.
- Banners, notices, or offers inserted above the user when they arrive at the end of a stream.
- Calling `setState` or `signal.set` for every token without batching; using `startTransition` as
   a substitute for batching.
- Expensive synchronous calculations inside a click handler.
- Index keys (`key={i}`) in lists that grow or reorder.
- An SPA that measures only its initial page load.

Useful caveat: if an entire view is recreated with `innerHTML`, CLS can be 0 because all nodes
are new, even when users see things jump. Check both metrics **and** actual behavior.

## Reporting Results

End with this format so the results are supported by evidence:

```
## Performance
Conditions: <CPU, network, prompt, or interaction used>
| Metric | Before | After |
|---|---|---|
| CLS | … | … |
| INP (interaction: …) | … | … |
| LCP | … | … |
Changes: <rule applied → file>
Remaining work / risks: <what could not be measured or improved>
```

If you could not measure (no browser or DevTools MCP is available), say so explicitly and give
the exact steps to measure it. Never invent numbers.
