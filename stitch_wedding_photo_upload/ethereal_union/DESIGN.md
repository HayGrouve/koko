# Design System Strategy: The Editorial Romance

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Curated Keepsake."** 

We are moving away from the rigid, modular feel of traditional web grids to create a digital experience that feels like a high-end, tactile wedding invitation or a bespoke editorial spread in a luxury bridal magazine. The goal is to evoke emotion through **Intentional Asymmetry** and **Tonal Depth**. By utilizing generous whitespace (`spacing.24`) and overlapping elements, we create a sense of breath and movement. This system rejects the "boxed-in" nature of the web, opting instead for a fluid, layered composition where content feels "placed" rather than "slotted."

## 2. Colors & Surface Philosophy
The palette is a sophisticated interplay of warm neutrals and muted romantic tones. We use color not just for decoration, but as a structural tool to define hierarchy without the need for harsh lines.

*   **Primary (`#7e525c` - Dusty Rose):** Reserved for moments of high emotional impact—CTAs, active states, and key flourishes.
*   **Secondary & Tertiary (`#695d46`, `#7d562d` - Champagne/Bronze):** Used for sophisticated accents and metadata.
*   **Neutral Surfaces (`#fbf9f5` - Cream):** The foundation of the system.

### The "No-Line" Rule
Traditional 1px solid borders are strictly prohibited for sectioning. To separate content, designers must use **Background Color Shifts**. For example, a section using `surface_container_low` should sit directly against the `background` (`#fbf9f5`). This creates a soft, "dipped" effect that feels intentional and high-end.

### Surface Hierarchy & Nesting
Treat the UI as a series of stacked fine papers. Use the tiers to create natural depth:
*   **Level 0 (Base):** `surface`
*   **Level 1 (Sectioning):** `surface_container_low`
*   **Level 2 (Interactive Elements/Cards):** `surface_container_lowest` (Pure white) to provide a subtle "pop" against the cream background.

### Signature Textures & Glassmorphism
To elevate the "celebratory" feel, use **Glassmorphism** for floating navigation or overlay modals. Use `surface` at 70% opacity with a `20px` backdrop-blur. This allows the warmth of the underlying photography and "Dusty Rose" accents to bleed through, softening the interface.

## 3. Typography
The typographic pairing is a conversation between heritage and modern clarity.

*   **The Display Voice (`notoSerif`):** Use `display-lg` and `headline-lg` to anchor the page. These should often be center-aligned or placed with intentional asymmetry to break the vertical axis of the grid.
*   **The Narrative Voice (`manrope`):** All functional text, labels, and long-form body copy use the sans-serif `manrope`. This ensures that while the headers feel romantic, the actual information (dates, RSVPs, locations) remains highly legible and modern.
*   **Hierarchy Note:** Use `title-sm` in all-caps with increased letter-spacing for category labels to add an editorial, "Vogue-style" touch.

## 4. Elevation & Depth
We define space through light and layering, never through heavy shadows.

*   **The Layering Principle:** Depth is achieved by "stacking." A `primary_container` card should sit on a `surface` background. The slight shift in hue provides all the "elevation" needed.
*   **Ambient Shadows:** If a floating element (like a mobile navigation bar) requires a shadow, use the `on_surface` color at 4% opacity with a `32px` blur and `8px` Y-offset. It should feel like a soft glow, not a drop shadow.
*   **The "Ghost Border" Fallback:** Where a container needs a "delicate border" (as requested), use `outline_variant` at **15% opacity**. It should be a whisper of a line, barely visible, serving only to catch the eye's edge.

## 5. Components

### Buttons
*   **Primary:** Filled with `primary` (`#7e525c`), text in `on_primary`. Use `roundedness.md` (0.375rem). No shadows.
*   **Secondary:** Ghost style. Use the "Ghost Border" (outline-variant at 20%) with `secondary` text.
*   **Tertiary:** Text-only in `primary`, using `label-md` for a sophisticated, understated action.

### Cards & Lists
*   **Prohibition:** No divider lines between list items. Use `spacing.4` to `spacing.6` as a vertical buffer.
*   **Card Style:** Use `surface_container_lowest` with a `0.25rem` radius. If the card contains an image, let the image bleed to the edges of the top and sides, maintaining a "scrapbook" aesthetic.

### Input Fields
*   **Styling:** Underline-only or subtle "Ghost Border." Use `surface_container_highest` for the background fill to make the input area feel "sunken" and tactile.
*   **States:** On focus, transition the border-bottom to `primary` (`#7e525c`).

### Signature Component: The "Memory Tile"
A bespoke component for wedding galleries or stories. An asymmetrical layout combining an image, a `display-sm` serif headline, and a `body-sm` caption, utilizing `spacing.10` of internal padding to create an "exhibition" feel.

## 6. Do's and Don'ts

### Do
*   **Do** embrace "Wasted Space." Large margins (`spacing.20`+) are luxury.
*   **Do** overlap elements. An image slightly overlapping a text container creates a high-end, custom-coded feel.
*   **Do** use `primary_fixed_dim` for subtle background washes behind text to improve readability while maintaining the rose tone.

### Don't
*   **Don't** use 100% black. Always use `on_surface` (`#1b1c1a`) for a softer, more organic look.
*   **Don't** use standard "Full" roundedness for buttons; keep them slightly squared (`md`) to maintain a "stationery" feel.
*   **Don't** use sharp, fast transitions. Use 300ms "Ease-in-out" for all hover states to mimic the slow, romantic pace of the theme.