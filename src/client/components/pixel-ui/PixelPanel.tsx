import type { ComponentPropsWithoutRef, ElementType } from 'react';

type PixelPanelProps<T extends ElementType> = {
  // The HTML element to render. Pick the one that fits the content (a
  // <section> for a titled region, a <nav> for navigation) instead of using
  // <div> everywhere; the look is the same, the meaning for assistive
  // technology is not.
  as?: T;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className'>;

// A bordered "pixel" surface: flat paper colour, a stepped (notched-corner)
// outline and a hard shadow. The look is in the .pixel-panel class in
// styles.css, so it follows the theme's colours.
export function PixelPanel<T extends ElementType = 'div'>({
  as,
  className,
  ...rest
}: PixelPanelProps<T>) {
  const Component: ElementType = as ?? 'div';
  return <Component className={`pixel-panel ${className ?? ''}`} {...rest} />;
}
