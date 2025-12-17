import asyncio
import pdfkit
import pypandoc
from pathlib import Path
from typing import Tuple

export_config = None

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

async def markdown_to_docx_and_pdf(md_text: str, name: str, role: str = "", export_type: str = "resume") -> Tuple[str, str]:
    """
    Asynchronously converts Markdown text to both DOCX and PDF using Pandoc.

    Args:
        md_text (str): The Markdown content to convert.
        role (str): The role for the output files.
        name (str): The base name for the output files.
        export_type (str): The type of export (e.g., "resume", "cover-letter"). Defaults to "resume".

    Returns:
        Tuple[str, str]: Paths to the generated DOCX and PDF files.

    Raises:
        RuntimeError: If export configuration is not set.
        ValueError: If inputs are invalid.
        Exception: For conversion or file operation errors.
    """
    if export_config is None:
        raise RuntimeError("Export configuration not set. Call set_export_config() first.")

    if not md_text or not isinstance(md_text, str):
        raise ValueError("md_text must be a non-empty string.")

    if not name or not isinstance(name, str):
        raise ValueError("name must be a non-empty string.")

    # Sanitize export_type
    export_type = export_type.lower().replace("generate", "").strip()

    title = f"{name}-{role}-{export_type}".strip().lower().replace(" ", "-")

    # Save Markdown temporarily (Pandoc can read from a file or string)
    output_base = f"{export_config['path']}/{title}"
    md_path = Path(f"{output_base}.md")
    await asyncio.to_thread(md_path.write_text, md_text, encoding="utf-8")

    # DOCX conversion
    docx_path = f"{output_base}.docx"
    await asyncio.to_thread(
        pypandoc.convert_file,
        str(md_path),
        "docx",
        outputfile=docx_path,
        extra_args=export_config['args'].get("docx", [])
    )

    # PDF conversion
    pdf_path = f"{output_base}.pdf"
    await asyncio.to_thread(
        pypandoc.convert_file,
        str(md_path),
        "pdf",
        outputfile=pdf_path,
        extra_args=export_config['args'].get("pdf", [])
    )

    # Optional cleanup of temp Markdown file
    await asyncio.to_thread(md_path.unlink)

    return docx_path, pdf_path

def set_export_config(config: dict) -> None:
    global export_config
    export_config = config

def read(source):
    if not isinstance(source, str):
        raise ValueError("Source must be a string.")

    if source.startswith('file://'):
        file_path_str = source[7:]  # Remove 'file://' prefix
        if not file_path_str.strip():
            raise ValueError("File path is empty or whitespace after 'file://'.")

        file_path = Path(file_path_str)
        try:
            return file_path.read_text(encoding='utf-8')
        except FileNotFoundError:
            raise FileNotFoundError(f"File not found: {file_path}")
        except PermissionError:
            raise PermissionError(f"Permission denied reading file: {file_path}")
        except UnicodeDecodeError:
            raise UnicodeDecodeError(f"File encoding error (not UTF-8?): {file_path}")
        except Exception as e:
            raise Exception(f"Unexpected error reading file {file_path}: {e}")
    else:
        return source
