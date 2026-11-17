# Meelan Studio 2.1 RC3 — added tools and exact coverage

Four original modules are integrated into the existing dockable extension. The 3D cursor, carousel and Pre-Comp Store remain available. Camera 3D Toolkit, AE GPT and LightSweepPro are excluded. The rejected standalone Text, Gradient BG and Depth Reveal tools remain removed. New text motion belongs to the explicitly requested Text Workshop module.

**Status:** implementation and local verification complete; desktop AE 2026 acceptance is still unperformed. This is an installable unsigned CEP release candidate, not a signed or desktop-certified student release. The commercial tools were used as public feature references; their source, binaries, UI artwork and preset files are not bundled.

## Reference mapping

| Requested reference | Module in your engine |
|---|---|
| [Un-PreCompose](https://aescripts.com/un-precompose/) | Extract Comp |
| [True Comp Duplicator](https://aescripts.com/true-comp-duplicator/) | Deep Duplicate |
| [MARKr](https://aescripts.com/markr/) | Text Marks |
| [Textlab Pro](https://aescripts.com/textlab-pro/) | Text Workshop |

Public feature descriptions reviewed September 11, 2026. Coverage below describes the shipped implementation, not a claim of commercial-product parity.

## Extract Comp

**Added:** batch extraction of selected precomp instances; native layer copies; animated 2D transform helpers; inner parenting reconstruction; positive stretch and start-time conversion; in/out trimming; keyframe timing, interpolation and easing transfer; track-matte reconnection; static Layer Control reconnection; optional source-name prefixes. The source comp remains unchanged. Original instances are retained disabled, including their audio, after the entire batch succeeds. Failed copies trigger cleanup of newly created layers.

**Stops before changing layers:** 3D layers/cameras/lights, 3D parent chains, outer masks/effects/enabled styles, outer time remap, collapsed transformations, non-Normal outer blending, nonconstant/less-than-100 outer opacity, outer mattes, adjustment layers, reverse stretch, mismatched pixel aspect, Auto-Orient, inner solo layers and animated layer-reference properties. Outer expressions must be baked or removed.

Inner expressions cause a stop by default. The explicit **Keep for manual review** option copies them verbatim. It does not correct `thisComp`, `index`, time-based expressions, named references, `random()` or simulation state. Removing a precomp also removes its crop boundary and can change effects that sample neighboring layers or time. There is no rendered-equivalence guarantee, arbitrary 3D flattening, expression baking, random-seed repair or automatic deletion of the backup instance.

**Use:** select precomp layers → Extract Comp → choose prefixes/expression handling → Apply. Test the result with the backup disabled. One AE Undo group covers the operation.

## Deep Duplicate

**Added:** active-comp, Project-selection and selected-precomp-layer scopes; 1–30 independent copy sets; shared subcomps cloned once per set; complete nested source relinking; minimum-depth graph traversal; depth limits; case-insensitive literal/regex include or exclude filters; name prefix, suffix and literal find/replace; globally unique generated names; folder hierarchy preservation, grouped output or original folders; optional footage-item and solid duplication; basic footage interpretation and proxy transfer; new root selection; result report with Locate in AE.

Literal `comp("name")` references are updated only when the source comp name is unique. Comments and quoted strings are left alone. Disabled expressions stay disabled. Rewrites that report an AE expression error are reverted.

**Limits:** dynamically constructed comp names, variables, template literals, regex/division expressions and ambiguous duplicate names are not safely rewritten and are reported. Escapes beyond quoted apostrophes, quotes and backslashes need review. No general JavaScript refactoring, named layer expression repair, `footage("name")` rewrite, or external-reference discovery. Comps reached only by expressions are not added to the graph automatically. Excluded/depth-limited sources intentionally stay shared.

Footage-item duplication references the **same physical media files**; it does not collect/copy the media to disk. Standard file footage, numbered image sequences and solids are handled. Interpretation/proxy transfer is best effort; unsupported/missing footage remains shared with a report. Dynamic Link and third-party asset systems are not cloned. Duplicating source comps does not automatically replace the selected timeline instances with the new roots.

**Use:** choose scope → copy count/naming/folders → optional filters → Apply. Open the new root from the report or Project panel.

## Text Marks

**Added:** underline, strikethrough, full highlight, half-height highlight and scribble; batch selected text; native shape paths and Trim Paths; live parent-linked text bounds; text transform and opacity following; color, thickness, horizontal/vertical padding, vertical offset, roundness, duration, progress and static/animated controls. Text content and its expressions remain editable.

**Limits:** marks target the whole layer's text bounding box. No text-caret/substring selection, individual multiline marks, commercial scribble artwork or taper preset library. Thickness applies to stroke marks; vertical padding and roundness apply to highlights. Scribble is an original curved path. Static marks use the Animate control rather than the reference's exact modifier-key gesture.

**Use:** select text → Text Marks → choose a style → Apply. Edit the source text afterward; the mark follows its bounds. Adjust the generated shape's Effect Controls to retime or restyle it.

## Text Workshop

| Area | Implemented | Limits / not included |
|---|---|---|
| Text report | Selected, active-comp or whole-project text; content, first-character font/size, scale, word count, estimated reading time, effect/expression counts; whitespace/placeholders and font/size outlier flags; per-row Locate in AE; CSV export. | Sampled at each comp's current time. No full mixed-run style analysis, rendered-pixel inspection, automatic fixes for every flag, professional language/proofreading checks, or HTML/PDF export. |
| Safe crops & contrast | Six centered crop ratios: 9:16, 16:9, 1:1, 4:5, 2:3 and 3:4; adjustable inset; 2D transformed text bounds through parent chains; contrast against the color you choose. | Not platform-specific UI overlays or accessibility certification. 3D/camera bounds unavailable. Text animators, masks, raster effects and layer-style extents are not evaluated. |
| Cleanup & editing | Line-edge whitespace removal; literal case-sensitive find/replace; eight case modes; names from content; exact font-size matching. Character-range edits retain styles outside changed ranges and preserve Source Text keyframe times. | No linguistic title-case engine, regex replacement, language-aware word segmentation or expression-driven Source Text rewriting. New replacement characters inherit the replaced range's style. |
| Case modes | Upper, lower, title, sentence, uppercase vowels, uppercase consonants, uppercase word edges, alternating. | Word/sentence boundaries use simple rules. Vowel/consonant modes target Latin a–z; complex Unicode casing is not a full locale-aware implementation. |
| Anchor centering | Centers the current text bounds; shifts anchor keys; adds position compensation that follows animated scale/rotation. | Requires unlocked 2D text, unseparated Position and no existing Position/Anchor expressions. A second application is refused while its compensation expression exists. |
| Normalize Scale | Uniform positive static scale becomes point-text font size, stroke width, explicit leading and baseline shift; anchor adjusts; Scale becomes 100%. | Rejects box text, 3D, animated/nonuniform scale, effects, text animators, anchor expressions and text layers with children. Special text-on-path, paragraph layout and layer-style setups require manual review. |
| Fit composition | Fits the active 2D comp to selected text/shape bounds plus padding; shifts root position values/keys and retains child parenting. | Current-frame geometric bounds only. No animation-envelope fit, 3D fitting or reliable raster-effect/layer-style extents. Root Position expressions/separated Position and locked roots are refused. Resizing can affect expressions that depend on comp dimensions and downstream comps. |
| Saved styles | Named persistent presets for font, size, fill, stroke, tracking and leading; reuse across projects; keyed text timing retained; previous style-file backup. | Uniform captured typography from the first character. No live synchronization between layers, shared cloud style library, style rename/delete UI, mixed-run preset capture, effects or animator capture. Duplicate preset names are refused. |
| Multi-outline | One to three colored outline duplicates, editable stroke width/color controls; live source content, transforms and opacity. | Uniform style per outline. Existing animators/effects are copied at creation; later animator/effect/style edits on the original do not synchronize. No exact commercial outline preset library. |
| Character colors | Three-color repeating palette, seeded random palette or three-color gradient via native expression selectors. | Character-index gradient rather than a spatial pixel gradient. No arbitrary-length palette, palette extraction or exact commercial color presets. |
| Stroke reveals | Text-to-shape conversion or selected shapes; native contour strokes and Trim Paths; together/wave/travel timing; clean/neon-halo/trail finishes; retained disabled originals. | Converted text is an outline snapshot. No handwriting centerline reconstruction. Wave order follows shape groups. English-menu command lookup for conversion; in other AE languages convert text to shapes manually first. Native blur halos and duplicate trails are original approximations. |
| Motion | Eight basic movement choices plus fifteen original presets; native text animators; per-run Start/Duration/Stagger controls; character/word/line selectors; reverse order; smooth/linear timing and selected spring/random treatments. | Not the commercial 15 FFX files or frame-matched replicas. Presets animate in; no dedicated out-animation or automatic duration fitting. Spring/type-on presets define their own timing curve; Word Lift always groups words. Repeated applications add animators instead of replacing existing ones. |

**Eight basics:** Fade, Scale, From Below, From Above, From Right, From Left, Pop, Blur.

**Fifteen original presets:** Soft Rise, Editorial, Kinetic, Elastic, Focus, Cascade, Flutter, Wide Angle, Whisper, Swing, Soft Slide, Type On, Random Pop, Random Drift, Word Lift.

**Use:** Text Workshop → Inspect / Edit / Style / Motion → choose an operation. Only relevant fields appear. Read-only reports open in a separate window; Locate selects the actual comp/layer by its ID. CSV files save into your collection folder. Saved typography is stored under Adobe's per-user data folder in `MeelanStudio/text-styles.json`; the previous version is retained as `.bak`. Style-file writing is not part of AE's Undo history.

## Preview and validation boundary

All six catalog cards have functioning offline sample renderers. Play, Pause, Restart and scrubbing work independently per preview. Text Workshop changes its sample when the operation changes. Utility previews illustrate a workflow; they do not run an operation on your project. Static styles remain static. Samples do not display your selected AE artwork or reproduce the native renderer pixel for pixel.

Completed: 18 grouped Chromium browser/canvas checks; 21 add-on contract tests; 12 existing host/syntax tests; bridge/store/GLB checks; ES3 grammar; package hashes and ZIP integrity. Native property objects are modeled in tests, not Adobe's renderer. Desktop AE, actual CEP docking, OS installers, text-to-shape menu behavior, native text-style expressions and rendered visual equivalence still need acceptance on your AE 2026 installation.

The ZIP includes source modules, the bundled ES3 host, installers, test scripts, screenshots and complete test results. `tools/Create-AE-Test-Scenes.jsx` creates original sample scenes to make desktop verification concrete.
