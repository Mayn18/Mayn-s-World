import { useState } from 'react';
import { PixelPanel } from './pixel-ui/PixelPanel';
import { setActiveThemeById } from '../world/activeTheme';
import { themes, type ThemeId } from '../world/themes';

interface ThemeSelectorProps {
  currentThemeId: ThemeId;
}

export function ThemeSelector({ currentThemeId }: ThemeSelectorProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="world-theme-selector">
      <button
        type="button"
        className="pixel-button pixel-button-quiet world-theme-toggle"
        aria-expanded={open}
        aria-controls="world-theme-options"
        onClick={() => setOpen((previous) => !previous)}
      >
        <span>World theme</span>
        <strong>{themes[currentThemeId].name}</strong>
      </button>
      <PixelPanel
        as="section"
        id="world-theme-options"
        className="world-theme-options"
        aria-label="Choose a world theme"
        hidden={!open}
      >
        <ul>
          {Object.values(themes).map((theme) => (
            <li key={theme.id}>
              <button
                type="button"
                className="world-theme-choice"
                aria-pressed={theme.id === currentThemeId}
                onClick={() => setActiveThemeById(theme.id)}
              >
                {theme.name}
              </button>
            </li>
          ))}
        </ul>
      </PixelPanel>
    </div>
  );
}
