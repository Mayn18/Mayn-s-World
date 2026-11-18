import { DestinationIndex } from '../components/navigation/DestinationIndex';
import { DestinationPanel } from '../components/navigation/DestinationPanel';
import { useSelectedDestination } from '../components/navigation/useSelectedDestination';
import { MotionToggle } from '../components/MotionToggle';
import { ServerStatus } from '../components/ServerStatus';
import { home } from '../content/home';
import { TownCanvas } from '../world/TownCanvas';
import { MeadowScene } from '../world/scenes/MeadowScene';

// The home page. Reading top to bottom (which is also the order a screen
// reader and the Tab key follow):
//   skip link -> title and welcome -> the meadow (explore) -> the open
//   destination, if any -> the plain destination list -> footer controls.
export function App() {
  const selected = useSelectedDestination();

  return (
    <>
      {/* Hidden until focused. The first Tab press on the page shows it, so
          keyboard users can jump past the header. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 pixel-button"
      >
        Skip to content
      </a>

      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 pb-12 pt-8 sm:px-8">
        <header>
          <h1 className="font-pixel text-4xl leading-tight sm:text-6xl">{home.title}</h1>
          <p className="mt-3 max-w-2xl text-lg">{home.tagline}</p>
        </header>

        <main id="main" className="flex flex-col gap-10">
          {/* scroll-mt keeps the picture clear of the top edge when a link
              jumps here. */}
          <section id="meadow" className="scroll-mt-6">
            <MeadowScene />
          </section>

          {/* Development preview of the town renderer (milestone 1). The
              meadow above stays until the town replaces it. */}
          <section aria-labelledby="town-preview-heading" className="flex flex-col gap-4">
            <h2 id="town-preview-heading" className="font-pixel text-2xl">
              Town terrain preview
            </h2>
            <TownCanvas />
          </section>

          {selected && <DestinationPanel key={selected} id={selected} />}

          <DestinationIndex selected={selected} />
        </main>

        <footer className="flex flex-wrap items-center justify-between gap-4 text-sm text-ink-muted">
          <MotionToggle />
          <p>
            <ServerStatus />
          </p>
        </footer>
      </div>
    </>
  );
}
