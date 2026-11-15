import type { CSSProperties } from 'react';
import { DestinationLink } from '../../components/navigation/DestinationLink';
import { PixelSprite } from '../../components/pixel-ui/PixelSprite';
import { useMediaQuery } from '../../components/useMediaQuery';
import { getDestination } from '../../content/destinations';
import { SCENE_HEIGHT, SCENE_WIDTH, meadowBackdrop } from '../art/backdrop';
import {
  ground,
  planks,
  signpostCenterX,
  sky,
  type Placement,
} from './meadowLayout';

// Turns a position in art pixels into CSS percentages of the stage, so the
// whole picture scales together. Only the width is set; the SVG works out its
// own height from its proportions.
function place({ sprite, x, y }: Placement): CSSProperties {
  return {
    left: `${(x / SCENE_WIDTH) * 100}%`,
    top: `${(y / SCENE_HEIGHT) * 100}%`,
    width: `${(sprite.width / SCENE_WIDTH) * 100}%`,
  };
}

// CSS custom properties are not part of React's CSSProperties type, hence the
// cast. They feed the animations in styles.css.
function withVars(style: CSSProperties, vars: Record<string, string>): CSSProperties {
  return { ...style, ...vars } as CSSProperties;
}

// Below this width the stage is a small banner: labels would be tiny and the
// signpost's planks would overlap and be too small to tap (WCAG asks for at
// least 24 x 24 CSS pixels). The destination index below the scene is then the
// way to move around, and the scene is scenery only.
const INTERACTIVE_SCENE = '(min-width: 720px)';

// The Daytime Meadow. Everything here is ordinary DOM: SVG sprites for the art
// (hidden from screen readers) and real links for the places to go. Scenery
// is decoration only, so if the artwork never rendered, the destination index
// on the page would still reach every place.
export function MeadowScene() {
  const interactive = useMediaQuery(INTERACTIVE_SCENE);

  return (
    <div
      className="stage"
      role="group"
      aria-label="The meadow. Select a place to visit. The same places are listed below the picture."
    >
      <PixelSprite sprite={meadowBackdrop} className="stage-backdrop" />

      {sky.map((item, index) =>
        item.kind === 'sun' ? (
          <div key={index} className="stage-item" style={place(item)}>
            <PixelSprite sprite={item.sprite} />
          </div>
        ) : (
          <div
            key={index}
            className="stage-item ambient-drift"
            style={withVars(place(item), {
              '--drift': `${item.drift?.distance ?? 0}cqw`,
              '--duration': `${item.drift?.seconds ?? 60}s`,
              '--delay': `${item.drift?.delay ?? 0}s`,
            })}
          >
            <PixelSprite sprite={item.sprite} />
          </div>
        ),
      )}

      {ground.map((item, index) => {
        switch (item.kind) {
          case 'decor':
          case 'signpost':
            return (
              <div key={index} className="stage-item" style={place(item)}>
                <PixelSprite sprite={item.sprite} />
              </div>
            );
          case 'flower':
            return (
              <div
                key={index}
                className="stage-item ambient-sway"
                style={withVars(place(item), { '--delay': `${item.delay}s` })}
              >
                <PixelSprite sprite={item.sprite} />
              </div>
            );
          case 'object': {
            // On a small screen the object is scenery: same art, no link.
            if (!interactive) {
              return (
                <div key={index} className="stage-item" style={place(item)}>
                  <PixelSprite sprite={item.sprite} />
                </div>
              );
            }
            const destination = getDestination(item.destination);
            return (
              <DestinationLink
                key={index}
                destination={destination}
                className="stage-item scene-link"
                style={place(item)}
              >
                <PixelSprite sprite={item.sprite} className="scene-link-sprite" />
                <span className="scene-label">{destination.label}</span>
              </DestinationLink>
            );
          }
        }
      })}

      {interactive && planks.map((plank) => {
        const destination = getDestination(plank.destination);
        const anchor = `${(signpostCenterX / SCENE_WIDTH) * 100}%`;
        return (
          <DestinationLink
            key={plank.destination}
            destination={destination}
            className="scene-plank"
            style={{
              top: `${(plank.y / SCENE_HEIGHT) * 100}%`,
              ...(plank.side === 'right'
                ? { left: anchor }
                : { right: `calc(100% - ${anchor})` }),
            }}
          >
            {destination.label}
          </DestinationLink>
        );
      })}
    </div>
  );
}
