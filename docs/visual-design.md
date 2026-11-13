# Visual Design Specification — Mayn's World

## Design identity
A cozy, immersive, explorable pixel-art world. The environment is the primary navigation interface, not a decorative background behind a conventional portfolio.

Reference: https://github.com/Mayn18/Beep-Bot
Borrow the design philosophy: distinct themed worlds, pixel-art atmosphere, ambient effects, reusable UI skins, smooth transitions and saved preferences. Do not copy code or artwork without checking licenses. The license status of Beep-Bot's code and assets has not yet been checked.

## Navigation model
The homepage opens into an explorable environment. Visitors select recognizable locations, objects, signs and landmarks to open website destinations.

Suggested mapping:
- Central starting area: Home / introduction.
- House or workstation: About.
- Workshop, computer or project board: Projects.
- Journal, bookshelf or noticeboard: Blog.
- Document case or desk: Resume.
- Mailbox: Contact.
- Computer terminal or developer board: GitHub.

These are concepts, not mandatory literal assets. Choose a coherent environment.

Every destination must have a clear name, visible label or accessible tooltip. Provide a map/destination index and a conventional accessible navigation fallback. Do not require visitors to walk a character around the map.

## Optional avatar
An optional pixel-art avatar may idle, walk between destinations and react to interactions. Visitors can disable it. It is decorative and must never be necessary for navigation, content access or comprehension. No complex RPG movement in v1.

## Six-theme direction
1. Daytime Meadow — bright default, calm green landscape.
2. Cozy Night — dark palette, stars and warm lights.
3. Rainy Evening — muted colors, rain and window lights.
4. Sunset Dream — warm orange/purple atmosphere.
5. Enchanted Forest — magical forest, subtle glowing details.
6. Snowy Cabin — winter landscape and warm interior lighting.

Each theme defines environment, palette, UI surfaces/borders, typography treatment, ambient effects and lighting. Use one centralized theme registry. Switching themes changes presentation only, never content or functionality.

Build one polished environment first. Architect for all six; do not deliver six incomplete scenes.

## Rendering and interaction
- Use Canvas or CSS for atmosphere where appropriate.
- Keep actual text, links, forms, buttons and content in semantic DOM.
- Do not render the entire site as one canvas.
- Use reusable pixel-art panels, buttons, labels, tooltips and modals.
- Use crossfades for theme changes when motion is enabled.
- Save theme and preference settings locally.
- Self-host fonts and assets.
- Use original or properly licensed artwork.

## Content presentation
Opening a destination should reveal a readable website page or panel. Long-form content must not be squeezed into tiny speech bubbles.

Projects need readable descriptions, technologies, screenshots and repository links. Blog posts need comfortable line length, readable typography and publication metadata. Resume must be easy to view/download. Contact forms must be conventional and accessible.

Use pixel fonts selectively for headings, labels and decorative elements. Use a highly readable font for long-form text.

## Accessibility
- Responsive on desktop, tablet and mobile.
- Mouse, keyboard and touch support.
- Visible focus states.
- Semantic HTML and accessible names.
- Appropriate contrast.
- Support `prefers-reduced-motion`.
- Provide controls to disable ambient animation and avatar.
- No information communicated only by color or animation.
- All destinations remain available if scene rendering fails.
- Mobile should use a touch-friendly adapted exploration layout, not merely a shrunk desktop map.

## Performance
- Avoid unnecessary continuous animation.
- Pause/reduce ambient effects when page is hidden.
- Lazy-load nonessential scenes/assets.
- Optimize image sizes and formats.
- Avoid expensive redraws and unnecessary React renders.
- Keep first load lightweight and usable on modest hardware.

## V1 scope
- One polished explorable environment.
- All core website destinations.
- Optional simple avatar.
- Theme engine and theme selector.
- Basic ambient effects.
- Map/destination index.
- Mobile-friendly exploration.
- Reduced-motion and animation settings.

## Explicit exclusions
No combat, inventory, character stats, unrelated quests, multiplayer, complex physics, mandatory character movement or decorative interaction that makes navigation harder.
