"""Generate installable static TTF files from GT Planar VF woff2.

Uses woff2 decompress + static instancing with overlap removal.
Required: pip install fonttools brotli skia-pathops
"""
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.ttLib.woff2 import decompress
from fontTools.varLib.instancer import OverlapMode, instantiateVariableFont

SRC = Path(__file__).resolve().parent / "GT-Planar-VF.woff2"
OUT = Path(__file__).resolve().parent / "install"
DECOMP = OUT / "_source-vf.ttf"
FAMILY = "GT Planar"

WEIGHTS = {
    300: "Light",
    400: "Regular",
    500: "Medium",
    600: "Semibold",
    700: "Bold",
    900: "Black",
}

MANUAL_NAME_WEIGHTS = {600}


def set_static_names(font, subfamily: str) -> None:
    ps_name = f"{FAMILY.replace(' ', '')}-{subfamily}"
    full_name = f"{FAMILY} {subfamily}"
    name_table = font["name"]

    for platform in ((3, 1, 0x409), (1, 0, 0)):
        name_table.setName(FAMILY, 1, *platform)
        name_table.setName(subfamily, 2, *platform)
        name_table.setName(full_name, 4, *platform)
        name_table.setName(ps_name, 6, *platform)


def save_font(font: TTFont, path: Path) -> None:
    font.flavor = None
    font.save(path, reorderTables=True)


def build_static(source: Path, weight: int, label: str) -> None:
    instance = instantiateVariableFont(
        TTFont(source),
        {"wght": weight, "slnt": 0},
        static=True,
        updateFontNames=weight not in MANUAL_NAME_WEIGHTS,
        overlap=OverlapMode.REMOVE,
    )

    if weight in MANUAL_NAME_WEIGHTS:
        set_static_names(instance, label)

    if "fvar" in instance:
        raise RuntimeError(f"{label} ainda contém tabela fvar")

    save_font(instance, OUT / f"GT-Planar-{label}.ttf")


def main() -> None:
    OUT.mkdir(exist_ok=True)

    print("Descompactando woff2...")
    decompress(str(SRC), str(DECOMP))

    for weight, label in WEIGHTS.items():
        build_static(DECOMP, weight, label)
        print(f"OK: GT-Planar-{label}.ttf (wght={weight})")

    DECOMP.unlink(missing_ok=True)
    print("Concluído.")


if __name__ == "__main__":
    main()
