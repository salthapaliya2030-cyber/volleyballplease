# Volleyball Legends Arena — Playgama browser build

A modular, single-player anime-volleyball arena prototype for Playgama's JavaScript runtime. It uses original procedural court/character/ball drawings and does not bundle Roblox assets or depend on Roblox services.

## Run locally

Open `index.html` from a local static server (for example, `python -m http.server 8000`) and visit `http://localhost:8000`. ES modules are used, so opening the file directly with `file://` is not supported by most browsers.

No npm install is required. `npm run check` runs JavaScript syntax checks.

## Controls

- **WASD / arrow keys:** move relative to the camera
- **right mouse drag:** orbit camera; **mouse wheel:** zoom
- **shift:** toggle shiftlock / pointer lock
- **space:** jump
- **left click:** serve, bump, or spike (jump before a spike)
- **q / e:** set
- **r:** block near the net
- **f:** activate a fully charged style ability
- **ctrl:** dive
- **f11:** request fullscreen

Touch devices receive a virtual movement stick and action buttons.

## Project map

```text
index.html
playgama-bridge-config.json
app.js
graphics/
  camera.js       orbit/shiftlock camera and perspective projection
  renderer.js     court, net, athletes, ball and floor-shadow rendering
  ui.js           menu, team/role setup, settings, inventory and style roll
  style.css       responsive interface
animations/
  rig.js          mutually exclusive animation tracks and contact markers
gameplay/
  match.js        rally state, three touches, movement, ball contact and scoring
  physics.js      vector math and ball gravity/velocity
  ai.js           offline bot positioning and action selection
  profile.js      style stats and weighted rarity rolls
shared/
  bridge.js       Playgama initialization, lifecycle, and profile storage
  events.js       typed-by-convention event bus
```

## Match systems included

- 100 × 50 court, center net and visible floor tracking ring
- camera-relative movement, orbital camera, shiftlock pointer lock, fullscreen request
- serve, bump, set, spike and block actions with animation-timed contact checks
- three-touch-per-side rally flow, floor/out calls, scoreboard and first-to-15 match finish
- two teammate bots and three opponent bots, with easy/normal/hard reaction tuning
- role selection (spiker, setter, libero), team selection and touch-screen controls
- yen/gem profile display, five weighted style rarities, equipable style stats and charged abilities
- Playgama Bridge initialization, profile save/load using Bridge Storage, game-ready and match lifecycle messages, interstitial request at match completion

## Runtime boundary / honest implementation notes

This is a **single-player browser simulation**. The game loop and physics run locally because the requested offline bot match does not have a remote game server. It does not contain Roblox `RemoteEvent`, `RemoteFunction`, `Motor6D`, or Roblox DataStore calls; those APIs cannot run inside a Playgama JavaScript game. Bridge Storage is used for saved player progress when hosted by Playgama. In a local browser preview where Bridge is absent, profile changes remain in memory for that page session (no browser storage APIs are used).

The four required top-level domains are present (`graphics`, `animations`, `gameplay`, `shared`). Graphics are rendered procedurally in Canvas rather than imported from Roblox or third-party asset packs. The build currently uses no licensed game characters, logos, or music. For a publication-ready release, add original compressed music and sound effects and run the Playgama QA Tool on the uploaded archive. The Playgama Bridge script is loaded from Playgama's stable Bridge CDN as documented by the platform.
