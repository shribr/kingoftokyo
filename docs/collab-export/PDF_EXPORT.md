# PDF Export Guidance

## Option 1: Pandoc (Recommended)
```bash
brew install pandoc
pandoc ../../AI_HUMAN_COLLABORATION.md -o AI_HUMAN_COLLABORATION.pdf --from markdown --toc --pdf-engine=xelatex
```
Optional: include executive summary first:
```bash
pandoc AI_HUMAN_COLLABORATION.EXEC_SUMMARY.md ../../AI_HUMAN_COLLABORATION.md -o COLLAB_FULL.pdf --from markdown --toc --pdf-engine=xelatex
```

## Option 2: wkhtmltopdf (Preserves HTML Rendering)
```bash
brew install wkhtmltopdf
# (If desired) Convert markdown to HTML first
pandoc ../../AI_HUMAN_COLLABORATION.md -o collab.html
wkhtmltopdf collab.html AI_HUMAN_COLLABORATION.pdf
```

## Option 3: VS Code Print-to-PDF
1. Open `AI_HUMAN_COLLABORATION.md`
2. Use a Markdown preview extension (e.g., built-in or Markdown PDF)
3. Export/Print to PDF (ensuring images resolve relatively)

## Tips
- Use `--toc-depth=3` with Pandoc if you want a shorter TOC.
- Add custom cover: create `cover.md` then place it first in the pandoc command.
- For narrower pages: add `-V geometry:margin=1in`.

## Example With Cover & Exec Summary
```bash
pandoc cover.md AI_HUMAN_COLLABORATION.EXEC_SUMMARY.md ../../AI_HUMAN_COLLABORATION.md \
  -o COLLAB_WITH_COVER.pdf --from markdown --pdf-engine=xelatex \
  -V geometry:margin=1in --toc --toc-depth=3
```
