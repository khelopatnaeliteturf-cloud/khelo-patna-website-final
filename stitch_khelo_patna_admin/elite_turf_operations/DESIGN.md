---
name: Elite Turf Operations
colors:
  surface: '#111417'
  surface-dim: '#111417'
  surface-bright: '#37393e'
  surface-container-lowest: '#0b0e12'
  surface-container-low: '#191c20'
  surface-container: '#1d2024'
  surface-container-high: '#272a2e'
  surface-container-highest: '#323539'
  on-surface: '#e1e2e8'
  on-surface-variant: '#b9cbb9'
  inverse-surface: '#e1e2e8'
  inverse-on-surface: '#2e3135'
  outline: '#849585'
  outline-variant: '#3b4b3d'
  surface-tint: '#00e479'
  primary: '#f1ffef'
  on-primary: '#003919'
  primary-container: '#00ff88'
  on-primary-container: '#007139'
  inverse-primary: '#006d37'
  secondary: '#97deff'
  on-secondary: '#003546'
  secondary-container: '#00c8fe'
  on-secondary-container: '#005068'
  tertiary: '#fffaf8'
  on-tertiary: '#3a3000'
  tertiary-container: '#ffdd4f'
  on-tertiary-container: '#746100'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#60ff99'
  primary-fixed-dim: '#00e479'
  on-primary-fixed: '#00210c'
  on-primary-fixed-variant: '#005228'
  secondary-fixed: '#bee9ff'
  secondary-fixed-dim: '#68d3ff'
  on-secondary-fixed: '#001f2a'
  on-secondary-fixed-variant: '#004d64'
  tertiary-fixed: '#ffe16d'
  tertiary-fixed-dim: '#e9c400'
  on-tertiary-fixed: '#221b00'
  on-tertiary-fixed-variant: '#544600'
  background: '#111417'
  on-background: '#e1e2e8'
  surface-variant: '#323539'
typography:
  h1:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '800'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h1-mobile:
    fontFamily: Montserrat
    fontSize: 26px
    fontWeight: '800'
    lineHeight: '1.2'
  h2:
    fontFamily: Montserrat
    fontSize: 20px
    fontWeight: '700'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  metric-xl:
    fontFamily: Space Grotesk
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  metric-md:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.2'
  label-caps:
    fontFamily: Space Grotesk
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.1em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-padding: 20px
  element-gap: 12px
---

## Brand & Style

The design system is engineered for **KheloPatna Elite Turf**, focusing on a high-performance admin and staff experience. The brand personality is authoritative, energetic, and futuristic, mirroring the premium nature of the athletic facility. The UI must evoke a sense of "mission control" efficiency—fast, responsive, and visually striking.

The aesthetic utilizes **Ultra-Sleek Glassmorphism** set against a deep void. High-performance metrics are prioritized through technical typography and glowing neon status indicators. Visual depth is achieved through layered translucency rather than traditional shadows, creating a sophisticated "heads-up display" (HUD) feel suitable for high-intensity facility management.

## Colors

This design system operates exclusively in **Dark Mode**. 

- **Surface Layer:** The foundational background is `Deep Space Void (#040609)`, providing maximum contrast for neon accents.
- **Action Accents:** `Neon Emerald` and `Cyan Electric` are used for primary interactions, progress indicators, and active states. 
- **Urgency & Highlights:** `Accent Gold` is reserved for critical alerts, VIP bookings, or high-priority maintenance tasks.
- **Semantic Badging:** 
    - `Dark Navy` and `Dark Indigo` are used for internal staff roles and operator badges.
    - `Deep Emerald` is used for "Completed" or "Paid" action tags to provide a more grounded alternative to the high-vibrancy primary emerald.
- **Glass Surfaces:** Containers use a semi-transparent white (alpha 5-10%) or primary-tinted transparent fill to create the frosted effect.

## Typography

The typographic hierarchy is split into three distinct functional roles:

1.  **Headlines (Montserrat):** Used for screen titles and major section headers. The ExtraBold weight ensures strong brand presence even against complex glass backgrounds.
2.  **UI & Body (Inter):** The workhorse font for all administrative text, form labels, and descriptions. It provides maximum legibility for rapid data scanning.
3.  **Data & Metrics (Space Grotesk):** Applied to all numerical data, revenue figures, and time slots. Its geometric, technical character reinforces the high-performance operational theme.

All caps should be used sparingly for `label-caps` to denote metadata or status headers above metrics.

## Layout & Spacing

This design system uses a **fluid mobile-first grid** with a focus on high-density data presentation.

- **Margins:** Screens utilize a 20px side margin to ensure content remains clear of the device bezel while maximizing screen real estate.
- **Rhythm:** An 8px linear scale drives spacing, though 4px "micro-steps" are permitted for tight component internals (like icon-to-text relationships).
- **Stacking:** Vertically, components should be grouped using 12px or 16px gaps to create clear visual associations between related Turf bookings or staff logs.
- **Touch Targets:** All interactive elements must maintain a minimum 44px height for reliable operation in high-activity environments.

## Elevation & Depth

Depth is communicated through **Glassmorphism and Glow**, rather than traditional drop shadows.

- **Surfaces:** Use `backdrop-filter: blur(20px)` combined with a subtle `rgba(255, 255, 255, 0.05)` fill.
- **Borders:** Every glass container must have a 1px "Inner Glow" border. For active or high-priority cards, use a linear gradient border from `Neon Emerald` to `Cyan Electric` at 30% opacity.
- **Z-Axis Hierarchy:**
    - **Level 0 (Base):** Deep Space Void background.
    - **Level 1 (Cards):** Standard glass containers for turf schedules and lists.
    - **Level 2 (Modals/Overlays):** Increased blur (40px) and a slightly brighter border to distinguish from the background content.
- **Glowing Elements:** Status indicators and active buttons use an outer "bloom" effect (0px blur, 12px spread) using their respective accent color at 20% opacity.

## Shapes

The shape language is "Sophisticated Geometric." 

- **Standard Containers:** Use 16px (`rounded-lg`) corners to balance the technical feel with modern mobile aesthetics.
- **Buttons & Pills:** Use full `32px` or `999px` (Pill-shaped) rounding for status badges and primary actions to make them distinct from the structured data cards.
- **Input Fields:** Use 12px rounding to maintain a professional, sturdy appearance.

## Components

- **Glass Cards:** The primary layout unit. Features a subtle 1px top-down white-to-transparent border to simulate a light source from above.
- **Haptic Buttons:** Primary buttons use a solid `Neon Emerald` to `Cyan Electric` gradient. They should trigger a medium-impact haptic on press.
- **Glowing Pills:** Status indicators (e.g., "LIVE", "BOOKED", "MAINTENANCE") use a low-opacity background of the status color with a 100% opacity 2px solid border and a matching color text.
- **Real-time Indicators:** Use a pulsing 8px dot next to "Live" status labels.
- **Input Fields:** Transparent backgrounds with a 1px `Cyan Electric` bottom border or subtle glass fill. Focus states should trigger a subtle emerald glow around the entire field.
- **Operator Badges:** Utilize the `Dark Navy` or `Dark Indigo` backgrounds with white `Space Grotesk` text to differentiate staff identities from turf status.
- **Action Tags:** Small, semi-translucent labels used for secondary metadata (e.g., "Full Payment", "VIP") using the `Deep Emerald` or `Accent Gold` palettes.