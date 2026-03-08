#!/usr/bin/env node

import { execFileSync } from 'child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { basename, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEFAULT_DOCUMENT_NAME = 'Brand Guidelines Figma (Copy)';
const DOCUMENT_NAME = process.env.BRAND_GUIDELINES_DOCUMENT_NAME || DEFAULT_DOCUMENT_NAME;
const SOURCE_FILE = join(__dirname, 'brand-guidelines-example.json');
const INVENTORY_FILE = join(__dirname, 'brand-guidelines-example.inventory.json');
const FIELD_MAP_FILE = join(__dirname, 'brand-guidelines-example.field-map.json');
const DEFAULT_FIGMA_CLI = '/Users/arjun/figma-cli/src/index.js';
const FIGMA_CLI = process.env.FIGMA_CLI_PATH || DEFAULT_FIGMA_CLI;
const FIGMA_REPO_DIR = dirname(dirname(FIGMA_CLI));

const PALETTE_TARGET_IDS = {
  primary: ['2041:168', '2049:173', '2049:188', '2049:201', '2049:214', '2049:227'],
  secondary: ['2049:321', '2049:334', '2049:347'],
  tertiary: ['2049:360', '2049:373', '2049:386']
};

const CONTENT_TARGET_IDS = {
  'text.principles_mission': ['2001:1046'],
  'text.principles_intro': ['2076:398'],
  'text.principles_typeface_description': ['2084:406'],
  'text.logo_tagline': ['2072:264', '2072:279'],
  'text.logo_body': ['2018:637', '2061:504'],
  'text.logo_color_usage': ['2061:448'],
  'text.logo_clearspace': ['2061:416'],
  'text.logo_scaling': ['2017:555'],
  'text.grid_description': ['2051:1376'],
  'text.typography_primary_description': ['2018:1895'],
  'text.typography_secondary_description': ['2018:1841'],
  'text.typography_about': ['2018:1784'],
  'text.typography_specimen_hero': ['2018:1874'],
  'text.typography_specimen_primary_name': ['2084:408', '2084:526'],
  'text.typography_scale_font_label': [
    '2018:1915', '2018:1921', '2018:1927', '2018:1933',
    '2018:1939', '2018:1945', '2018:1951', '2018:1957', '2018:1963'
  ],
  'text.typography_designer_credit': ['2082:741', '2082:734', '2082:723', '2020:193'],
  'text.typography_specimen_brand_line1': ['2021:273'],
  'text.typography_specimen_brand_line2': ['2021:274'],
  'text.typography_specimen_font_short': ['2021:276'],
  'text.typography_specimen_font_full': ['2021:277'],
  'text.typography_specimen_ampersand': ['2021:227'],
  'text.typography_specimen_word1': ['2020:203'],
  'text.typography_specimen_word2': ['2020:204'],
  'text.typography_specimen_official': ['2020:198'],
  'text.typography_font_label_parenthetical': ['2082:740', '2082:733', '2082:723', '2020:192'],
  'text.image_silhouette_description': ['2051:1230'],
  'text.image_portrait_description': ['2051:1164'],
  'text.photo_credit': [
    '2084:495', '2084:523', '2084:686', '2084:689',
    '2084:546', '2084:549', '2084:602', '2084:623'
  ]
};

const FONT_STYLE_MAP = {
  'Regular': 'Regular',
  'Italic': 'Italic',
  'Medium': 'Medium',
  'Medium Italic': 'Medium Italic',
  'SemiBold': 'SemiBold',
  'SemiBold Italic': 'SemiBold Italic',
  'Bold': 'Bold',
  'Bold Italic': 'Bold Italic',
  'ExtraBold': 'Bold',
  'ExtraBold Italic': 'Bold Italic',
  'Light': 'Light',
  'Light Italic': 'Light Italic',
  'Thin': 'Thin',
  'Thin Italic': 'Thin Italic'
};

main();

