#!/usr/bin/env python3
import json
import sys

from pypdf import PdfReader, PdfWriter
from pypdf.generic import BooleanObject, NameObject, TextStringObject


def apply_fields(field_refs, values):
    for ref in field_refs:
        field = ref.get_object()
        name = field.get("/T")

        if name in values:
            value = values[name]
            field_type = field.get("/FT")

            if field_type == "/Btn":
                if isinstance(value, str) and value.startswith("/"):
                    state_name = NameObject(value)
                else:
                    state_name = NameObject(str(value))

                field.update(
                    {
                        NameObject("/V"): state_name,
                        NameObject("/AS"): state_name,
                    }
                )
            else:
                text_value = str(value)
                field.update(
                    {
                        NameObject("/V"): TextStringObject(text_value),
                        NameObject("/DV"): TextStringObject(text_value),
                    }
                )

        kids = field.get("/Kids")
        if kids:
            apply_fields(kids, values)


def main() -> int:
    if len(sys.argv) != 4:
        print("Usage: fill_pdf_fields.py <template> <output> <fields_json>", file=sys.stderr)
        return 1

    template_path = sys.argv[1]
    output_path = sys.argv[2]
    fields_json_path = sys.argv[3]

    with open(fields_json_path, "r", encoding="utf-8") as fh:
        fields = json.load(fh)

    reader = PdfReader(template_path)
    writer = PdfWriter()
    writer.clone_document_from_reader(reader)

    root = writer._root_object
    acro = root.get("/AcroForm")
    if acro is not None:
        acro_fields = acro.get("/Fields")
        if acro_fields:
            apply_fields(acro_fields, fields)
        acro.update({NameObject("/NeedAppearances"): BooleanObject(True)})

    # Some templates keep visible widget annotations detached from the AcroForm
    # field array after cloning. Update page annotations as well to ensure
    # checkbox states and text values are actually rendered.
    for page in writer.pages:
        annots = page.get("/Annots")
        if annots:
            apply_fields(annots, fields)

    with open(output_path, "wb") as out:
        writer.write(out)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
