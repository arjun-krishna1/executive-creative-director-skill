#!/usr/bin/env python3
"""Generate brand images from image_prompts in brand-system.json using Google Gemini."""

import json
import mimetypes
import os
import sys
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from google import genai
from google.genai import types

BRAND_DIR = Path(__file__).resolve().parent.parent / "brand"
BRAND_SYSTEM_FILE = BRAND_DIR / "brand-system.json"
IMAGES_DIR = BRAND_DIR / "images"

MODEL = "gemini-3.1-flash-image-preview"

ASPECT_RATIOS = {"16:9", "4:3", "1:1", "3:2"}


def save_binary_file(file_path: Path, data: bytes) -> None:
    file_path.write_bytes(data)
    print(f"  Saved: {file_path}")


def build_color_context(colors: dict) -> str:
    """Describe the brand palette in natural language for the image prompt."""
    parts = []
    if colors.get("primary"):
        parts.append(f"primary color #{colors['primary']}")
    if colors.get("accent"):
        parts.append(f"accent color #{colors['accent']}")
    if colors.get("background"):
        parts.append(f"background #{colors['background']}")
    if colors.get("secondary"):
        parts.append(f"secondary #{colors['secondary']}")
    return ", ".join(parts)


def build_generation_prompt(prompt_text: str, brand: dict) -> str:
    """Enrich the image prompt with brand context."""
    color_ctx = build_color_context(brand.get("colors", {}))
    photography = brand.get("photography", {})
    style_direction = brand.get("style_direction", "")

    enriched = prompt_text.strip()

    context_lines = []
    if color_ctx:
        context_lines.append(f"Brand palette: {color_ctx}.")
    if photography.get("mood"):
        context_lines.append(f"Photography mood: {photography['mood']}.")
    if photography.get("style"):
        context_lines.append(f"Photography style: {photography['style']}.")
    if style_direction:
        context_lines.append(f"Overall style direction: {style_direction}.")

    if context_lines:
        enriched += "\n\n" + " ".join(context_lines)

    return enriched


def generate_image(client: genai.Client, prompt_text: str, aspect_ratio: str,
                   negative_prompt: str | None, output_path: Path) -> bool:
    """Generate a single image and save it. Returns True on success."""
    full_prompt = prompt_text
    if negative_prompt:
        full_prompt += f"\n\nDo NOT include: {negative_prompt}"

    contents = [
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=full_prompt)],
        ),
    ]

    ar = aspect_ratio if aspect_ratio in ASPECT_RATIOS else "16:9"

    config = types.GenerateContentConfig(
        thinking_config=types.ThinkingConfig(thinking_level="MINIMAL"),
        image_config=types.ImageConfig(
            aspect_ratio=ar,
            image_size="1K",
            person_generation="DONT_ALLOW",
        ),
        response_modalities=["IMAGE", "TEXT"],
    )

    saved = False
    for chunk in client.models.generate_content_stream(
        model=MODEL,
        contents=contents,
        config=config,
    ):
        if chunk.parts is None:
            continue
        for part in chunk.parts:
            if part.inline_data and part.inline_data.data:
                ext = mimetypes.guess_extension(part.inline_data.mime_type) or ".png"
                final_path = output_path.with_suffix(ext)
                save_binary_file(final_path, part.inline_data.data)
                saved = True
            elif part.text:
                print(f"  Model note: {part.text.strip()}")

    return saved


def main() -> None:
    api_key = os.environ.get("GOOGLE_AI_STUDIO_API_KEY")
    if not api_key:
        print("Error: GOOGLE_AI_STUDIO_API_KEY not set. Add it to .env or export it.", file=sys.stderr)
        sys.exit(1)

    if not BRAND_SYSTEM_FILE.exists():
        print(f"Error: {BRAND_SYSTEM_FILE} not found. Run the brand workflow first.", file=sys.stderr)
        sys.exit(1)

    brand = json.loads(BRAND_SYSTEM_FILE.read_text())

    image_prompts = brand.get("image_prompts")
    if not image_prompts:
        print("Error: No image_prompts found in brand-system.json.", file=sys.stderr)
        print("Run the brand workflow with the updated schema to generate image prompts.", file=sys.stderr)
        sys.exit(1)

    IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    client = genai.Client(api_key=api_key)
    manifest = []

    hero = image_prompts.get("hero_background")
    if hero:
        print("\n[1] Generating hero background...")
        enriched = build_generation_prompt(hero["prompt"], brand)
        output_path = IMAGES_DIR / "hero-background"
        ok = generate_image(
            client,
            enriched,
            hero.get("aspect_ratio", "16:9"),
            hero.get("negative_prompt"),
            output_path,
        )
        if ok:
            manifest.append({"label": "hero-background", "type": "hero_background"})
        else:
            print("  Warning: hero background generation produced no image.")

    showcase = image_prompts.get("showcase_images", [])
    for i, img in enumerate(showcase, start=1):
        label = img.get("label", f"showcase-{i}")
        safe_label = "".join(c if c.isalnum() or c in "-_" else "-" for c in label)
        print(f"\n[{i + 1}] Generating showcase: {label}...")
        enriched = build_generation_prompt(img["prompt"], brand)
        output_path = IMAGES_DIR / safe_label
        ok = generate_image(
            client,
            enriched,
            img.get("aspect_ratio", "4:3"),
            img.get("negative_prompt"),
            output_path,
        )
        if ok:
            manifest.append({"label": safe_label, "type": "showcase"})
        else:
            print(f"  Warning: {label} generation produced no image.")

    manifest_path = IMAGES_DIR / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"\nDone. {len(manifest)} images generated.")
    print(f"Manifest: {manifest_path}")
    print(f"Images:   {IMAGES_DIR}/")


if __name__ == "__main__":
    main()
