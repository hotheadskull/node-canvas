# Installing Node Canvas

## Which file do I want?

Almost certainly **x64**. Use arm64 only on an ARM machine (a Surface Pro X,
a Snapdragon laptop). Installing the wrong architecture fails with an error
that does not say "wrong architecture", which is a confusing hour to lose.

| File | What it does |
|---|---|
| `Node Canvas 2.0.0 (portable, x64).exe` | Just runs. No install, no admin, no SmartScreen fuss. **Start here.** |
| `Node Canvas_2.0.0_x64-setup.exe` | Proper install: Start-menu entry, uninstaller. |
| `..._arm64...` | Same two, for ARM machines only. |

## The portable one

Double-click it. That is the whole procedure. Keep it wherever you like;
your projects are saved separately, so moving or replacing the .exe never
touches your work.

## The installer

Windows will show **"Windows protected your PC"** because the app is not
code-signed yet (that is Chunk 19, deliberately last). Click **More info**
then **Run anyway**. This warning is about a missing certificate, not about
anything the app does.

## Important: remove the old version first

An older **Node Canvas 1.0.9** (July 2026) may still be installed at
`%LOCALAPPDATA%\Node Canvas\writing-hub.exe`. Its Start-menu shortcut has
the same name as the new one, so clicking "Node Canvas" can launch the OLD
app — which predates the current node designs, the dock, and the wire
system, and will not behave like anything described here.

Uninstall it from **Settings → Apps → Installed apps → Node Canvas 1.0.9**
before installing 2.0.0, or use the portable build and ignore the Start
menu entirely.

## Requirements

Windows 10/11 with the Edge **WebView2** runtime, which ships with Windows
11 and current Windows 10. Nothing else — no Node, no Rust, no browser.

## Where your work lives

Projects are `.nodecanvas` files you choose the location of, plus an
autosaved working canvas in the app's own storage. Uninstalling the app
does not delete `.nodecanvas` files you saved yourself.
