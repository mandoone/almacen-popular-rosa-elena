#!/usr/bin/env python3
"""Genera un PDF A4 desde un informe HTML aprobado usando estilos de pantalla."""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path


PLAYWRIGHT_INSTALL_HELP = """Playwright Python no está disponible.
Instálelo manualmente con:
  python -m pip install playwright
  python -m playwright install chromium
"""


def positive_scale(value: str) -> float:
    """Convierte y valida la escala solicitada."""
    try:
        scale = float(value)
    except ValueError as error:
        raise argparse.ArgumentTypeError("--scale debe ser un número") from error

    if scale <= 0:
        raise argparse.ArgumentTypeError("--scale debe ser mayor que 0")
    return scale


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Genera un PDF A4 desde el HTML aprobado usando Chromium/Playwright "
            "con media=screen."
        )
    )
    parser.add_argument("input_html", type=Path, help="HTML aprobado de entrada")
    parser.add_argument(
        "output_pdf",
        type=Path,
        nargs="?",
        help="PDF de salida (por defecto: mismo nombre base que el HTML)",
    )
    parser.add_argument(
        "--scale",
        type=positive_scale,
        default=0.98,
        help="Escala del PDF; estándar validado: 0.98 (por defecto: 0.98)",
    )
    parser.add_argument(
        "--chromium",
        type=Path,
        help="Ruta al ejecutable de Chromium; prevalece sobre CHROMIUM_PATH",
    )
    return parser.parse_args()


def resolve_paths(args: argparse.Namespace) -> tuple[Path, Path, Path | None]:
    input_html = args.input_html.expanduser().resolve()
    if not input_html.is_file():
        raise FileNotFoundError(f"No existe el HTML de entrada: {input_html}")

    output_pdf = (
        args.output_pdf.expanduser().resolve()
        if args.output_pdf
        else input_html.with_suffix(".pdf")
    )

    chromium_value = args.chromium or (
        Path(os.environ["CHROMIUM_PATH"]) if os.environ.get("CHROMIUM_PATH") else None
    )
    chromium_path = chromium_value.expanduser().resolve() if chromium_value else None
    if chromium_path is not None and not chromium_path.is_file():
        raise FileNotFoundError(f"No existe el ejecutable de Chromium: {chromium_path}")

    return input_html, output_pdf, chromium_path


def render_pdf(
    input_html: Path,
    output_pdf: Path,
    scale: float,
    chromium_path: Path | None,
) -> None:
    try:
        from playwright.sync_api import Error as PlaywrightError
        from playwright.sync_api import sync_playwright
    except ImportError as error:
        raise RuntimeError(PLAYWRIGHT_INSTALL_HELP) from error

    html = input_html.read_text(encoding="utf-8-sig")
    output_pdf.parent.mkdir(parents=True, exist_ok=True)

    launch_options = {}
    if chromium_path is not None:
        launch_options["executable_path"] = str(chromium_path)

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(**launch_options)
            try:
                page = browser.new_page()
                page.set_content(html, wait_until="load")
                page.evaluate("document.fonts.ready")
                page.evaluate(
                    """
                    () => Promise.all(
                      Array.from(document.images, (image) => {
                        if (image.complete) return Promise.resolve();
                        return new Promise((resolve) => {
                          image.addEventListener('load', resolve, { once: true });
                          image.addEventListener('error', resolve, { once: true });
                        });
                      })
                    )
                    """
                )
                page.emulate_media(media="screen")
                page.pdf(
                    path=str(output_pdf),
                    format="A4",
                    print_background=True,
                    prefer_css_page_size=True,
                    display_header_footer=False,
                    margin={
                        "top": "0mm",
                        "right": "0mm",
                        "bottom": "0mm",
                        "left": "0mm",
                    },
                    scale=scale,
                )
            finally:
                browser.close()
    except PlaywrightError as error:
        raise RuntimeError(
            "No fue posible generar el PDF con Chromium/Playwright.\n"
            f"Detalle: {error}\n"
            "Si falta el navegador, ejecute manualmente:\n"
            "  python -m playwright install chromium"
        ) from error


def main() -> int:
    args = parse_args()
    try:
        input_html, output_pdf, chromium_path = resolve_paths(args)
        render_pdf(input_html, output_pdf, args.scale, chromium_path)
    except (FileNotFoundError, OSError, RuntimeError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1

    print(f"PDF generado: {output_pdf}")
    print("QA visual HTML vs PDF es obligatorio antes de marcar el archivo como FINAL.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
