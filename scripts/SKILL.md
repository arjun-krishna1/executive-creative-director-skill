---
name: update-figma-workflow
description: Update the Figma from the JSON output through the local JSON-driven workflow. Use when editing brand-guidelines-example.json, changing mapped copy, colors, or typography tokens, previewing changes, or applying updates into the connected Figma document.
---

# Update Figma Workflow

Use this skill to update `Brand Guidelines Figma (Copy)` through the JSON workflow instead of making ad hoc manual edits.

## What This Controls

This workflow updates the live Figma file from:

- `brand-guidelines-example.json`

It uses these generated support files:

- `brand-guidelines-example.inventory.json`
- `brand-guidelines-example.field-map.json`
- `scripts/brand-guidelines-example-workflow.mjs`

Edit the JSON source of truth.

Do not hand-edit the inventory or field map unless you are deliberately remapping nodes.

## Quick Start

1. Open `Brand Guidelines Figma (Copy)` in Figma Desktop.
2. Start the Figma bridge in Safe Mode if it is not already running:

```bash
cd /Users/arjun/figma-cli
node src/index.js connect --safe
```

3. In Figma Desktop, run `Plugins -> Development -> FigCli`.
4. From the project root, edit `brand-guidelines-example.json`.
5. Preview the changes:

```bash
cd /Users/arjun/executive-creative-director-skill
node scripts/brand-guidelines-example-workflow.mjs preview
```

6. Apply the changes:

```bash
node scripts/brand-guidelines-example-workflow.mjs apply
```

7. Re-run preview. A clean run should show `0` pending text, typography, and color targets.

## Commands

### `inventory`

Use this when the Figma file structure changed and node IDs may need to be refreshed.

Examples:

```bash
node scripts/brand-guidelines-example-workflow.mjs inventory
```

This regenerates:

- `brand-guidelines-example.inventory.json`
- `brand-guidelines-example.field-map.json`

Run this after:

- duplicating or deleting mapped frames
- replacing major sections of the Figma file
- remapping the workflow to different nodes

### `preview`

Use this before every apply.

Examples:

```bash
node scripts/brand-guidelines-example-workflow.mjs preview
```

This reports:

- how many text targets would change
- how many typography targets would change
- how many color targets would change
- the key values currently being driven from JSON

### `apply`

Use this to push the JSON values into the live Figma file.

Examples:

```bash
node scripts/brand-guidelines-example-workflow.mjs apply
```

This applies changes in a fixed order:

1. font_replacement -- replaces all non-brand fonts across the entire document
2. text -- updates mapped text nodes (structural + content)
3. typography -- applies typography tokens
4. colors -- sets palette swatches
5. color_map_global -- replaces all old template fill/stroke colors document-wide

After a successful apply, the script refreshes the inventory and field map automatically.

## What To Edit

Edit:

- `brand-guidelines-example.json`

Usually do not edit:

- `brand-guidelines-example.inventory.json`
- `brand-guidelines-example.field-map.json`

Only regenerate those with `inventory`.

## Source JSON Field Guide

### `brand_name`

Purpose:

- Human-readable document name for the workflow.

What to put here:

- The Figma file name.

Example:

```json
"brand_name": "Brand Guidelines Figma (Copy)"
```

### `colors`

All color values must be six-character hex strings with no `#`.

Good:

```json
"primary": "EEF3FF"
```

Bad:

```json
"primary": "#EEF3FF"
```

#### `colors.primary`

Purpose:

- Canonical primary brand color.

Rule:

- Must equal `colors.primary_palette[0]`.

#### `colors.secondary`

Purpose:

- Canonical secondary brand color.

Rule:

- Must equal `colors.secondary_palette[0]`.

#### `colors.accent`

Purpose:

- Canonical accent color.

Rule:

- Must equal `colors.tertiary_palette[1]`.

#### `colors.background`

Purpose:

- Canonical page background color.

Rule:

- Must equal `colors.primary_palette[0]`.

#### `colors.text`

Purpose:

- Canonical text color.

Rule:

- Must equal `colors.primary_palette[2]`.

#### `colors.primary_palette`

Purpose:

- Six mapped primary swatches on the `5. Color` page.

Rule:

- Must contain exactly 6 values.
- Order matters.

This workflow maps these positions in order:

1. swatch 1
2. swatch 2
3. swatch 3
4. swatch 4
5. swatch 5
6. swatch 6

#### `colors.secondary_palette`

Purpose:

- Three mapped secondary swatches on the `5. Color` page.

Rule:

- Must contain exactly 3 values.
- Order matters.

#### `colors.tertiary_palette`

Purpose:

- Three mapped tertiary swatches on the `5. Color` page.

Rule:

- Must contain exactly 3 values.
- Order matters.

### `typography`

#### `typography.primary_font`

Purpose:

- Human-readable summary of the main font system.

What to put here:

