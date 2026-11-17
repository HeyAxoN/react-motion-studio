# Meelan Studio 2.1.0 RC3

An original motion toolkit for **After Effects 2026**, with a dockable HTML panel, live sample previews, original GLB cursor models, a 3D carousel, a personal composition collection, and four integrated comp/text modules.

**Build status: release candidate.** The preview controls, source syntax, and mocked host contracts have been checked. This package has not been run in desktop After Effects. It is not yet verified for classroom distribution or production work. See `validation/VALIDATION.md` for the exact boundary.

## Install on Windows

1. Extract the entire ZIP to a folder. Close After Effects.
2. Double-click **Install-Windows.cmd**. Read the installer notice and type `INSTALL`.
3. Open After Effects 2026. In **Preferences > Scripting & Expressions**, enable **Allow Scripts to Write Files and Access Network**. File export and composition storage need this preference.
4. Open **Window > Extensions > Meelan Studio**, then dock the panel wherever you work.

This is a complete **unsigned CEP extension**, not a JSX file to run from File > Scripts. The installer copies the extension into your user CEP directory and enables Adobe's developer loading setting for CEP 12. It preserves that setting's prior value and backs up an existing Meelan installation. No administrator access is required. The CMD launcher changes PowerShell's execution policy for that installer process only; it does not change the machine's policy or override managed policies.

If your organization blocks unsigned extensions, ask its administrator to deploy a signed build. Do not disable organizational controls. The signing procedure is in `DEVELOPMENT.md`.

## Install on macOS

Close AE, extract the ZIP, and run `Install-macOS.command`. If Finder does not launch it, open Terminal, type `bash `, drag the command file into Terminal, and press Return. Read the notice and type `INSTALL`. Then follow steps 3–4 above. The macOS installer is included but has not been executed on a Mac.

## This revision

Added **Extract Comp**, **Deep Duplicate**, **Text Marks**, and **Text Workshop**. The three excluded add-ons are absent. The rejected standalone Text, Gradient BG and Depth Reveal tools remain removed. The installer backs up the prior installation and preserves your composition collection.

See **ADDON-COVERAGE.md** for the precise feature matrix and remaining differences from the four references. This is original source with native AE layers and controls, not redistributed commercial plug-ins.

## The tools

| Tool | Workflow | Editable result |
|---|---|---|
| 3D cursor | Select one target, choose a material and movement, then Apply. | Original GLB, target link, size, approach, lift, timing, tilt, press and tint. |
| 3D carousel | Select at least two cards, choose orbit settings, then Apply. | 3D copies with radius, speed, angle, three tilts, card width and back opacity. |
| Extract Comp | Select 2D precomp instances and Apply. | Extracted layers, transform helper, reconnected timing/parents/mattes; disabled originals retained. |
| Deep Duplicate | Choose active comp, Project comps or selected precomp sources. | Independent nested comp graphs, naming/filter/folder options and optional footage-item copies. |
| Text Marks | Select text and choose one of five marks. | Live shape paths/highlights with color, sizing, timing and progress. |
| Text Workshop | Choose Inspect, Edit, Style or Motion and an operation. | Text reports, cleanup, typography presets, outlines, character colors, stroke reveals and native motion animators. |
| Pre-Comp Store | Save the active comp with its media, then import it into another project. | An AEP archive, thumbnail, tags and collected media. |

## Live sample previews

Click an effect to open its preview. Play/Pause affects that window independently of the thumbnails. Restart returns to the start and resumes playback. Drag the time slider to inspect a frame; scrubbing pauses playback. Editing controls or pressing Reset redraws the preview immediately, including while paused.

All six catalog tools have sample previews. The comp utilities illustrate their workflow; static text styles remain static. A failed drawing is isolated to its own canvas and can be retried with Restart. A timer also supports playback if CEP temporarily stops delivering animation frames while docking. If Windows requests reduced motion, previews start paused; click Play.

The carousel preview uses six sample cards and automatic framing. Your actual composition uses the selected artwork, its layer count, and the AE camera. Speed 0 deliberately holds the orbit still. The cursor preview uses geometry extracted from the bundled original GLB, with simplified lighting and a sample button. The previews explain motion and settings; they are not pixel-identical AE renders of your selected layers.

### Real 3D cursor

The assets are original closed, beveled **GLB meshes with PBR materials**. AE's native model renderer handles them. Importing a model can show Adobe's Model Settings dialog and switches the comp to Advanced 3D. The initial scale can depend on those import settings: use the rig's Size control and Model Settings as needed. The contact tip was authored at the model origin; Tip X/Y allow landing adjustment.

MS Start and MS Duration drive both arrival and the press response. A Layer Control tracks the target as it moves. Existing scale keyframes remain underneath the scale response; an existing scale expression is protected and must be removed or handled on a duplicate first. The model has animated depth, yaw and click rotation. The rig adds a point light, which can also illuminate other 3D objects in the composition.

### Pre-Comp Store

Saving first saves your current project, creates a separate working copy, reduces/collects that copy, writes `composition.aep`, and reopens the original. **Reopening clears AE's Undo history.** The Save dialog calls this out. A failed media collection does not publish an entry and attempts to reopen the saved original.

Image sequences are collected by matching their numbered filenames, and proxy footage is collected too. If expressions refer to other compositions or footage, the whole project is retained to preserve those dependencies. Self-contained GLB assets are supported; convert external OBJ/GLTF setups to GLB before archiving. Dynamic Link and third-party effects with external sidecar files need their own collection workflow.

Click **Import** to import the saved AEP and place its root comp at the active composition's playhead. With no active comp, the imported root opens in a viewer. You can also drag a saved card onto the panel's drop area. **Native dragging from the panel straight into AE's timeline is not implemented.** The Import button is the primary workflow.

Hiding an entry keeps its project and media at the same path so existing projects retain their links. Restore hidden entries from Settings. Do not delete or move collected media that your projects still use. To share an entry, share its entire folder. Fonts and plug-ins are recorded as dependencies and are not bundled. AE rendering can still depend on their installed versions.

Choose a different collection folder in Settings. It switches the collection being viewed; it does not move old entries. External file changes are refreshed when you reopen the Store tab.

## Check it in AE

For an isolated first run, start a new project, then use **File > Scripts > Run Script File** to run `tools/Create-AE-Test-Scenes.jsx`. This optional test utility creates sample carousel, cursor, comp-utility and text-tool scenes. It does not save or replace projects. It writes a response report to your Desktop.

Preview each scene and run the Store round-trip described in `validation/VALIDATION.md`. Settings > Check expressions samples the active composition at three times; open nested comps to check those separately.

## Uninstall

Close AE and run `Uninstall-Windows.cmd` or `Uninstall-macOS.command`. The extension is moved to an installation backup. Your collection stays in place. The uninstaller offers to restore the previous CEP developer loading setting; that setting can also affect other unsigned extensions.

## Added-tool coverage

Read ADDON-COVERAGE.md for implemented features, workflows and exact unsupported cases. EXPANSION-REVIEW.md now points to that shipped coverage instead of the earlier proposals.

## Independence and licenses

Original extension code, sample artwork and cursor assets: MIT. This package contains no third-party commercial plug-in binaries, presets or source. See LICENSE and THIRD-PARTY-NOTICES.md.
