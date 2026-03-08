# Figma Bridge: brand-system.json to brand-figma.json

This file defines every transformation rule for converting the 5-color brand system output into the 12-swatch Figma-ready JSON. Follow these rules exactly in Phase 4.5.

---

## Hex Format Rules

All hex values in the Figma JSON must be:
- **Uppercase** (e.g. `EEF3FF`, not `eef3ff`)
- **6 characters** (no shorthand)
- **No `#` prefix** (strip it if present in brand-system.json)

---

## Color Blend Formula

To blend X% of color A into color B:

```
R = round(B_R + (A_R - B_R) * X / 100)
G = round(B_G + (A_G - B_G) * X / 100)
B = round(B_B + (A_B - B_B) * X / 100)
```

Convert back to hex. Uppercase. No `#`.

To darken by X%: blend X% of black (000000) into the color.
To lighten by X%: blend X% of white (FFFFFF) into the color.
To desaturate: convert to HSL, reduce S by the specified amount, convert back.

---

## Palette Expansion (5 colors to 12 swatches)

### Primary Palette (6 swatches)

| Slot | Source | Derivation |
|------|--------|------------|
| 0 | `background` | Direct (also = `primary` in Figma JSON) |
| 1 | `primary` + `background` | Blend 15% of primary into background |
| 2 | `text` | Direct (darkest anchor) |
| 3 | `primary` + `text` | Midpoint blend (50%) -- utility color for secondary text, borders |
| 4 | `primary` + `background` | Blend 40% of primary into background -- light supporting swatch |
| 5 | `primary` + `text` | Blend 60% of primary into text -- dark emphasis |

### Secondary Palette (3 swatches)

| Slot | Source | Derivation |
|------|--------|------------|
| 0 | `secondary` | Direct |
| 1 | `secondary` | Darken 25% (blend 25% black) |
| 2 | `secondary` + `accent` | Desaturated midpoint or lighter tint |

### Tertiary Palette (3 swatches)

| Slot | Source | Derivation |
|------|--------|------------|
| 0 | `accent` | Muted complement -- desaturate and lighten |
| 1 | `accent` | Direct |
| 2 | `accent` + `background` | Blend 35% of accent into background -- soft pastel |

### Consistency Rules (MUST pass)

These 5 rules are enforced by `validateSource()` in the Figma workflow script (`scripts/brand-guidelines-example-workflow.mjs:550-554`). The palette expansion table above already satisfies them by construction, but verify explicitly:

1. `primary_palette[0]` == `primary` (in Figma JSON, primary = background)
2. `primary_palette[0]` == `background`
3. `primary_palette[2]` == `text`
4. `secondary_palette[0]` == `secondary`
5. `tertiary_palette[1]` == `accent`

---

## Typography Token Mapping

Map brand-system.json typography fields to the 6 Figma tokens. Sizes are fixed by the Figma template layout, not derived from scale_ratio.

| Token | Family | Style | Size | Line Height | Tracking |
|-------|--------|-------|------|-------------|----------|
| logo_primary | primary_font | heading_weight | 240 | 85% | -2% |
| page_hero | primary_font | heading_weight | 240 | 85% | -2% |
| longform_body | primary_font | body_weight | 64 | 95% | -1% |
| head_wordmark | secondary_font | SemiBold (or heading_weight if lighter) | 19 | 90% | 3% |
| nav_label | secondary_font | body_weight | 14 | 120% | -2% |
| footer_meta | secondary_font | body_weight + " Italic" (fallback: body_weight) | 14 | 90% | -2% |

Notes:
- "body_weight + Italic" means e.g. "Medium Italic" or "Regular Italic". If the font does not have an italic variant, use body_weight alone
- For head_wordmark: use "SemiBold" if heading_weight is heavier (Bold, Black). If heading_weight is lighter (Light, Regular, Medium), use heading_weight instead

---

## Text Content Mapping

| Figma Field | Source | Rule |
|-------------|--------|------|
| text.logo_primary | brand_name | Lowercase (or apply heading_style from brand-system.json) |
| text.page_heroes.logo | Static | "Logo" |
| text.page_heroes.typography | Static | "Typography" |
| text.page_heroes.color | voice.sample_headline | Use headline if <=20 chars, else "Palette" |
| text.head_wordmark_standard | brand_name | As-is or with period appended |
| text.head_wordmark_principles | brand_name | Same as standard |
| text.footer_presentation_title | brand_name | "[Brand Name] Brand Guidelines" |
| text.footer_copyright | Generated | "(c) [current year]" |
| text.footer_section_labels | Static | `{"principles":"Principles","logo":"Logo","typography":"Typography","color":"Color"}` |
| text.color_intro | AI-generated | 1-2 sentences describing the palette philosophy, drawn from style_direction and tone_words |

---

## Validation Checklist

### Layer 1: Structural (hard fail -- must all pass)