- The primary family name, such as `Poppins` or `EB Garamond`.

Note:

- The actual applied values come from `typography.tokens.*`.

#### `typography.secondary_font`

Purpose:

- Human-readable summary of the supporting font system.

#### `typography.heading_weight`

Purpose:

- Human-readable summary of the main heading weight.

#### `typography.body_weight`

Purpose:

- Human-readable summary of the main body weight.

### `typography.tokens`

These are the actual applied typography settings.

Each token must include:

- `family`
- `style`
- `font_size`
- `line_height_percent`
- `tracking_percent`

Use exact Figma font style names.

Examples:

- `Regular`
- `Medium`
- `SemiBold`
- `Medium Italic`

#### `typography.tokens.logo_primary`

Controls:

- The main large hero text on `1. Principles`.

#### `typography.tokens.page_hero`

Controls:

- The large hero title on:
  - `2. Logo`
  - `4. Typography`
  - `5. Color`

#### `typography.tokens.longform_body`

Controls:

- The mapped paragraph body on `5. Color`.

#### `typography.tokens.head_wordmark`

Controls:

- Repeated header wordmark instances across mapped pages.

#### `typography.tokens.nav_label`

Controls:

- Repeated nav labels and nav values, such as `Page Type:`.

#### `typography.tokens.footer_meta`

Controls:

- Repeated footer text blocks.

### `text`

These are the mapped copy values.

#### `text.logo_primary`

Controls:

- The main hero text on `1. Principles`.

#### `text.page_heroes.logo`

Controls:

- The large hero title on `2. Logo`.

#### `text.page_heroes.typography`

Controls:

- The large hero title on `4. Typography`.

#### `text.page_heroes.color`

Controls:

- The large hero title on `5. Color`.

#### `text.head_wordmark_standard`

Controls:

- Repeated standard header wordmark text, usually `Velour & Co.`

#### `text.head_wordmark_principles`

Controls:

- Repeated special header wordmark text on `1. Principles`.

#### `text.footer_presentation_title`

Controls:

- Repeated footer presentation text across mapped pages.

#### `text.footer_copyright`

Controls:

- Repeated footer copyright text.

#### `text.footer_section_labels.principles`

Controls:

- Footer section labels that should read `Principles`.

#### `text.footer_section_labels.logo`

Controls:

- Footer section labels that should read `Logo`.

#### `text.footer_section_labels.typography`

Controls:

- Footer section labels that should read `Typography`.

#### `text.footer_section_labels.color`

Controls:

- Footer section labels that should read `Color`.

#### `text.color_intro`

Controls:

- The mapped intro paragraph on `5. Color`.

#### Extended Content Text Fields

These map to specific node IDs in the Figma template. They are applied alongside the structural text groups during `apply`.

| Field | Controls |
|-------|----------|
| `text.principles_mission` | Mission statement on `1. Principles` |
| `text.principles_intro` | Principles intro paragraph |
| `text.principles_typeface_description` | Typeface description on Principles |
| `text.logo_tagline` | Tagline text on `2. Logo` (2 nodes) |
| `text.logo_body` | Logo usage body copy (2 nodes) |
| `text.logo_color_usage` | Logo color usage guidelines |
| `text.logo_clearspace` | Logo clear space rules |
| `text.logo_scaling` | Logo scaling guidelines |
| `text.grid_description` | Grid system description on `3. Grid System` |
| `text.typography_primary_description` | Primary font description on `4. Typography` |
| `text.typography_secondary_description` | Secondary font description |
| `text.typography_about` | Font origin/history paragraph |
| `text.typography_specimen_hero` | Large specimen display name |
| `text.typography_specimen_primary_name` | Specimen names on Principles (2 nodes) |
| `text.typography_scale_font_label` | Font name in the type scale table (9 nodes) |
| `text.typography_designer_credit` | Designer credit blocks (4 nodes) |
| `text.typography_specimen_brand_line1` | First line of brand name on specimen card |
| `text.typography_specimen_brand_line2` | Second line of brand name on specimen card |
| `text.typography_specimen_font_short` | Short font name on specimen card |
| `text.typography_specimen_font_full` | Full font name on specimen card |
| `text.typography_specimen_ampersand` | Ampersand on specimen card |
| `text.typography_specimen_word1` | First personality word on specimen card |
| `text.typography_specimen_word2` | Second personality word on specimen card |
| `text.typography_specimen_official` | Official typeface declaration |
| `text.typography_font_label_parenthetical` | Parenthetical font label (4 nodes) |
| `text.image_silhouette_description` | Silhouette imagery description on `6. Image Library` |
| `text.image_portrait_description` | Portrait imagery description |
| `text.photo_credit` | Photo credits (8 nodes) |

### `font_replacement`

Maps old template font families to the brand's font families. During `apply`, every text node using an old font is replaced with the mapped brand font, matching the closest available weight/style.

Example:

