# Blending Guide

When a user wants to mix elements from multiple perspectives, use these rules to avoid combinations that clash or undermine each other.

## Freely Swappable

These fields are independent choices. Any combination works without side effects.

- **Colors** -- any palette can pair with any typography or layout approach
- **Photography style, subjects, and mood** -- visual content is independent of structural choices
- **Voice tone_words and sample_headline** -- brand voice is separate from visual execution
- **brand_name** -- always stays the same across all perspectives
- **style_direction** -- rewrite to reflect the blended result

## Creates Dependencies

Swapping these fields requires checking that the connected elements still work together.

| If you take... | Also check... | Why |
|----------------|---------------|-----|
| Typography (primary_font, heading_weight) | heading_style | Scher's all-caps needs her display type to work. Bierut's serif in all-caps looks like a law firm |
| Spacing density | scale_ratio | Compact spacing with a large scale ratio (1.618) creates visual clashes. Airy spacing with a small ratio (1.25) can feel lifeless |
| Logo form | illustration style/usage | Symbol logos need different illustration approaches than wordmarks. A complex illustration system alongside a detailed symbol creates noise |
| Signature elements | The full aesthetic vision they came from | Signature elements are the most persona-specific field. "Massive scale typography contrasts" is Scher. Putting that in a Bierut palette creates dissonance |
| Illustration style | spacing density | Rich illustration with compact spacing feels cluttered. "None" illustration with airy spacing is Bierut territory |

## Conflict Resolution Rules

When two elements from different perspectives clash:

1. **User's stated preference wins** -- if they said "I want Scher's typography but Bierut's restraint," honor the intent even if it creates tension. Tension can be productive
2. **When in doubt, keep the element with its home perspective** -- a Scher font with Scher's heading_style will always be more coherent than a Scher font with Bierut's heading_style
3. **Re-validate the blended output** -- run the quality gate checks against the final blend. Blending can introduce failures that weren't present in individual perspectives

## Process

1. User selects a base perspective
2. User identifies specific elements to swap from other perspectives
3. Check the dependency table for conflicts
4. Resolve conflicts using the rules above
5. Rewrite style_direction to reflect the blended result
6. Validate the final JSON against the quality gate
