# NEXA — Royal Dark Design System

**Status:** Permanent default template until an intentional product-design change replaces it.
**Source:** Supplied NEXA Royal Dark style guide / reference mockup.

## Exact palette

| Token | Hex | Usage |
|---|---|---|
| Royal Gold | `#D4AF37` | Primary accent, borders, secondary button text/outline |
| Bright Gold | `#FFD700` | Gradient highlight, active icon glow, primary button gradient |
| Ivory Text | `#F8F5E9` | Primary body text on dark backgrounds |
| Graphite | `#1A1A1A` | Card / surface background |
| Charcoal | `#2A2A2A` | Secondary surface / input background / borders |
| Deep Black | `#000000` | App background base |
| Success | `#2ECC71` | Success state |
| Info | `#3498DB` | Informational state |
| Warning | `#F5A623` | Warning state |
| Error | `#E74C3C` | Error state |

## Required visual behavior

- App ambiance uses a deep-black-to-graphite gradient rather than a flat black fill.
- Cards use Graphite with a thin Royal Gold border at restrained opacity and 16–20px rounded corners.
- Elevated cards use a faint gold-tinted shadow.
- Inputs use Charcoal; focused inputs use a gold border.
- Primary buttons use the Bright Gold → Royal Gold gradient, dark text, pill geometry and a subtle gold glow.
- Secondary buttons use a dark/transparent fill, gold border and gold text with the same pill geometry.
- Active navigation uses a solid Bright Gold circular icon badge with a dark icon and gold label.
- Inactive icons remain muted gray/ivory outline icons.
- Status colors remain distinct from the brand gold.
- New screens consume `src/theme.ts` and shared Royal Dark primitives instead of inventing independent brand colors.

## Primary navigation

The permanent primary bottom navigation is exactly five destinations:

**Home · Dream Marketplace · AI · Search · Profile**

Money, Zeeza, Yaayz, L.A. and Chat remain available as deep-linkable routes and module surfaces, but are not additional primary bottom-tab destinations.

## Typography direction

- Display/logo/headings: elegant high-contrast serif such as Playfair Display or Cormorant.
- Body/UI: clean sans-serif such as Inter, Poppins or SF Pro.
- Taglines: italic serif with warm ivory/gold and restrained letter spacing.

## Change control

This system is the default NEXA visual language until a deliberate design decision changes it. Product work should extend these tokens rather than fork the palette per module.


## Product architecture boundary
The five-destination navigation shown in the visual reference is a design example only. It does **not** replace NEXA's canonical seven-section product shell. See `docs/design/NEXA_NAVIGATION_ARCHITECTURE.md`.
