# Validation boundary — Meelan Studio 2.1 RC3

Build date: September 11, 2026. Desktop After Effects is unavailable in this environment. No claim below implies an AE-rendered result or an executed Windows/macOS installer.

## Completed checks

- **18 grouped browser/canvas checks**, Chromium 145.0.7632.6: six tool renderers, all animated card samples, filtering/search, cursor/carousel live parameters, pause/play/scrub/restart, panel resizing, render-error isolation, reduced-motion override, timer fallback, host-option serialization, five mark styles, every workshop operation, distinct frames for all 23 motion choices, comp-tool playback, result handling, safe text rendering and Locate IDs.
- **21 add-on contract checks:** independent and shared comp graphs, minimum depth/filter boundaries, project scopes, conservative literal expression rewrite, disabled-expression preservation, rollback on duplication/copy failure, full-selection extraction preflight, layer order/parent/matte/control reconstruction, stretch/keyframe/easing mapping, all five native marks, mixed text style/keyframe preservation, protected Source Text, saved typography round trip, sampled reports, 23 animator constructions and endpoint amounts, palette/outline/stroke contracts, normalization/fit/anchor transforms, footage-item sharing and movie import mode, batch text-animator rollback.
- **12 existing host/syntax checks**, plus Store, CEP bridge and original GLB topology/asset suites, continue to pass.
- The generated host and sample-scene utility parse under conservative **ECMAScript 3** syntax checks, including the earlier regular-expression delimiter failure regression.
- Manifest XML, local JavaScript syntax, macOS shell syntax, package inventory hashes and ZIP integrity are checked during packaging.

Results: `browser-results.json`, `contract-results.txt`, and the preserved individual suite logs. Browser calls to AE are explicitly stubbed. The mock models property contracts, keyframes and graph structure; it cannot validate Adobe property-reference invalidation, expression evaluation with AE vector semantics, native styling/rendering or OS behavior. Some mark and animator expressions are also evaluated against simple sample data in JavaScript; this is not Adobe's expression engine.

Screenshots show the actual HTML panel. Files named Text-Report and other interaction captures can show test fixtures; they do not show real AE project inspection. The main interface screenshot is disconnected and shows sample artwork. No preview is a rendered frame of selected user artwork.

## Desktop acceptance to run in AE 2026

The included `tools/Create-AE-Test-Scenes.jsx` constructs original example comps for the carousel, cursor, five marks, three text motion treatments, three palettes, linked outlines, a stroke reveal, text edits/report, timed extraction and two independent nested-comp duplicates. It records actual dispatcher responses and sampled expression audits to the Desktop. It never saves, opens or replaces project files. Its native execution has not been run here.

| Check | Expected result | Desktop status |
|---|---|---|
| Windows install/update | Panel opens from Extensions, previous installation backed up, collection retained. | Not run |
| CEP previews | Each card/drawer responds after docking, hiding, resizing and reopening. | Not run in CEP |
| Cursor / carousel | Native model contact and click stay synchronized; selected card copies orbit correctly. | Not run |
| Extract | Compare source/precomp before and extracted layers after at several frames; parent, matte, keyframes and positive stretch match supported 2D cases. | Not run |
| Duplicate | Open both new roots; shared nested source is independent of original and shared only inside its copy set. Exercise filters, expressions and optional movie/sequence/solid duplication. | Not run |
| Five marks | Edit text content/font size and transform; mark follows. Change Progress, static/animated state and duration. | Not run |
| Text edits | Mixed-style and keyed Source Text retain content/style intent and key times; report locates the correct layer. | Not run |
| Styles / outlines | Save/apply across projects; live text outline expressions evaluate; colors/width controls work. | Not run |
| Stroke / motion | Native menu conversion, Trim Paths, blur halo, selector grouping and all preset timings render correctly. | Not run |
| Undo / recovery | One Undo reverses composition edits; unsupported cases leave originals available; failed native calls report actionable errors. File-based style saves are outside Undo. | Not run |
| Store | Save/restore/import nested comps with footage, sequence and proxy; missing media does not publish an incomplete entry. | Not run |
| macOS / uninstall | Install, basic native operation, collection access and reversible uninstall. | Not run |

This package is a release candidate. Successful local tests do not establish visual parity with commercial references or readiness for student distribution. The precise supported scope is in `ADDON-COVERAGE.md`.