1. `brand_name` is non-empty string
2. `colors` object exists
3. `typography` object exists
4. `text` object exists
5. All hex values: uppercase, 6 chars, no `#`
6. `primary_palette` has exactly 6 entries
7. `secondary_palette` has exactly 3 entries
8. `tertiary_palette` has exactly 3 entries
9. `primary` == `primary_palette[0]`
10. `background` == `primary_palette[0]`
11. `text` == `primary_palette[2]`
12. `secondary` == `secondary_palette[0]`
13. `accent` == `tertiary_palette[1]`
14. All 6 typography tokens have all 5 required fields (family, style, font_size, line_height_percent, tracking_percent)
15. All `font_size` values are positive numbers
16. `text.logo_primary` is non-empty string
17. `text.color_intro` is non-empty string

### Layer 2: Semantic (warn and fix)

1. **Font consistency** -- logo_primary and page_hero use primary_font; head_wordmark, nav_label, and footer_meta use secondary_font
2. **Palette contrast** -- text color on background color >= 4.5:1 contrast ratio (WCAG AA)
3. **No duplicate adjacent colors** in any palette
4. **Primary palette progression** -- slot 0 is lightest, slot 2 is darkest (by luminance)
5. **Text length** -- logo_primary <= 20 chars for hero layout fit

### Validation Display Format

```
FIGMA HANDOFF VALIDATION

Structural: 17/17 passed
Semantic: 5/5 passed

Palette consistency:
  primary (EEF3FF) = primary_palette[0]    OK
  background (EEF3FF) = primary_palette[0]  OK
  text (20304A) = primary_palette[2]        OK
  secondary (D8C3AF) = secondary_palette[0] OK
  accent (C56F52) = tertiary_palette[1]     OK

Typography tokens: 6/6 complete
Text fields: all populated

Saved: brand/brand-figma.json
Copied: scripts/brand-guidelines-example.json
```

---

## Worked Example

### Input: brand-system.json

```json
{
  "brand_name": "Velour & Co",
  "colors": {
    "primary": "#4A6FA5",
    "secondary": "#D8C3AF",
    "accent": "#C56F52",
    "background": "#EEF3FF",
    "text": "#20304A",
    "dark_theme": {
      "background": "#1A1F2E",
      "text": "#E8ECF4",
      "accent": "#D4836A"
    }
  },
  "typography": {
    "primary_font": "Poppins",
    "secondary_font": "Instrument Sans",
    "heading_weight": "Medium",
    "body_weight": "Medium",
    "heading_style": "sentence-case",
    "scale_ratio": 1.333
  },
  "voice": {
    "tone_words": ["warm", "considered", "inviting"],
    "sample_headline": "Palette Demo"
  },
  "style_direction": "Warm minimalism with natural textures and soft contrast"
}
```

### Transformation Steps

**1. Strip `#`, uppercase all hex values:**
- primary: 4A6FA5
- secondary: D8C3AF
- accent: C56F52
- background: EEF3FF
- text: 20304A

**2. Expand primary palette (6 swatches):**

| Slot | Derivation | Calculation | Result |
|------|------------|-------------|--------|
| 0 | background (direct) | -- | EEF3FF |
| 1 | Blend 15% of primary (4A6FA5) into background (EEF3FF) | R=round(238+(74-238)*0.15)=213, G=round(243+(111-243)*0.15)=223, B=round(255+(165-255)*0.15)=241 | D5DFF1 |
| 2 | text (direct) | -- | 20304A |
| 3 | 50% blend primary + text | R=round((74+32)/2)=53, G=round((111+48)/2)=80, B=round((165+74)/2)=120 | 355078 |
| 4 | Blend 40% of primary into background | R=round(238+(74-238)*0.40)=172, G=round(243+(111-243)*0.40)=190, B=round(255+(165-255)*0.40)=219 | ACBEDB |
| 5 | Blend 60% of primary into text | R=round(32+(74-32)*0.60)=57, G=round(48+(111-48)*0.60)=86, B=round(74+(165-74)*0.60)=129 | 395681 |

**3. Expand secondary palette (3 swatches):**

| Slot | Derivation | Result |
|------|------------|--------|
| 0 | secondary (direct) | D8C3AF |
| 1 | Darken 25% (blend 25% black) | R=round(216*0.75)=162, G=round(195*0.75)=146, B=round(175*0.75)=131 | A29283 |
| 2 | Desaturated midpoint of secondary + accent | Midpoint: R=round((216+197)/2)=207, G=round((195+111)/2)=153, B=round((175+82)/2)=129. Desaturate ~30%: BF9D87 | BF9D87 |

**4. Expand tertiary palette (3 swatches):**

| Slot | Derivation | Result |
|------|------------|--------|
| 0 | Muted complement of accent -- desaturate + lighten | Accent C56F52, desaturate 40%, lighten 20%: ~B89A8E | B89A8E |
| 1 | accent (direct) | C56F52 |
| 2 | Blend 35% of accent into background | R=round(238+(197-238)*0.35)=224, G=round(243+(111-243)*0.35)=197, B=round(255+(82-255)*0.35)=194 | E0C5C2 |

