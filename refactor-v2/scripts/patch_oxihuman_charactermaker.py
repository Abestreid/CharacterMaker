#!/usr/bin/env python3
"""Patch the pinned OxiHuman pack builder for CharacterMaker body-shape targets.

We keep OxiHuman's runtime/fitter and MakeHuman's CC0 data, but curate a small
set of non-genital body-shape morphs that stock OxiHuman intentionally omits.
The generated OHPK remains adult-only and does not include nipple/areola/genital
morph targets.
"""
from __future__ import annotations

import sys
from pathlib import Path

TARGETS = (
    "breast/breast-dist-decr",
    "breast/breast-dist-incr",
    "breast/breast-point-decr",
    "breast/breast-point-incr",
    "breast/breast-trans-down",
    "breast/breast-trans-up",
    "breast/breast-volume-vert-down",
    "breast/breast-volume-vert-up",
    "buttocks/buttocks-volume-decr",
    "buttocks/buttocks-volume-incr",
    "hip/hip-scale-depth-decr",
    "hip/hip-scale-depth-incr",
    "hip/hip-scale-horiz-decr",
    "hip/hip-scale-horiz-incr",
    "hip/hip-scale-vert-decr",
    "hip/hip-scale-vert-incr",
)


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"patch anchor {label!r}: expected once, found {count}")
    return text.replace(old, new, 1)


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: patch_oxihuman_charactermaker.py /path/to/oxihuman")

    root = Path(sys.argv[1]).resolve()
    path = root / "crates/oxihuman-cli/src/commands/pack_core.rs"
    text = path.read_text(encoding="utf-8")

    target_lines = "\n".join(f'    "{name}",' for name in TARGETS)
    declaration = f'''\n/// CharacterMaker body-shape targets. These are CC0 MakeHuman morphs used only\n/// for silhouette/volume shaping. Explicit anatomical detail targets remain excluded.\nconst CHARACTERMAKER_SHAPE_TARGETS: &[&str] = &[\n{target_lines}\n];\n'''

    text = replace_once(
        text,
        'const MEASURE_CATEGORY: &str = "measure";\n',
        'const MEASURE_CATEGORY: &str = "measure";\n' + declaration,
        "shape target declaration",
    )

    text = replace_once(
        text,
        'fn core_priority(rel_name: &str) -> u32 {\n    if rel_name.starts_with("measure/") {',
        'fn core_priority(rel_name: &str) -> u32 {\n    if CHARACTERMAKER_SHAPE_TARGETS.contains(&rel_name) {\n        0\n    } else if rel_name.starts_with("measure/") {',
        "core priority",
    )

    text = replace_once(
        text,
        '    // Adult-neutral waist / hip shaping polish (dropped first under budget): 8.\n',
        '    // CharacterMaker shape morphs are essential for the 3D body preview.\n'
        '    for n in CHARACTERMAKER_SHAPE_TARGETS {\n'
        '        if !names.iter().any(|existing| existing == n) {\n'
        '            names.push((*n).to_string());\n'
        '        }\n'
        '    }\n\n'
        '    // Adult-neutral waist / hip shaping polish (dropped first under budget): 8.\n',
        "core target list",
    )

    text = replace_once(
        text,
        'fn curated_category(rel_name: &str, stem: &str) -> String {\n    if rel_name.starts_with("measure/") {',
        'fn curated_category(rel_name: &str, stem: &str) -> String {\n'
        '    if CHARACTERMAKER_SHAPE_TARGETS.contains(&rel_name) {\n'
        '        "charactermaker_shape".to_string()\n'
        '    } else if rel_name.starts_with("measure/") {',
        "custom category",
    )

    text = replace_once(
        text,
        '    if EXPLICIT_TOKENS.iter().any(|tok| lower.contains(tok)) {\n        return Ok(None);\n    }',
        '    if !CHARACTERMAKER_SHAPE_TARGETS.contains(&rel_name)\n'
        '        && EXPLICIT_TOKENS.iter().any(|tok| lower.contains(tok))\n'
        '    {\n'
        '        return Ok(None);\n'
        '    }',
        "explicit-token exception",
    )

    path.write_text(text, encoding="utf-8")
    print(f"Patched {path}")
    print("CharacterMaker shape targets:")
    for target in TARGETS:
        print(f"  - {target}")


if __name__ == "__main__":
    main()
