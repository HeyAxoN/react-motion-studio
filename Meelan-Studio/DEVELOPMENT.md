# Development and distribution

The installable payload is `extension/`. It targets host `AEFT` 26.0–26.9 and CEP 12. The panel is HTML/CSS/JavaScript; the AE host file is ES3 ExtendScript. No npm installation is needed to use the extension. All cursor assets required at runtime are included.

## Local checks

Use Node 18+ (Node 24 was used here). Install the development dependencies with `npm install`, then run `python tools/build_host.py` and `npm test`. Run `npx playwright install chromium` and `npm run test:ui` for browser/canvas checks. `MS_TEST_BROWSER` can point to an existing Chromium executable. Browser tests write results to `validation/` and explicitly stub all CEP host calls.

The mocked AE contract checks do not render, emulate Adobe's expression engine, or verify every native property index. An actual AE acceptance run is required. Use `tools/Create-AE-Test-Scenes.jsx` and `validation/VALIDATION.md`.

## Architecture

- `extension/js/app.js`: panel state, dialogs, controls and operation orchestration.
- `extension/js/bridge.js`: serialized JSON request/response boundary with a concurrent-operation lock.
- `src/host/core.jsx`, `comps.jsx`, `text.jsx`: maintained ES3 source modules.
- `tools/build_host.py`: concatenates modules into one installed `extension/host/studio.jsx`; no runtime includes.
- `extension/js/addons-catalog.js`: four module definitions and workshop operations.
- `extension/js/store.js`: local collection metadata and reversible visibility changes.
- `extension/js/previews.js`: per-canvas playback, live parameters, scrubbing and isolated error recovery. The cursor-mesh.js data is extracted from the original bundled GLB.
- `tools/build_models.py`: reproducible original beveled GLB meshes.

Host messages call the unique global `MeelanStudioHost.dispatch`. JSON is parsed without `eval`. Names and user input are serialized as data. Host operations use undo groups except archiving, which saves and reopens projects. The CSP limits scripts and connections to local resources. There are no telemetry, remote scripts or image-upload endpoints.

## Build a package

Run `python tools/package.py` from the project root. It refreshes payload checksums and creates `Meelan-Studio-2.1.0-RC3.zip` beside this directory. The ZIP includes the entire source, docs, assets, tests and installers; it excludes development dependencies and caches.

## Signed student distribution

The supplied installers enable Adobe's documented CEP developer-loading preference because this build is unsigned. They are intended for local acceptance testing. For a signed ZXP, use Adobe's official [ZXPSignCmd tooling](https://github.com/Adobe-CEP/CEP-Resources/tree/master/ZXPSignCMD) on Windows or macOS. Sign the **extension folder** using your own certificate, then verify the resulting signature and install/test that ZXP on a clean machine. Use the tool's current documentation for certificate creation and signing options; never distribute your private signing key or password.

A valid package signature only verifies package integrity and publisher identity. It does not replace the AE rendering and Store acceptance checks. Keep the original license and notices in the signed payload. The development installers and their debug-loading changes are not needed for normal installation of a successfully signed and supported ZXP.

## Adding an effect module

Add a catalog definition, host action, and preview renderer together. Each renderer takes normalized field values and time; it must preserve canvas state and avoid outside network resources. Existing controls feed both the sample renderer and the host dispatcher. Add a preview regression covering parameter changes and paused playback. Runtime assets must be original or licensed for redistribution. The installed extension has no AI or arbitrary generated-script execution route.

For environments without a bundled Chromium, set MS_TEST_BROWSER to a compatible Chromium or chrome-headless-shell executable. MS_TEST_SINGLE_PROCESS=1 is an optional test-only mode for environments that cannot create browser subprocess services. Neither option changes the installed extension.