**5. Verify consistency rules:**
- primary_palette[0] (EEF3FF) == primary? primary = 4A6FA5. STOP. In Figma JSON, `primary` is set to `background` value = EEF3FF. OK.
- primary_palette[0] (EEF3FF) == background (EEF3FF). OK.
- primary_palette[2] (20304A) == text (20304A). OK.
- secondary_palette[0] (D8C3AF) == secondary (D8C3AF). OK.
- tertiary_palette[1] (C56F52) == accent (C56F52). OK.

**Important:** In the Figma JSON, the `colors.primary` field is set to the same value as `colors.background` (= primary_palette[0]). This is different from the brand-system.json `primary`. The brand-system.json primary color is used as the SOURCE for blend calculations, but the Figma JSON `primary` key must equal `primary_palette[0]` to pass validation.

**6. Build typography tokens:**

```json
{
  "logo_primary": { "family": "Poppins", "style": "Medium", "font_size": 240, "line_height_percent": 85, "tracking_percent": -2 },
  "page_hero": { "family": "Poppins", "style": "Medium", "font_size": 240, "line_height_percent": 85, "tracking_percent": -2 },
  "longform_body": { "family": "Poppins", "style": "Medium", "font_size": 64, "line_height_percent": 95, "tracking_percent": -1 },
  "head_wordmark": { "family": "Instrument Sans", "style": "SemiBold", "font_size": 19, "line_height_percent": 90, "tracking_percent": 3 },
  "nav_label": { "family": "Instrument Sans", "style": "Medium", "font_size": 14, "line_height_percent": 120, "tracking_percent": -2 },
  "footer_meta": { "family": "Instrument Sans", "style": "Medium Italic", "font_size": 14, "line_height_percent": 90, "tracking_percent": -2 }
}
```

**7. Generate text content:**

```json
{
  "logo_primary": "velour & co",
  "page_heroes": { "logo": "Logo", "typography": "Typography", "color": "Palette Demo" },
  "head_wordmark_standard": "Velour & Co.",
  "head_wordmark_principles": "Velour & Co.",
  "footer_presentation_title": "Velour & Co Brand Guidelines",
  "footer_copyright": "(c) 2026",
  "footer_section_labels": { "principles": "Principles", "logo": "Logo", "typography": "Typography", "color": "Color" },
  "color_intro": "Warm ivory grounds the palette while clay and terracotta accents bring the natural texture and quiet energy that defines Velour's visual identity."
}
```

### Output: brand-figma.json

```json
{
  "brand_name": "Velour & Co",
  "colors": {
    "primary": "EEF3FF",
    "secondary": "D8C3AF",
    "accent": "C56F52",
    "background": "EEF3FF",
    "text": "20304A",
    "primary_palette": ["EEF3FF", "D5DFF1", "20304A", "355078", "ACBEDB", "395681"],
    "secondary_palette": ["D8C3AF", "A29283", "BF9D87"],
    "tertiary_palette": ["B89A8E", "C56F52", "E0C5C2"]
  },
  "typography": {
    "primary_font": "Poppins",
    "secondary_font": "Instrument Sans",
    "heading_weight": "Medium",
    "body_weight": "Medium",
    "tokens": {
      "logo_primary": { "family": "Poppins", "style": "Medium", "font_size": 240, "line_height_percent": 85, "tracking_percent": -2 },
      "page_hero": { "family": "Poppins", "style": "Medium", "font_size": 240, "line_height_percent": 85, "tracking_percent": -2 },
      "longform_body": { "family": "Poppins", "style": "Medium", "font_size": 64, "line_height_percent": 95, "tracking_percent": -1 },
      "head_wordmark": { "family": "Instrument Sans", "style": "SemiBold", "font_size": 19, "line_height_percent": 90, "tracking_percent": 3 },
      "nav_label": { "family": "Instrument Sans", "style": "Medium", "font_size": 14, "line_height_percent": 120, "tracking_percent": -2 },
      "footer_meta": { "family": "Instrument Sans", "style": "Medium Italic", "font_size": 14, "line_height_percent": 90, "tracking_percent": -2 }
    }
  },
  "text": {
    "logo_primary": "velour & co",
    "page_heroes": { "logo": "Logo", "typography": "Typography", "color": "Palette Demo" },
    "head_wordmark_standard": "Velour & Co.",
    "head_wordmark_principles": "Velour & Co.",
    "footer_presentation_title": "Velour & Co Brand Guidelines",
    "footer_copyright": "(c) 2026",
    "footer_section_labels": { "principles": "Principles", "logo": "Logo", "typography": "Typography", "color": "Color" },
    "color_intro": "Warm ivory grounds the palette while clay and terracotta accents bring the natural texture and quiet energy that defines Velour's visual identity."
  }
}
```
