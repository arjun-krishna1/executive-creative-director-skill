---
name: update-figma-workflow
description: Update the Figma from the JSON output through the local JSON-driven workflow. Use when editing brand-guidelines-example.json, changing mapped copy, colors, or typography tokens, previewing changes, or applying updates into the connected Figma document.
---

# Update Figma Workflow

Use this skill to update `Brand Guidelines Figma` through the JSON workflow instead of making ad hoc manual edits.

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

1. Open `Brand Guidelines Figma` in Figma Desktop.
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

1. text
2. typography
3. colors

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
"brand_name": "Brand Guidelines Figma: example"
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

## Schema Note

`references/output-schema.json` includes `style_direction`, but the current live workflow file `brand-guidelines-example.json` is optimized for the mapped Figma update process and does not currently require or apply `style_direction`.
