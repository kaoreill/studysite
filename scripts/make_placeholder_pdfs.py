#!/usr/bin/env python3
"""Generate minimal one-page placeholder PDFs for each module's week 1 notes."""

import os

MODULES = [
    ("ml", "Machine Learning"),
    ("sustainability", "Quantitative Methods to Assess Sustainability"),
    ("process-mining", "Process Mining"),
    ("cybersecurity", "Cybersecurity Fundamentals"),
]


def make_pdf(text: str) -> bytes:
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    stream = f"BT /F1 18 Tf 72 700 Td ({text}) Tj ET".encode("latin-1")
    objects.append(b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"\nendstream")

    out = bytearray(b"%PDF-1.4\n")
    offsets = []
    for i, obj in enumerate(objects, start=1):
        offsets.append(len(out))
        out += f"{i} 0 obj\n".encode() + obj + b"\nendobj\n"
    xref_offset = len(out)
    out += f"xref\n0 {len(objects) + 1}\n".encode()
    out += b"0000000000 65535 f \n"
    for off in offsets:
        out += f"{off:010d} 00000 n \n".encode()
    out += (f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
            f"startxref\n{xref_offset}\n%%EOF").encode()
    return bytes(out)


def main():
    for slug, title in MODULES:
        text = (
            f"Week 1 placeholder notes - {title}. Replace this file with "
            f"your real lecture PDF at notes/{slug}/week-01/lecture.pdf."
        )
        out_dir = os.path.join("notes", slug, "week-01")
        os.makedirs(out_dir, exist_ok=True)
        out_path = os.path.join(out_dir, "lecture.pdf")
        with open(out_path, "wb") as f:
            f.write(make_pdf(text))
        print(f"wrote {out_path}")


if __name__ == "__main__":
    main()
