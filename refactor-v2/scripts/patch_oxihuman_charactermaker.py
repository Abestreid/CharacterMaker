#!/usr/bin/env python3
"""Patch pinned OxiHuman into the CharacterMaker body runtime.

CharacterMaker keeps OxiHuman's WASM mesh/measurement engine but restores the
CC0 MakeHuman breast macro system that stock OxiHuman intentionally omits:

- cup size: mincup / averagecup / maxcup
- breast firmness: minfirmness / averagefirmness / maxfirmness
- adult female breast corner targets blended by age/muscle/weight/cup/firmness
- selected non-explicit breast/buttock/hip detail morphs for categorical shapes

MakeHuman does not ship an averagecup+averagefirmness target: that neutral
combination is the zero-delta base mesh. Therefore the adult female lattice has
144 authored target files, not 162 (18 neutral base corners are implicit).

Explicit genital/nipple/areola morphs stay excluded. The patch is deliberately
anchor-based and fails loudly if the pinned OxiHuman source changes.
"""
from __future__ import annotations

import sys
from pathlib import Path

DETAIL_TARGETS = (
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


def patch_pack_builder(root: Path) -> None:
    path = root / "crates/oxihuman-cli/src/commands/pack_core.rs"
    text = path.read_text(encoding="utf-8")

    target_lines = "\n".join(f'    "{name}",' for name in DETAIL_TARGETS)
    declaration = f'''\n/// CharacterMaker direct shape targets. They are kept param-inert and driven\n/// explicitly by target name from the browser body engine.\nconst CHARACTERMAKER_SHAPE_TARGETS: &[&str] = &[\n{target_lines}\n];\n\n/// A MakeHuman breast macro corner is authored as a product of gender, age,\n/// muscle, weight, cup size and firmness. Stock OxiHuman strips these targets;\n/// CharacterMaker restores the adult female subset and blends it in WASM.\nfn is_charactermaker_breast_macro(rel_name: &str) -> bool {{\n    rel_name.starts_with("breast/female-")\n        && !NON_ADULT_TOKENS.iter().any(|tok| rel_name.contains(tok))\n        && (rel_name.contains("mincup") || rel_name.contains("averagecup") || rel_name.contains("maxcup"))\n        && (rel_name.contains("minfirmness") || rel_name.contains("averagefirmness") || rel_name.contains("maxfirmness"))\n}}\n'''

    text = replace_once(
        text,
        'const MEASURE_CATEGORY: &str = "measure";\n',
        'const MEASURE_CATEGORY: &str = "measure";\n' + declaration,
        "CharacterMaker declarations",
    )

    text = replace_once(
        text,
        'fn core_priority(rel_name: &str) -> u32 {\n    if rel_name.starts_with("measure/") {',
        'fn core_priority(rel_name: &str) -> u32 {\n'
        '    if is_charactermaker_breast_macro(rel_name) || CHARACTERMAKER_SHAPE_TARGETS.contains(&rel_name) {\n'
        '        0\n'
        '    } else if rel_name.starts_with("measure/") {',
        "core priority",
    )

    # MakeHuman authors every adult female cup/firmness corner except
    # averagecup+averagefirmness. That neutral-neutral combination is the base
    # mesh (zero delta): 2*3*3*(3*3 - 1) = 144 actual target files.
    text = replace_once(
        text,
        '    // Adult-neutral waist / hip shaping polish (dropped first under budget): 8.\n',
        '    // CharacterMaker breast macro lattice (adult female only): 144 authored corners.\n'
        '    // averagecup+averagefirmness is the implicit zero-delta base mesh.\n'
        '    for a in ["young", "old"] {\n'
        '        for m in ["minmuscle", "averagemuscle", "maxmuscle"] {\n'
        '            for w in ["minweight", "averageweight", "maxweight"] {\n'
        '                for c in ["mincup", "averagecup", "maxcup"] {\n'
        '                    for f in ["minfirmness", "averagefirmness", "maxfirmness"] {\n'
        '                        if c == "averagecup" && f == "averagefirmness" {\n'
        '                            continue;\n'
        '                        }\n'
        '                        names.push(format!("breast/female-{a}-{m}-{w}-{c}-{f}"));\n'
        '                    }\n'
        '                }\n'
        '            }\n'
        '        }\n'
        '    }\n\n'
        '    // CharacterMaker detail morphs.\n'
        '    for n in CHARACTERMAKER_SHAPE_TARGETS {\n'
        '        if !names.iter().any(|existing| existing.as_str() == *n) {\n'
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
        '    if is_charactermaker_breast_macro(rel_name) {\n'
        '        "charactermaker_breast_macro".to_string()\n'
        '    } else if CHARACTERMAKER_SHAPE_TARGETS.contains(&rel_name) {\n'
        '        "charactermaker_shape".to_string()\n'
        '    } else if rel_name.starts_with("measure/") {',
        "custom categories",
    )

    text = replace_once(
        text,
        '    if EXPLICIT_TOKENS.iter().any(|tok| lower.contains(tok)) {\n        return Ok(None);\n    }',
        '    if !is_charactermaker_breast_macro(rel_name)\n'
        '        && !CHARACTERMAKER_SHAPE_TARGETS.contains(&rel_name)\n'
        '        && EXPLICIT_TOKENS.iter().any(|tok| lower.contains(tok))\n'
        '    {\n'
        '        return Ok(None);\n'
        '    }',
        "explicit-token exception",
    )

    path.write_text(text, encoding="utf-8")
    print(f"Patched pack builder: {path}")


def patch_wasm_runtime(root: Path) -> None:
    path = root / "crates/oxihuman-wasm/src/engine_core.rs"
    text = path.read_text(encoding="utf-8")

    helper_anchor = '''fn gender_slider(p: &ParamState) -> f32 {\n    p.extra\n        .get("gender")\n        .copied()\n        .unwrap_or(0.5)\n        .clamp(0.0, 1.0)\n}\n'''
    helper_replacement = helper_anchor + '''\n/// Read a CharacterMaker macro slider from ParamState.extra.\nfn extra_slider(p: &ParamState, key: &str, default: f32) -> f32 {\n    p.extra.get(key).copied().unwrap_or(default).clamp(0.0, 1.0)\n}\n'''
    text = replace_once(text, helper_anchor, helper_replacement, "extra slider helper")

    breast_block = '''\n    // CharacterMaker / MakeHuman breast macro lattice. These targets are named\n    // `breast/female-{age}-{muscle}-{weight}-{cup}-{firmness}` and are blended\n    // as a six-dimensional partition. The averagecup+averagefirmness corner is\n    // intentionally absent upstream: its zero delta is represented by the base\n    // mesh, so the missing coefficient naturally contributes no displacement.\n    // Treating the remaining corners as the generic `breast` category (stock\n    // OxiHuman behaviour) would make breast size follow body weight.\n    if basename.contains("cup") && basename.contains("firmness") {\n        let muscle = detect_level(&basename, "muscle");\n        let weight = detect_level(&basename, "weight");\n        let cup = detect_level(&basename, "cup");\n        let firmness = detect_level(&basename, "firmness");\n        if let (Some(ml), Some(wl), Some(cl), Some(fl)) = (muscle, weight, cup, firmness) {\n            return Some(Box::new(move |p: &ParamState| {\n                gender_term(p)\n                    * age_term(p)\n                    * macro_level_weight(ml, p.muscle)\n                    * macro_level_weight(wl, p.weight)\n                    * macro_level_weight(cl, extra_slider(p, "cupsize", 0.5))\n                    * macro_level_weight(fl, extra_slider(p, "breast_firmness", 0.5))\n            }));\n        }\n    }\n\n'''
    text = replace_once(
        text,
        '    // Universal body corner targets.\n',
        breast_block + '    // Universal body corner targets.\n',
        "breast macro blend",
    )

    # Unit tests lock the two restored macro axes independently of browser code.
    test_anchor = '''    None\n}\n\n/// Choose a weight function for a core-pack target.\n'''
    test_replacement = '''    None\n}\n\n#[cfg(test)]\nmod charactermaker_breast_macro_tests {\n    use super::*;\n\n    fn params(cup: f32, firmness: f32) -> ParamState {\n        let mut p = ParamState::new(0.5, 0.5, 0.5, 0.0);\n        p.extra.insert("gender".to_string(), 1.0);\n        p.extra.insert("cupsize".to_string(), cup);\n        p.extra.insert("breast_firmness".to_string(), firmness);\n        p\n    }\n\n    #[test]\n    fn maxcup_corner_tracks_cupsize() {\n        let wf = macro_blend_weight_fn(\n            "breast/female-young-averagemuscle-averageweight-maxcup-averagefirmness"\n        ).expect("breast macro");\n        assert!(wf(&params(1.0, 0.5)) > 0.99);\n        assert!(wf(&params(0.5, 0.5)) < 1e-6);\n    }\n\n    #[test]\n    fn firmness_is_independent_from_cupsize() {\n        let wf = macro_blend_weight_fn(\n            "breast/female-young-averagemuscle-averageweight-averagecup-maxfirmness"\n        ).expect("breast macro");\n        assert!(wf(&params(0.5, 1.0)) > 0.99);\n        assert!(wf(&params(0.5, 0.5)) < 1e-6);\n    }\n}\n\n/// Choose a weight function for a core-pack target.\n'''
    text = replace_once(text, test_anchor, test_replacement, "breast macro tests")

    path.write_text(text, encoding="utf-8")
    print(f"Patched WASM runtime: {path}")


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: patch_oxihuman_charactermaker.py /path/to/oxihuman")

    root = Path(sys.argv[1]).resolve()
    patch_pack_builder(root)
    patch_wasm_runtime(root)
    print("CharacterMaker body runtime patch complete")
    print("Direct detail targets:")
    for target in DETAIL_TARGETS:
        print(f"  - {target}")
    print("Breast macro axes: cupsize + breast_firmness (144 authored corners + implicit neutral base)")


if __name__ == "__main__":
    main()