```json
"font_replacement": {
  "EB Garamond": "IBM Plex Serif",
  "Instrument Sans": "IBM Plex Sans",
  "Inter": "IBM Plex Sans",
  "Poppins": "IBM Plex Sans"
}
```

### `color_map`

Maps old template colors to the brand's colors. Applied document-wide during `apply`. All hex values must be six-character uppercase without `#`.

#### `color_map.fill`

Replaces solid fill colors on frames, text, rectangles, vectors, and ellipses.

#### `color_map.stroke`

Replaces solid stroke colors on all node types.

#### `color_map.swatch`

Additional fill replacements applied only to ellipse and rectangle nodes (color swatches and decorative elements).

Example:

```json
"color_map": {
  "fill": {
    "E1E1DF": "0A0A0A",
    "F9F9F9": "141414"
  },
  "stroke": {
    "BAB7B1": "2A2A2A"
  },
  "swatch": {
    "D9D4C5": "FFFFFF"
  }
}
```

## Safe Editing Rules

1. Change `brand-guidelines-example.json` first.
2. Run `preview` before `apply`.
3. Keep array lengths fixed:
   - primary palette: 6
   - secondary palette: 3
   - tertiary palette: 3
4. Keep color values uppercase six-digit hex without `#`.
5. Use exact Figma font family and style names.
6. Do not manually rename or delete mapped Figma nodes unless you plan to re-run `inventory`.
7. If preview shows unexpected counts, stop and inspect the JSON before applying.

## Example Changes

### Change the main hero copy

Update:

```json
"text": {
  "logo_primary": "example demo"
}
```

Then run:

```bash
node scripts/brand-guidelines-example-workflow.mjs preview
node scripts/brand-guidelines-example-workflow.mjs apply
```

### Change the main hero font

Update:

```json
"logo_primary": {
  "family": "Poppins",
  "style": "Medium",
  "font_size": 240,
  "line_height_percent": 85,
  "tracking_percent": -2
}
```

Then run:

```bash
node scripts/brand-guidelines-example-workflow.mjs preview
node scripts/brand-guidelines-example-workflow.mjs apply
```

### Change the primary palette

Update:

```json
"primary_palette": [
  "EEF3FF",
  "D7E3FF",
  "20304A",
  "7D93C6",
  "C7D3EA",
  "465A86"
]
```

Also keep these aligned:

```json
"primary": "EEF3FF",
"background": "EEF3FF",
"text": "20304A"
```

## Troubleshooting

### Preview says files are missing

Run:

```bash
node scripts/brand-guidelines-example-workflow.mjs inventory
```

### Apply fails with no Figma connection

Check:

1. Figma Desktop is open.
2. The correct file is open.
3. `FigCli` is running in Figma.
4. Safe Mode is connected:

```bash
cd /Users/arjun/figma-cli
node src/index.js connect --safe
```

### Font change fails

Cause:

- The font family or style is not available to Figma.

Fix:

- Use a family/style already present in the file inventory, or install/enable the font in Figma Desktop.

### Preview shows unexpected changes after apply

Run:

```bash
node scripts/brand-guidelines-example-workflow.mjs inventory
node scripts/brand-guidelines-example-workflow.mjs preview
```

The preview should return to `0` pending changes when the JSON and Figma file match.

## Image Generation

After the brand system is finalized (`brand/brand-system.json` saved), generate brand images from the `image_prompts` field using the Gemini API.

### Prerequisites

1. Set `GOOGLE_AI_STUDIO_API_KEY` in `.env` at the project root (or export it).
2. Install Python dependencies:

```bash
pip install -r requirements.txt
```

### Generate Images

```bash
python scripts/generate-brand-images.py
```

This reads `brand/brand-system.json`, extracts the `image_prompts` field (hero_background + showcase_images), and generates images via Google Gemini. Output is saved to `brand/images/`.

Files produced:

- `brand/images/hero-background.png` -- full-bleed background for the Principles page
- `brand/images/{label}.png` -- one file per showcase image
- `brand/images/manifest.json` -- list of generated files with labels and types

### Push Images to Figma

After generating images, push them into the connected Figma file:

```bash
node scripts/brand-guidelines-example-workflow.mjs images
```

This reads `brand/images/manifest.json`, finds the target "Image" frames in the Figma document, and sets image fills from the generated files.

### Regenerate a Single Image

To regenerate just the hero background or a specific showcase image, edit the `image_prompts` in `brand/brand-system.json` and rerun:

```bash
python scripts/generate-brand-images.py
```

All images are regenerated each run. To preserve specific images, move them out of `brand/images/` before running.

## Schema Note

`references/output-schema.json` includes `style_direction` and `image_prompts`, but the current live workflow file `brand-guidelines-example.json` is optimized for the mapped Figma update process and does not currently require or apply `style_direction`. The `image_prompts` field is consumed by `scripts/generate-brand-images.py`, not by the workflow script directly.