function main() {
  try {
    const command = process.argv[2] || 'preview';
    if (!['inventory', 'preview', 'apply', 'images'].includes(command)) {
      throw new Error(`Unknown command "${command}". Use: inventory, preview, apply, or images.`);
    }

    ensure(existsSync(SOURCE_FILE), `Missing source-of-truth file: ${SOURCE_FILE}`);
    ensure(existsSync(FIGMA_CLI), `Missing figma-cli entrypoint: ${FIGMA_CLI}`);

    if (command === 'inventory') {
      const inventory = extractInventory();
      const fieldMap = buildFieldMap(inventory);
      writeJson(INVENTORY_FILE, inventory);
      writeJson(FIELD_MAP_FILE, fieldMap);

      console.log(JSON.stringify({
        wrote: [
          basename(INVENTORY_FILE),
          basename(FIELD_MAP_FILE)
        ],
        document: inventory.document,
        pages: inventory.pages.length,
        textGroups: Object.keys(inventory.text_groups).length,
        paletteGroups: Object.keys(inventory.palettes).length
      }, null, 2));
      return;
    }

    if (command === 'images') {
      const imagesResult = applyImages();
      console.log(JSON.stringify(imagesResult, null, 2));
      return;
    }

    ensure(existsSync(INVENTORY_FILE), `Missing inventory file: ${INVENTORY_FILE}. Run inventory first.`);
    ensure(existsSync(FIELD_MAP_FILE), `Missing field map file: ${FIELD_MAP_FILE}. Run inventory first.`);

    const source = loadJson(SOURCE_FILE);
    const inventory = loadJson(INVENTORY_FILE);
    const fieldMap = loadJson(FIELD_MAP_FILE);

    validateSource(source);
    validateInventory(inventory);
    validateFieldMap(fieldMap, source);

    const plan = buildOperationPlan(source, fieldMap);

    if (command === 'preview') {
      console.log(JSON.stringify(buildPreviewSummary(source, fieldMap, plan), null, 2));
      return;
    }

    const result = applyOperationPlan(plan, source);
    const refreshedInventory = extractInventory();
    const refreshedFieldMap = buildFieldMap(refreshedInventory);
    writeJson(INVENTORY_FILE, refreshedInventory);
    writeJson(FIELD_MAP_FILE, refreshedFieldMap);
    console.log(JSON.stringify({
      preview: buildPreviewSummary(source, fieldMap, plan),
      apply: result,
      refreshed_inventory: {
        inventory_file: basename(INVENTORY_FILE),
        field_map_file: basename(FIELD_MAP_FILE)
      }
    }, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, value) {
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function getByPath(object, path) {
  return path.split('.').reduce((current, key) => current?.[key], object);
}

function normalizeHex(value) {
  ensure(typeof value === 'string', `Expected hex string, got ${typeof value}`);
  const normalized = value.replace(/^#/, '').toUpperCase();
  ensure(/^[0-9A-F]{6}$/.test(normalized), `Invalid hex color: ${value}`);
  return normalized;
}

function uniqueTargets(targets) {
  const seen = new Set();
  const output = [];
  for (const target of targets) {
    if (!target?.id || seen.has(target.id)) {
      continue;
    }
    seen.add(target.id);
    output.push(target);
  }
  return output;
}

function runFigmaEval(code) {
  const tempFile = join(
    tmpdir(),
    `brand-guidelines-example-${process.pid}-${Date.now()}.js`
  );

  writeFileSync(tempFile, code, 'utf8');

  let stdout = '';
  try {
    stdout = execFileSync(
      'node',
      [FIGMA_CLI, 'run', tempFile],
      {
        cwd: FIGMA_REPO_DIR,
        encoding: 'utf8',
        maxBuffer: 50 * 1024 * 1024
      }
    ).trim();
  } finally {
    try {
      unlinkSync(tempFile);
    } catch {}
  }

  ensure(stdout, 'figma-cli returned no output.');

  try {
    return JSON.parse(stdout);
  } catch (error) {
    throw new Error(`Failed to parse figma-cli JSON output.\n${stdout}`);
  }
}

function extractInventory() {
  const source = existsSync(SOURCE_FILE) ? JSON.parse(readFileSync(SOURCE_FILE, 'utf8')) : {};
  const srcText = source.text || {};

  const headWordmarkStandard = srcText.head_wordmark_standard || 'SoloOctopus';
  const headWordmarkPrinciples = srcText.head_wordmark_principles || 'SoloOctopus';
  const footerTitle = srcText.footer_presentation_title || 'SoloOctopus Brand Guidelines\nDeveloped By BrandKit';
  const footerCopyright = srcText.footer_copyright || '© 2026';

  const code = `
(async () => {
  await figma.loadAllPagesAsync();

  const documentName = figma.root.name;
  const paletteTargetIds = ${JSON.stringify(PALETTE_TARGET_IDS)};
  const headWordmarkStandard = ${JSON.stringify(headWordmarkStandard)};
  const headWordmarkPrinciples = ${JSON.stringify(headWordmarkPrinciples)};
  const footerTitle = ${JSON.stringify(footerTitle)};
  const footerCopyright = ${JSON.stringify(footerCopyright)};

  const getPage = (node) => {
    let current = node;
    while (current && current.type !== 'PAGE') current = current.parent;
    return current ? { id: current.id, name: current.name } : null;
  };

  const rgbToHex = (color) => {
    const toHex = (value) =>
      Math.round(Math.max(0, Math.min(1, value)) * 255)
        .toString(16)
        .padStart(2, '0');
    return (toHex(color.r) + toHex(color.g) + toHex(color.b)).toUpperCase();
  };

  const fontToJson = (fontName) =>
    fontName === figma.mixed
      ? { family: null, style: null }
      : { family: fontName.family, style: fontName.style };

  const metricToJson = (metric) =>
    metric === figma.mixed
      ? { unit: null, value: null }
      : { unit: metric.unit, value: metric.value };

  const textToJson = (node) => ({
    id: node.id,
    page: getPage(node)?.name || null,
    parent: node.parent ? node.parent.name : null,
    name: node.name,
    characters: node.characters,
    fontName: fontToJson(node.fontName),
    fontSize: node.fontSize,
    lineHeight: metricToJson(node.lineHeight),
    letterSpacing: metricToJson(node.letterSpacing)
  });

  const getFirstSolidHex = (node) => {
    if (!('fills' in node) || !Array.isArray(node.fills)) return null;
    const solid = node.fills.find((fill) => fill && fill.type === 'SOLID');
    return solid ? rgbToHex(solid.color) : null;
  };

  const textNodeById = async (id) => {
    const node = await figma.getNodeByIdAsync(id);
    if (!node || node.type !== 'TEXT') {
      return { id, missing: true };
    }
    return textToJson(node);
  };

  const colorNodeById = async (id) => {
    const node = await figma.getNodeByIdAsync(id);
    if (!node) {
      return { id, missing: true };
    }
    return {
      id: node.id,
      page: getPage(node)?.name || null,
      parent: node.parent ? node.parent.name : null,
      name: node.name,
      current_hex: getFirstSolidHex(node)
    };
  };

  const allTexts = figma.root.findAll((node) => node.type === 'TEXT');
  const allFillNodes = figma.root.findAll((node) => 'fills' in node && Array.isArray(node.fills));

  const collectText = (predicate) => allTexts.filter(predicate).map(textToJson);

  const fontsUsed = Array.from(
    new Set(
      allTexts.flatMap((node) => {
        try {
          const fonts = node.characters.length
            ? node.getRangeAllFontNames(0, node.characters.length)
            : [node.fontName];
          return fonts
            .filter((font) => font !== figma.mixed)
            .map((font) => JSON.stringify(fontToJson(font)));
        } catch {
          return [];
        }
      })
    )
  ).map((entry) => JSON.parse(entry));

  const colorsUsed = Array.from(
    new Set(
      allFillNodes.flatMap((node) =>
        node.fills
          .filter((fill) => fill && fill.type === 'SOLID')
          .map((fill) => rgbToHex(fill.color))
      )
    )
  ).sort();

  return {
    document: documentName,
    pages: figma.root.children.map((page) => ({
      id: page.id,
      name: page.name,
      childCount: page.children.length
    })),
    fonts_used: fontsUsed,
    colors_used: colorsUsed,
    text_groups: {
      footer_presentation_title: collectText(
        (node) =>
          node.parent &&
          node.parent.name === 'Footer' &&
          (node.characters === 'Velour & Co Presentation\\nDeveloped By BrandKit' ||
           node.characters === footerTitle)
      ),
      footer_copyright: collectText(
        (node) =>
          node.parent &&
          node.parent.name === 'Footer' &&
          (node.characters === '© 2024' ||
           node.characters === footerCopyright)
      ),
      footer_section_labels: {
        principles: collectText(
          (node) =>
            node.parent &&
            node.parent.name === 'Footer' &&
            node.characters === 'Principles'
        ),
        logo: collectText(
          (node) =>
            node.parent &&
            node.parent.name === 'Footer' &&
            node.characters === 'Logo'
        ),
        typography: collectText(
          (node) =>
            node.parent &&
            node.parent.name === 'Footer' &&
            node.characters === 'Typography'
        ),
        color: collectText(
          (node) =>
            node.parent &&
            node.parent.name === 'Footer' &&
            node.characters === 'Color'
        )
      },
      head_wordmark_standard: collectText(
        (node) =>
          node.parent &&
          node.parent.name === 'Head' &&
          (node.characters === 'Velour & Co.' ||
           node.characters === headWordmarkStandard)
      ),
      head_wordmark_principles: collectText(
        (node) =>
          node.parent &&
          node.parent.name === 'Head' &&
          (node.characters === 'Agent Branding & Co.' ||
           node.characters === headWordmarkPrinciples)
      ),
      nav_page_type_label: collectText(
        (node) =>
          node.parent &&
          node.parent.name === 'Nav' &&
          node.characters === 'Page Type:'
      ),
      nav_page_type_value: collectText(
        (node) =>
          node.parent &&
          node.parent.name === 'Nav' &&
          node.characters !== 'Page Type:'
      )
    },
    core_targets: {
      logo_primary: await textNodeById('2001:647'),
      page_hero_logo: await textNodeById('2002:445'),
      page_hero_typography: await textNodeById('2018:1695'),
      page_hero_color: await textNodeById('2025:953'),
      color_intro: await textNodeById('2028:169')
    },
    palettes: {
      primary: await Promise.all(paletteTargetIds.primary.map(colorNodeById)),
      secondary: await Promise.all(paletteTargetIds.secondary.map(colorNodeById)),
      tertiary: await Promise.all(paletteTargetIds.tertiary.map(colorNodeById))
    },
    typography_samples: {
      logo_primary: await textNodeById('2001:647'),
      page_hero: await textNodeById('2002:445'),
      longform_body: await textNodeById('2028:169'),
      head_wordmark: collectText(
        (node) =>
          node.parent &&
          node.parent.name === 'Head' &&
          (node.characters === 'Velour & Co.' ||
           node.characters === headWordmarkStandard)
      )[0] || null,
      nav_label: await textNodeById('2025:957'),
      footer_meta: await textNodeById('2082:797')
    }
  };
})()
`;

  const inventory = runFigmaEval(code);
  ensure(inventory.document === DOCUMENT_NAME, `Expected "${DOCUMENT_NAME}", found "${inventory.document}".`);
  inventory.generated_at = new Date().toISOString();
  return inventory;
}

function buildFieldMap(inventory) {
  const footerMetaTargets = uniqueTargets([
    ...inventory.text_groups.footer_presentation_title,
    ...inventory.text_groups.footer_copyright,
    ...inventory.text_groups.footer_section_labels.principles,
    ...inventory.text_groups.footer_section_labels.logo,
    ...inventory.text_groups.footer_section_labels.typography,
    ...inventory.text_groups.footer_section_labels.color
  ]);

  return {
    document: inventory.document,
    generated_at: new Date().toISOString(),
    source_of_truth_file: basename(SOURCE_FILE),
    inventory_file: basename(INVENTORY_FILE),
    apply_order: ['font_replacement', 'text', 'typography', 'colors', 'color_map_global'],
    preflight_checks: [
      'Verify required text keys exist in brand-guidelines-example.json.',
      'Verify all hex colors are six-character values without #.',
      'Verify all typography tokens include family, style, font_size, line_height_percent, and tracking_percent.',
      'Verify every mapped node ID still exists in the connected Figma document before applying.',
      'Preview text, typography, and palette updates before running apply.'
    ],
    groups: {
      'text.logo_primary': {
        type: 'text',
        value_path: 'text.logo_primary',
        targets: [inventory.core_targets.logo_primary]
      },
      'text.page_heroes.logo': {
        type: 'text',
        value_path: 'text.page_heroes.logo',
        targets: [inventory.core_targets.page_hero_logo]
      },
      'text.page_heroes.typography': {
        type: 'text',
        value_path: 'text.page_heroes.typography',
        targets: [inventory.core_targets.page_hero_typography]
      },
      'text.page_heroes.color': {
        type: 'text',
        value_path: 'text.page_heroes.color',
        targets: [inventory.core_targets.page_hero_color]
      },
      'text.color_intro': {
        type: 'text',
        value_path: 'text.color_intro',
        targets: [inventory.core_targets.color_intro]
      },
      'text.head_wordmark_standard': {
        type: 'text',
        value_path: 'text.head_wordmark_standard',
        targets: inventory.text_groups.head_wordmark_standard
      },
      'text.head_wordmark_principles': {
        type: 'text',
        value_path: 'text.head_wordmark_principles',
        targets: inventory.text_groups.head_wordmark_principles
      },
      'text.footer_presentation_title': {
        type: 'text',
        value_path: 'text.footer_presentation_title',
        targets: inventory.text_groups.footer_presentation_title
      },
      'text.footer_copyright': {
        type: 'text',
        value_path: 'text.footer_copyright',
        targets: inventory.text_groups.footer_copyright
      },
      'text.footer_section_labels.principles': {
        type: 'text',
        value_path: 'text.footer_section_labels.principles',
        targets: inventory.text_groups.footer_section_labels.principles
      },
      'text.footer_section_labels.logo': {
        type: 'text',
        value_path: 'text.footer_section_labels.logo',
        targets: inventory.text_groups.footer_section_labels.logo
      },
      'text.footer_section_labels.typography': {
        type: 'text',
        value_path: 'text.footer_section_labels.typography',
        targets: inventory.text_groups.footer_section_labels.typography
      },
      'text.footer_section_labels.color': {
        type: 'text',
        value_path: 'text.footer_section_labels.color',
        targets: inventory.text_groups.footer_section_labels.color
      },
      'typography.logo_primary': {
        type: 'typography',
        token_path: 'typography.tokens.logo_primary',
        targets: [inventory.core_targets.logo_primary]
      },
      'typography.page_hero': {
        type: 'typography',
        token_path: 'typography.tokens.page_hero',
        targets: [
          inventory.core_targets.page_hero_logo,
          inventory.core_targets.page_hero_typography,
          inventory.core_targets.page_hero_color
        ]
      },
      'typography.longform_body': {
        type: 'typography',
        token_path: 'typography.tokens.longform_body',
        targets: [inventory.core_targets.color_intro]
      },
      'typography.head_wordmark_standard': {
        type: 'typography',
        token_path: 'typography.tokens.head_wordmark',
        targets: inventory.text_groups.head_wordmark_standard
      },
      'typography.head_wordmark_principles': {
        type: 'typography',
        token_path: 'typography.tokens.head_wordmark',
        targets: inventory.text_groups.head_wordmark_principles
      },
      'typography.nav_label': {
        type: 'typography',
        token_path: 'typography.tokens.nav_label',
        targets: uniqueTargets([
          ...inventory.text_groups.nav_page_type_label,
          ...inventory.text_groups.nav_page_type_value
        ])
      },
      'typography.footer_meta': {
        type: 'typography',
        token_path: 'typography.tokens.footer_meta',
        targets: footerMetaTargets
      },
      'colors.primary_palette': {
        type: 'color',
        mode: 'solid_fill_sequence',
        value_path: 'colors.primary_palette',
        targets: inventory.palettes.primary
      },
      'colors.secondary_palette': {
        type: 'color',
        mode: 'solid_fill_sequence',
        value_path: 'colors.secondary_palette',
        targets: inventory.palettes.secondary
      },
      'colors.tertiary_palette': {
        type: 'color',
        mode: 'solid_fill_sequence',
        value_path: 'colors.tertiary_palette',
        targets: inventory.palettes.tertiary
      },
      ...buildContentTargetGroups()
    }
  };
}

function buildContentTargetGroups() {
  const groups = {};
  for (const [valuePath, ids] of Object.entries(CONTENT_TARGET_IDS)) {
    groups[valuePath] = {
      type: 'text',
      value_path: valuePath,
      targets: ids.map(id => ({ id }))
    };
  }
  return groups;
}

function validateSource(source) {
  ensure(typeof source.brand_name === 'string' && source.brand_name.length > 0, 'brand_name is required.');
  ensure(typeof source.colors === 'object', 'colors is required.');
  ensure(typeof source.typography === 'object', 'typography is required.');
  ensure(typeof source.text === 'object', 'text is required.');

  for (const key of ['primary', 'secondary', 'accent', 'background', 'text']) {
    normalizeHex(source.colors[key]);
  }

  ensure(Array.isArray(source.colors.primary_palette) && source.colors.primary_palette.length === 6, 'colors.primary_palette must contain 6 colors.');
  ensure(Array.isArray(source.colors.secondary_palette) && source.colors.secondary_palette.length === 3, 'colors.secondary_palette must contain 3 colors.');
  ensure(Array.isArray(source.colors.tertiary_palette) && source.colors.tertiary_palette.length === 3, 'colors.tertiary_palette must contain 3 colors.');

  source.colors.primary_palette.forEach(normalizeHex);
  source.colors.secondary_palette.forEach(normalizeHex);
  source.colors.tertiary_palette.forEach(normalizeHex);

  ensure(normalizeHex(source.colors.primary_palette[0]) === normalizeHex(source.colors.primary), 'colors.primary must match colors.primary_palette[0].');
  ensure(normalizeHex(source.colors.secondary_palette[0]) === normalizeHex(source.colors.secondary), 'colors.secondary must match colors.secondary_palette[0].');
  ensure(normalizeHex(source.colors.tertiary_palette[1]) === normalizeHex(source.colors.accent), 'colors.accent must match colors.tertiary_palette[1].');
  ensure(normalizeHex(source.colors.primary_palette[0]) === normalizeHex(source.colors.background), 'colors.background must match colors.primary_palette[0].');
  ensure(normalizeHex(source.colors.primary_palette[2]) === normalizeHex(source.colors.text), 'colors.text must match colors.primary_palette[2].');

  for (const [tokenName, token] of Object.entries(source.typography.tokens || {})) {
    ensure(typeof token.family === 'string' && token.family.length > 0, `Typography token "${tokenName}" is missing family.`);
    ensure(typeof token.style === 'string' && token.style.length > 0, `Typography token "${tokenName}" is missing style.`);
    ensure(typeof token.font_size === 'number', `Typography token "${tokenName}" is missing font_size.`);
    ensure(typeof token.line_height_percent === 'number', `Typography token "${tokenName}" is missing line_height_percent.`);
    ensure(typeof token.tracking_percent === 'number', `Typography token "${tokenName}" is missing tracking_percent.`);
  }

  ensure(typeof source.text.logo_primary === 'string', 'text.logo_primary is required.');
  ensure(typeof source.text.color_intro === 'string', 'text.color_intro is required.');

  if (source.font_replacement) {
    ensure(typeof source.font_replacement === 'object', 'font_replacement must be an object.');
  }
  if (source.color_map) {
    ensure(typeof source.color_map === 'object', 'color_map must be an object.');
  }
}

function validateInventory(inventory) {
  ensure(inventory.document === DOCUMENT_NAME, `Inventory document mismatch: ${inventory.document}`);
  ensure(Array.isArray(inventory.pages) && inventory.pages.length > 0, 'Inventory pages are missing.');
}

function validateFieldMap(fieldMap, source) {
  ensure(fieldMap.document === DOCUMENT_NAME, `Field map document mismatch: ${fieldMap.document}`);
  ensure(Array.isArray(fieldMap.apply_order), 'Field map apply_order is required.');

  for (const [groupName, group] of Object.entries(fieldMap.groups || {})) {
    ensure(Array.isArray(group.targets) && group.targets.length > 0, `Field map group "${groupName}" has no targets.`);
    if (group.type === 'text') {
      const val = getByPath(source, group.value_path);
      if (val === undefined && CONTENT_TARGET_IDS[group.value_path]) continue;
      ensure(typeof val === 'string', `Missing text value for "${group.value_path}".`);
    }
    if (group.type === 'typography') {
      ensure(typeof getByPath(source, group.token_path) === 'object', `Missing typography token for "${group.token_path}".`);
    }
    if (group.type === 'color') {
      const value = getByPath(source, group.value_path);
      ensure(Array.isArray(value), `Color group "${groupName}" must map to an array value.`);
      ensure(value.length === group.targets.length, `Color group "${groupName}" length mismatch: expected ${group.targets.length}, got ${value.length}.`);
    }
  }
}

function buildOperationPlan(source, fieldMap) {
  const plan = {
    text: [],
    typography: [],
    colors: []
  };

  for (const step of fieldMap.apply_order) {
    for (const [groupName, group] of Object.entries(fieldMap.groups)) {
      if (step === 'text' && group.type === 'text') {
        const value = getByPath(source, group.value_path);
        for (const target of group.targets) {
          if (target.characters === value) {
            continue;
          }
          plan.text.push({
            group: groupName,
            id: target.id,
            page: target.page,
            parent: target.parent,
            value
          });
        }
      }

      if (step === 'typography' && group.type === 'typography') {
        const token = getByPath(source, group.token_path);
        for (const target of group.targets) {
          if (matchesTypographyToken(target, token)) {
            continue;
          }
          plan.typography.push({
            group: groupName,
            id: target.id,
            page: target.page,
            parent: target.parent,
            token
          });
        }
      }

      if (step === 'colors' && group.type === 'color') {
        const values = getByPath(source, group.value_path).map(normalizeHex);
        group.targets.forEach((target, index) => {
          if (normalizeHex(target.current_hex) === values[index]) {
            return;
          }
          plan.colors.push({
            group: groupName,
            id: target.id,
            page: target.page,
            parent: target.parent,
            hex: values[index]
          });
        });
      }
    }
  }

  return plan;
}

function matchesTypographyToken(target, token) {
  const sameFont =
    target.fontName?.family === token.family &&
    target.fontName?.style === token.style;
  const sameSize = approximatelyEqual(target.fontSize, token.font_size);
  const sameLineHeight =
    target.lineHeight?.unit === 'PERCENT' &&
    approximatelyEqual(target.lineHeight?.value, token.line_height_percent);
  const sameTracking =
    target.letterSpacing?.unit === 'PERCENT' &&
    approximatelyEqual(target.letterSpacing?.value, token.tracking_percent);

  return sameFont && sameSize && sameLineHeight && sameTracking;
}

function approximatelyEqual(left, right, epsilon = 0.05) {
  return typeof left === 'number' && typeof right === 'number' && Math.abs(left - right) <= epsilon;
}

function verifyTargetsLive(plan) {
  const payload = {
    text: uniqueTargets(plan.text),
    typography: uniqueTargets(plan.typography),
    colors: uniqueTargets(plan.colors)
  };

  const code = `
(async () => {
  await figma.loadAllPagesAsync();
  const payload = ${JSON.stringify(payload)};

  const check = async (entry, expectedText) => {
    const node = await figma.getNodeByIdAsync(entry.id);
    if (!node) {
      return { id: entry.id, ok: false, reason: 'missing' };
    }

    if (expectedText && node.type !== 'TEXT') {
      return { id: entry.id, ok: false, reason: 'not_text', actualType: node.type };
    }

    if (!expectedText && !('fills' in node)) {
      return { id: entry.id, ok: false, reason: 'no_fills', actualType: node.type };
    }

    return { id: entry.id, ok: true, actualType: node.type };
  };

  return {
    text: await Promise.all(payload.text.map((entry) => check(entry, true))),
    typography: await Promise.all(payload.typography.map((entry) => check(entry, true))),
    colors: await Promise.all(payload.colors.map((entry) => check(entry, false)))
  };
})()
`;

  const result = runFigmaEval(code);
  for (const phase of ['text', 'typography', 'colors']) {
    const failures = result[phase].filter((entry) => !entry.ok);
    ensure(failures.length === 0, `Live verification failed for ${phase}: ${JSON.stringify(failures, null, 2)}`);
  }
  return result;
}

function buildPreviewSummary(source, fieldMap, plan) {
  return {
    document: fieldMap.document,
    source_of_truth_file: fieldMap.source_of_truth_file,
    inventory_file: fieldMap.inventory_file,
    field_map_file: basename(FIELD_MAP_FILE),
    apply_order: fieldMap.apply_order,
    counts: {
      text_groups: Object.values(fieldMap.groups).filter((group) => group.type === 'text').length,
      typography_groups: Object.values(fieldMap.groups).filter((group) => group.type === 'typography').length,
      color_groups: Object.values(fieldMap.groups).filter((group) => group.type === 'color').length,
      text_targets: plan.text.length,
      typography_targets: plan.typography.length,
      color_targets: plan.colors.length
    },
    key_values: {
      logo_primary: source.text.logo_primary,
      page_heroes: source.text.page_heroes,
      footer_presentation_title: source.text.footer_presentation_title,
      primary_palette: source.colors.primary_palette,
      secondary_palette: source.colors.secondary_palette,
      tertiary_palette: source.colors.tertiary_palette
    },
    extended: {
      font_replacement: source.font_replacement ? Object.keys(source.font_replacement).length + ' font families to replace' : 'none',
      color_map: source.color_map ? {
        fill_rules: Object.keys(source.color_map.fill || {}).length,
        stroke_rules: Object.keys(source.color_map.stroke || {}).length,
        swatch_rules: Object.keys(source.color_map.swatch || {}).length
      } : 'none',
      content_text_groups: Object.keys(CONTENT_TARGET_IDS).length
    }
  };
}

function applyOperationPlan(plan, source) {
  const summary = {
    font_replacement: null,
    text: { groups: 0, targets: 0, failed: 0 },
    typography: { groups: 0, targets: 0, failed: 0 },
    colors: { groups: 0, targets: 0, failed: 0 },
    color_map_global: null,
    batches: []
  };

  summary.font_replacement = applyFontReplacement(source);

  for (const [groupName, entries] of groupEntries(plan.text)) {
    let batch;
    try {
      batch = runTextBatch(groupName, entries);
    } catch (error) {
      batch = {
        phase: 'text',
        group: groupName,
        ok: 0,
        failed: [{ reason: error.message }]
      };
    }
    summary.text.groups += 1;
    summary.text.targets += entries.length;
    summary.text.failed += batch.failed.length;
    summary.batches.push(batch);
  }

  for (const [groupName, entries] of groupEntries(plan.typography)) {
    let batch;
    try {
      batch = runTypographyBatch(groupName, entries);
    } catch (error) {
      batch = {
        phase: 'typography',
        group: groupName,
        ok: 0,
        failed: [{ reason: error.message }]
      };
    }
    summary.typography.groups += 1;
    summary.typography.targets += entries.length;
    summary.typography.failed += batch.failed.length;
    summary.batches.push(batch);
  }

  for (const [groupName, entries] of groupEntries(plan.colors)) {
    let batch;
    try {
      batch = runColorBatch(groupName, entries);
    } catch (error) {
      batch = {
        phase: 'colors',
        group: groupName,
        ok: 0,
        failed: [{ reason: error.message }]
      };
    }
    summary.colors.groups += 1;
    summary.colors.targets += entries.length;
    summary.colors.failed += batch.failed.length;
    summary.batches.push(batch);
  }

  summary.color_map_global = applyGlobalColorMap(source);

  return summary;
}

function groupEntries(entries) {
  const groups = new Map();
  for (const entry of entries) {
    const current = groups.get(entry.group) || [];
    current.push(entry);
    groups.set(entry.group, current);
  }
  return Array.from(groups.entries());
}

function runTextBatch(groupName, entries) {
  const code = `
(async () => {
  await figma.loadAllPagesAsync();
  const payload = ${JSON.stringify(entries)};

  const loadFontsForNode = async (node) => {
    const fonts = node.characters.length
      ? node.getRangeAllFontNames(0, node.characters.length)
      : [node.fontName];
    const unique = [];
    const seen = new Set();
    for (const font of fonts) {
      if (font === figma.mixed) continue;
      const key = JSON.stringify({ family: font.family, style: font.style });
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(font);
      }
    }
    await Promise.all(unique.map((font) => figma.loadFontAsync(font)));
  };

  const failed = [];
  let ok = 0;

  for (const entry of payload) {
    const node = await figma.getNodeByIdAsync(entry.id);
    if (!node || node.type !== 'TEXT') {
      failed.push({ id: entry.id, reason: 'missing_or_not_text' });
      continue;
    }

    await loadFontsForNode(node);
    node.characters = entry.value;
    ok += 1;
  }

  return {
    phase: 'text',
    group: ${JSON.stringify(groupName)},
    ok,
    failed
  };
})()
`;

  return runFigmaEval(code);
}

function runTypographyBatch(groupName, entries) {
  const code = `
(async () => {
  await figma.loadAllPagesAsync();
  const payload = ${JSON.stringify(entries)};
  const failed = [];
  let ok = 0;

  for (const entry of payload) {
    const node = await figma.getNodeByIdAsync(entry.id);
    if (!node || node.type !== 'TEXT') {
      failed.push({ id: entry.id, reason: 'missing_or_not_text' });
      continue;
    }

    await figma.loadFontAsync({
      family: entry.token.family,
      style: entry.token.style
    });

    node.fontName = {
      family: entry.token.family,
      style: entry.token.style
    };
    node.fontSize = entry.token.font_size;
    node.lineHeight = {
      unit: 'PERCENT',
      value: entry.token.line_height_percent
    };
    node.letterSpacing = {
      unit: 'PERCENT',
      value: entry.token.tracking_percent
    };
    ok += 1;
  }

  return {
    phase: 'typography',
    group: ${JSON.stringify(groupName)},
    ok,
    failed
  };
})()
`;

  return runFigmaEval(code);
}

function runColorBatch(groupName, entries) {
  const code = `
(async () => {
  await figma.loadAllPagesAsync();
  const payload = ${JSON.stringify(entries)};

  const hexToRgb = (hex) => ({
    r: parseInt(hex.slice(0, 2), 16) / 255,
    g: parseInt(hex.slice(2, 4), 16) / 255,
    b: parseInt(hex.slice(4, 6), 16) / 255
  });

  const failed = [];
  let ok = 0;

  for (const entry of payload) {
    const node = await figma.getNodeByIdAsync(entry.id);
    if (!node || !('fills' in node)) {
      failed.push({ id: entry.id, reason: 'missing_or_no_fills' });
      continue;
    }

    const existingFills = Array.isArray(node.fills) ? [...node.fills] : [];
    const firstSolid = existingFills.find((fill) => fill && fill.type === 'SOLID');
    const updatedFill = {
      type: 'SOLID',
      color: hexToRgb(entry.hex),
      opacity: firstSolid && typeof firstSolid.opacity === 'number' ? firstSolid.opacity : 1
    };
    node.fills = [updatedFill];
    ok += 1;
  }

  return {
    phase: 'colors',
    group: ${JSON.stringify(groupName)},
    ok,
    failed
  };
})()
`;

  return runFigmaEval(code);
}

function applyFontReplacement(source) {
  if (!source.font_replacement || Object.keys(source.font_replacement).length === 0) {
    return { phase: 'font_replacement', skipped: true, reason: 'no font_replacement in source' };
  }

  const primaryFont = source.typography?.primary_font || 'IBM Plex Serif';
  const secondaryFont = source.typography?.secondary_font || 'IBM Plex Sans';

  const fontMap = {};
  for (const [oldFamily, newFamily] of Object.entries(source.font_replacement)) {
    for (const [oldStyle, mappedStyle] of Object.entries(FONT_STYLE_MAP)) {
      fontMap[`${oldFamily}|${oldStyle}`] = { family: newFamily, style: mappedStyle };
    }
  }

  const code = `
(async () => {
  await figma.loadAllPagesAsync();

  const fontMap = ${JSON.stringify(fontMap)};
  const targetFamilies = new Set(${JSON.stringify(Object.keys(source.font_replacement))});

  const allTexts = figma.root.findAll((n) => n.type === 'TEXT');

  // Quick check: count how many nodes actually need replacement
  let needsWork = 0;
  for (const node of allTexts) {
    if (node.fontName === figma.mixed) {
      if (node.characters.length === 0) continue;
      try {
        const fonts = node.getRangeAllFontNames(0, node.characters.length);
        for (const f of fonts) {
          if (f !== figma.mixed && targetFamilies.has(f.family)) { needsWork++; break; }
        }
      } catch {}
    } else if (targetFamilies.has(node.fontName.family)) {
      needsWork++;
    }
  }

  if (needsWork === 0) {
    return { phase: 'font_replacement', updated: 0, mixedHandled: 0, skipped_scan: true };
  }

  const needed = new Set();
  for (const v of Object.values(fontMap)) needed.add(JSON.stringify(v));
  for (const key of needed) await figma.loadFontAsync(JSON.parse(key));

  let updated = 0;
  let mixedHandled = 0;

  for (const node of allTexts) {
    try {
      if (node.fontName === figma.mixed) {
        if (node.characters.length === 0) continue;
        const rangeFonts = node.getRangeAllFontNames(0, node.characters.length);
        let needsUpdate = false;
        for (const f of rangeFonts) {
          if (f !== figma.mixed && targetFamilies.has(f.family)) { needsUpdate = true; break; }
        }
        if (!needsUpdate) continue;
        for (const f of rangeFonts) {
          if (f !== figma.mixed && targetFamilies.has(f.family)) await figma.loadFontAsync(f);
        }
        const len = node.characters.length;
        for (let i = 0; i < len; i++) {
          const charFont = node.getRangeFontName(i, i + 1);
          if (charFont === figma.mixed) continue;
          const key = charFont.family + '|' + charFont.style;
          if (fontMap[key]) node.setRangeFontName(i, i + 1, fontMap[key]);
        }
        mixedHandled++;
        updated++;
        continue;
      }
      const key = node.fontName.family + '|' + node.fontName.style;
      if (fontMap[key]) {
        await figma.loadFontAsync(node.fontName);
        node.fontName = fontMap[key];
        updated++;
      }
    } catch {}
  }

  return { phase: 'font_replacement', updated, mixedHandled };
})()
`;

  return runFigmaEval(code);
}

function applyGlobalColorMap(source) {
  if (!source.color_map || Object.keys(source.color_map).length === 0) {
    return { phase: 'color_map_global', skipped: true, reason: 'no color_map in source' };
  }

  const fillMap = source.color_map.fill || {};
  const strokeMap = source.color_map.stroke || {};
  const swatchMap = source.color_map.swatch || {};

  const allFillMap = Object.fromEntries(
    [...Object.entries(fillMap), ...Object.entries(swatchMap)].map(([k,v]) => [k.toUpperCase(), v.toUpperCase()])
  );
  const normStrokeMap = Object.fromEntries(
    Object.entries(strokeMap).map(([k,v]) => [k.toUpperCase(), v.toUpperCase()])
  );

  const colorHelpers = `
  const hexToRgb = (hex) => ({
    r: parseInt(hex.slice(0, 2), 16) / 255,
    g: parseInt(hex.slice(2, 4), 16) / 255,
    b: parseInt(hex.slice(4, 6), 16) / 255
  });
  const toHex = (r, g, b) => {
    const h = (v) => Math.round(v * 255).toString(16).padStart(2, '0').toUpperCase();
    return h(r) + h(g) + h(b);
  };
  `;

  const fillCode = `
(async () => {
  await figma.loadAllPagesAsync();
  ${colorHelpers}
  const fillMap = ${JSON.stringify(allFillMap)};
  const matchHexes = new Set(Object.keys(fillMap));
  let updated = 0;
  const allNodes = figma.root.findAll((n) => 'fills' in n && Array.isArray(n.fills) && n.fills.length > 0);
  for (const node of allNodes) {
    let changed = false;
    const newFills = node.fills.map(fill => {
      if (fill.type !== 'SOLID' || !fill.color) return fill;
      const hex = toHex(fill.color.r, fill.color.g, fill.color.b);
      if (matchHexes.has(hex)) { changed = true; return { ...fill, color: hexToRgb(fillMap[hex]) }; }
      return fill;
    });
    if (changed) { node.fills = newFills; updated++; }
  }
  return { fills_updated: updated };
})()
`;

  const strokeCode = `
(async () => {
  await figma.loadAllPagesAsync();
  ${colorHelpers}
  const strokeMap = ${JSON.stringify(normStrokeMap)};
  const matchHexes = new Set(Object.keys(strokeMap));
  let updated = 0;
  const allNodes = figma.root.findAll((n) => 'strokes' in n && Array.isArray(n.strokes) && n.strokes.length > 0);
  for (const node of allNodes) {
    let changed = false;
    const newStrokes = node.strokes.map(s => {
      if (s.type !== 'SOLID' || !s.color) return s;
      const hex = toHex(s.color.r, s.color.g, s.color.b);
      if (matchHexes.has(hex)) { changed = true; return { ...s, color: hexToRgb(strokeMap[hex]) }; }
      return s;
    });
    if (changed) { node.strokes = newStrokes; updated++; }
  }
  return { strokes_updated: updated };
})()
`;

  const fillResult = runFigmaEval(fillCode);
  const strokeResult = runFigmaEval(strokeCode);

  return {
    phase: 'color_map_global',
    fills: fillResult.fills_updated,
    strokes: strokeResult.strokes_updated
  };
}

function applyImages() {
  const brandDir = join(__dirname, '..', 'brand');
  const imagesDir = join(brandDir, 'images');
  const manifestFile = join(imagesDir, 'manifest.json');

  ensure(existsSync(imagesDir), `Missing images directory: ${imagesDir}. Run generate-brand-images.py first.`);
  ensure(existsSync(manifestFile), `Missing manifest: ${manifestFile}. Run generate-brand-images.py first.`);

  const manifest = loadJson(manifestFile);
  ensure(Array.isArray(manifest) && manifest.length > 0, 'Image manifest is empty.');

  const imageTargets = discoverImageFrames();

  const summary = { applied: 0, skipped: 0, details: [] };
  let targetIndex = 0;

  for (const entry of manifest) {
    const candidates = [
      join(imagesDir, entry.label + '.png'),
      join(imagesDir, entry.label + '.jpg'),
      join(imagesDir, entry.label + '.jpeg'),
      join(imagesDir, entry.label + '.webp')
    ];
    const imageFile = candidates.find(existsSync);

    if (!imageFile) {
      summary.skipped += 1;
      summary.details.push({ label: entry.label, status: 'file_not_found' });
      continue;
    }

    const targetFrame = imageTargets[targetIndex] || null;

    if (!targetFrame) {
      summary.skipped += 1;
      summary.details.push({ label: entry.label, status: 'no_target_frame' });
      continue;
    }

    const base64 = readFileSync(imageFile).toString('base64');
    const ext = imageFile.split('.').pop().toLowerCase();
    const mimeMap = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' };
    const mime = mimeMap[ext] || 'image/png';
    const dataUrl = `data:${mime};base64,${base64}`;

    const result = setImageFill(targetFrame.id, dataUrl);
    targetIndex += 1;
    summary.applied += 1;
    summary.details.push({
      label: entry.label,
      status: 'applied',
      target_id: targetFrame.id,
      target_page: targetFrame.page,
      result
    });
  }

  return summary;
}

function discoverImageFrames() {
  const code = `
(async () => {
  await figma.loadAllPagesAsync();

  const imageFrames = [];
  const pages = figma.root.children;

  for (const page of pages) {
    const frames = page.findAll(node =>
      node.name === 'Image' &&
      (node.type === 'FRAME' || node.type === 'RECTANGLE' || node.type === 'GROUP')
    );
    for (const frame of frames) {
      imageFrames.push({
        id: frame.id,
        page: page.name,
        name: frame.name,
        type: frame.type,
        width: frame.width,
        height: frame.height
      });
    }
  }

  return imageFrames;
})()
`;

  return runFigmaEval(code);
}

function setImageFill(nodeId, dataUrl) {
  const code = `
(async () => {
  await figma.loadAllPagesAsync();

  const node = await figma.getNodeByIdAsync(${JSON.stringify(nodeId)});
  if (!node) {
    return { ok: false, reason: 'node_not_found' };
  }
  if (!('fills' in node)) {
    return { ok: false, reason: 'node_has_no_fills' };
  }

  const image = await figma.createImageAsync(${JSON.stringify(dataUrl)});
  node.fills = [{ type: 'IMAGE', scaleMode: 'FILL', imageHash: image.hash }];

  return { ok: true, id: node.id, imageHash: image.hash };
})()
`;

  return runFigmaEval(code);
}
