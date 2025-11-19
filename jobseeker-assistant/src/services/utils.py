import pdfkit
import pypandoc
from pathlib import Path

def cleanup(folder_path, extensions=[".md", ".docx", ".pdf"]):
    folder = Path(folder_path)
    if not folder.exists() or not folder.is_dir():
        print(f"Folder {folder_path} does not exist or is not a directory.")
        return

    for ext in extensions:
        for file in folder.glob(f"*{ext}"):
            try:
                file.unlink()  # deletes the file
                print(f"Deleted: {file}")
            except Exception as e:
                print(f"Failed to delete {file}: {e}")

def markdown_to_docx_and_pdf(export_config, md_text, name, export_type = "resume"):
    """
    Converts Markdown text to both DOCX and PDF using Pandoc.
    """
    # Save Markdown temporarily (Pandoc can read from a file or string)
    export_type=export_type.strip().lower().replace("generate","").replace(" ","-")
    output_base = f"{export_config['path']}/{name}-{export_type}"
    md_path = Path(f"{output_base}.md")
    md_path.write_text(md_text, encoding="utf-8")

    # DOCX conversion
    docx_path = f"{output_base}.docx"
    pypandoc.convert_file(
        str(md_path), 
        "docx", 
        outputfile=docx_path,
        extra_args=export_config['args'].get("docx", [])
    )
    print(f"✅ DOCX saved to {docx_path}")

    # PDF conversion
    pdf_path = f"{output_base}.pdf"
    pypandoc.convert_file(
        str(md_path), 
        "pdf", 
        outputfile=pdf_path,
        extra_args=export_config['args'].get("pdf", [])
    )
    print(f"✅ PDF saved to {pdf_path}")

    # Optional cleanup of temp Markdown file
    md_path.unlink()

    return docx_path, pdf_path