#!/usr/bin/env python3
"""Validate the OxiHuman core pack provenance required by CharacterBody v4."""
from __future__ import annotations

import json
import sys
from pathlib import Path

DIRECT_TARGETS = {
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
}


def breast_macro_targets() -> set[str]:
    return {
        f"breast/female-{age}-{muscle}-{weight}-{cup}-{firmness}"
        for age in ("young", "old")
        for muscle in ("minmuscle", "averagemuscle", "maxmuscle")
        for weight in ("minweight", "averageweight", "maxweight")
        for cup in ("mincup", "averagecup", "maxcup")
        for firmness in ("minfirmness", "averagefirmness", "maxfirmness")
    }


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: validate_charactermaker_body_pack.py provenance.json")

    path = Path(sys.argv[1])
    data = json.loads(path.read_text(encoding="utf-8"))
    rows = data.get("targets", [])
    names = {row.get("name") for row in rows if isinstance(row, dict) and isinstance(row.get("name"), str)}
    expected_macro = breast_macro_targets()

    missing_direct = sorted(DIRECT_TARGETS - names)
    missing_macro = sorted(expected_macro - names)
    if missing_direct:
        raise SystemExit(f"Missing CharacterBody direct shape targets ({len(missing_direct)}): {missing_direct[:20]}")
    if missing_macro:
        raise SystemExit(f"Missing CharacterBody breast macro corners ({len(missing_macro)}): {missing_macro[:20]}")

    categorized_direct = {
        row["name"] for row in rows
        if isinstance(row, dict) and row.get("category") == "charactermaker_shape" and isinstance(row.get("name"), str)
    }
    categorized_macro = {
        row["name"] for row in rows
        if isinstance(row, dict) and row.get("category") == "charactermaker_breast_macro" and isinstance(row.get("name"), str)
    }
    if not DIRECT_TARGETS.issubset(categorized_direct):
        raise SystemExit("CharacterBody direct targets are present but not categorized as charactermaker_shape")
    if not expected_macro.issubset(categorized_macro):
        raise SystemExit("CharacterBody macro targets are present but not categorized as charactermaker_breast_macro")

    explicit_tokens = ("nipple", "areola", "genital", "penis", "vagina")
    leaked = sorted(name for name in names if any(token in name.lower() for token in explicit_tokens))
    if leaked:
        raise SystemExit(f"Explicit anatomy targets leaked into CharacterBody pack: {leaked[:20]}")

    non_adult = sorted(name for name in categorized_macro if "child" in name or "baby" in name)
    if non_adult:
        raise SystemExit(f"Non-adult breast macro leaked into CharacterBody pack: {non_adult[:20]}")

    print(f"CHARACTERBODY_DIRECT_TARGETS={len(DIRECT_TARGETS)}")
    print(f"CHARACTERBODY_BREAST_MACRO_TARGETS={len(expected_macro)}")
    print(f"CHARACTERBODY_TOTAL_TARGETS={len(names)}")
    print(f"CHARACTERBODY_PACK_VALID={path}")


if __name__ == "__main__":
    main()
