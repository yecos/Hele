#!/usr/bin/env python3
"""
Genera el PDF: PROTOCOLO ANTI-ERRORES Y PROTECCION DE DATOS
Proyecto XuperStream v1.0
"""

import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, black, white, gray, lightgrey
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ─── Configuration ───────────────────────────────────────────────────────────
OUTPUT_PATH = "/home/z/my-project/docs/PROTOCOLO_ANTI_ERRORES_XUPERSTREAM.pdf"
PAGE_W, PAGE_H = A4  # 595.27 x 841.89 points
MARGIN_LEFT = 50
MARGIN_RIGHT = 50
MARGIN_TOP = 60
MARGIN_BOTTOM = 60
HEADER_TEXT = "XuperStream - Protocolo Anti-Errores y Proteccion de Datos - v1.0"
DARK_GRAY = HexColor("#333333")
ACCENT_BLUE = HexColor("#1a3a5c")
ACCENT_RED = HexColor("#8b0000")
WARN_BG = HexColor("#fff3f3")
CODE_BG = HexColor("#f0f0f0")
TABLE_HEADER_BG = HexColor("#1a3a5c")
TABLE_ALT_BG = HexColor("#f5f5f5")
LIGHT_LINE = HexColor("#cccccc")

# ─── Page number tracking ────────────────────────────────────────────────────
class PageTracker:
    def __init__(self):
        self.pages = [0]  # cover is page 1

tracker = PageTracker()

def header_footer(canvas_obj, doc):
    """Draw header and footer on each page."""
    canvas_obj.saveState()
    page_num = doc.page

    # ── Header ──
    canvas_obj.setStrokeColor(LIGHT_LINE)
    canvas_obj.setLineWidth(0.5)
    y_header = PAGE_H - 40
    canvas_obj.line(MARGIN_LEFT, y_header, PAGE_W - MARGIN_RIGHT, y_header)

    canvas_obj.setFont("Helvetica", 7)
    canvas_obj.setFillColor(DARK_GRAY)
    canvas_obj.drawString(MARGIN_LEFT, y_header + 6, HEADER_TEXT)
    canvas_obj.drawRightString(PAGE_W - MARGIN_RIGHT, y_header + 6, f"P\u00e1g. {page_num}")

    # ── Footer ──
    y_footer = 35
    canvas_obj.setStrokeColor(LIGHT_LINE)
    canvas_obj.line(MARGIN_LEFT, y_footer, PAGE_W - MARGIN_RIGHT, y_footer)

    canvas_obj.setFont("Helvetica", 8)
    canvas_obj.setFillColor(DARK_GRAY)
    canvas_obj.drawCentredString(PAGE_W / 2, y_footer - 14, f"- {page_num} -")

    canvas_obj.restoreState()


def header_footer_cover(canvas_obj, doc):
    """Minimal header/footer for cover page."""
    canvas_obj.saveState()
    canvas_obj.setStrokeColor(LIGHT_LINE)
    canvas_obj.setLineWidth(0.5)
    y_footer = 35
    canvas_obj.line(MARGIN_LEFT, y_footer, PAGE_W - MARGIN_RIGHT, y_footer)
    canvas_obj.setFont("Helvetica", 8)
    canvas_obj.setFillColor(DARK_GRAY)
    canvas_obj.drawCentredString(PAGE_W / 2, y_footer - 14, "- 1 -")
    canvas_obj.restoreState()

# ─── Styles ──────────────────────────────────────────────────────────────────
styles = getSampleStyleSheet()

s_title_cover = ParagraphStyle(
    "TitleCover", parent=styles["Title"],
    fontName="Helvetica-Bold", fontSize=32, leading=38,
    textColor=ACCENT_BLUE, alignment=TA_CENTER, spaceAfter=6
)
s_subtitle_cover = ParagraphStyle(
    "SubtitleCover", parent=styles["Title"],
    fontName="Helvetica-Bold", fontSize=28, leading=34,
    textColor=ACCENT_BLUE, alignment=TA_CENTER, spaceAfter=20
)
s_cover_desc = ParagraphStyle(
    "CoverDesc", parent=styles["Normal"],
    fontName="Helvetica", fontSize=14, leading=18,
    textColor=DARK_GRAY, alignment=TA_CENTER, spaceAfter=6
)
s_cover_subdesc = ParagraphStyle(
    "CoverSubDesc", parent=styles["Normal"],
    fontName="Helvetica", fontSize=10, leading=14,
    textColor=DARK_GRAY, alignment=TA_CENTER, spaceAfter=4
)
s_cover_footer = ParagraphStyle(
    "CoverFooter", parent=styles["Normal"],
    fontName="Courier", fontSize=8, leading=11,
    textColor=DARK_GRAY, alignment=TA_CENTER, spaceBefore=30
)

s_toc_title = ParagraphStyle(
    "TOCTitle", parent=styles["Heading1"],
    fontName="Helvetica-Bold", fontSize=18, leading=22,
    textColor=ACCENT_BLUE, alignment=TA_LEFT, spaceBefore=10, spaceAfter=16
)
s_toc_entry = ParagraphStyle(
    "TOCEntry", parent=styles["Normal"],
    fontName="Helvetica", fontSize=11, leading=18,
    textColor=DARK_GRAY, alignment=TA_LEFT
)

s_section = ParagraphStyle(
    "SectionHead", parent=styles["Heading1"],
    fontName="Helvetica-Bold", fontSize=16, leading=20,
    textColor=ACCENT_BLUE, alignment=TA_LEFT,
    spaceBefore=14, spaceAfter=10
)
s_subsection = ParagraphStyle(
    "SubsectionHead", parent=styles["Heading2"],
    fontName="Helvetica-Bold", fontSize=13, leading=16,
    textColor=DARK_GRAY, alignment=TA_LEFT,
    spaceBefore=12, spaceAfter=6
)
s_subsubsection = ParagraphStyle(
    "SubSubsectionHead", parent=styles["Heading3"],
    fontName="Helvetica-Bold", fontSize=11, leading=14,
    textColor=DARK_GRAY, alignment=TA_LEFT,
    spaceBefore=8, spaceAfter=4
)
s_body = ParagraphStyle(
    "BodyText2", parent=styles["Normal"],
    fontName="Helvetica", fontSize=10, leading=13,
    textColor=DARK_GRAY, alignment=TA_JUSTIFY,
    spaceBefore=2, spaceAfter=4
)
s_bullet = ParagraphStyle(
    "BulletItem", parent=s_body,
    fontName="Helvetica", fontSize=10, leading=13,
    leftIndent=20, bulletIndent=8, spaceBefore=1, spaceAfter=1
)
s_numbered = ParagraphStyle(
    "NumberedItem", parent=s_body,
    fontName="Helvetica", fontSize=10, leading=13,
    leftIndent=24, bulletIndent=8, spaceBefore=1, spaceAfter=1
)
s_code = ParagraphStyle(
    "CodeBlock", parent=styles["Code"],
    fontName="Courier", fontSize=9, leading=12,
    textColor=DARK_GRAY, backColor=CODE_BG,
    leftIndent=12, rightIndent=12, spaceBefore=4, spaceAfter=4
)
s_alert_title = ParagraphStyle(
    "AlertTitle", parent=styles["Normal"],
    fontName="Helvetica-Bold", fontSize=10, leading=13,
    textColor=ACCENT_RED, alignment=TA_LEFT, spaceBefore=4, spaceAfter=2
)
s_alert_body = ParagraphStyle(
    "AlertBody", parent=styles["Normal"],
    fontName="Helvetica", fontSize=9, leading=12,
    textColor=ACCENT_RED, alignment=TA_LEFT, leftIndent=10
)
s_table_header = ParagraphStyle(
    "TableHeader", parent=styles["Normal"],
    fontName="Helvetica-Bold", fontSize=9, leading=11,
    textColor=white, alignment=TA_CENTER
)
s_table_cell = ParagraphStyle(
    "TableCell", parent=styles["Normal"],
    fontName="Helvetica", fontSize=9, leading=11,
    textColor=DARK_GRAY, alignment=TA_LEFT
)
s_table_cell_center = ParagraphStyle(
    "TableCellCenter", parent=styles["Normal"],
    fontName="Helvetica", fontSize=9, leading=11,
    textColor=DARK_GRAY, alignment=TA_CENTER
)
s_checklist = ParagraphStyle(
    "ChecklistItem", parent=s_body,
    fontName="Helvetica", fontSize=10, leading=13,
    leftIndent=24, bulletIndent=8, spaceBefore=1, spaceAfter=1
)

# ─── Helper functions ────────────────────────────────────────────────────────
def heading(text):
    return Paragraph(text, s_section)

def subheading(text):
    return Paragraph(text, s_subsection)

def subsubheading(text):
    return Paragraph(text, s_subsubsection)

def body(text):
    return Paragraph(text, s_body)

def bullet(text):
    return Paragraph(f"\u2022 {text}", s_bullet)

def numbered(num, text):
    return Paragraph(f"<b>{num}.</b> {text}", s_numbered)

def code_block(text):
    return Paragraph(text.replace("\n", "<br/>"), s_code)

def alert_box(title, text):
    data = [[Paragraph(f"<b>{title}</b>", s_alert_title)],
            [Paragraph(text, s_alert_body)]]
    t = Table(data, colWidths=[PAGE_W - MARGIN_LEFT - MARGIN_RIGHT - 20])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), WARN_BG),
        ("BOX", (0, 0), (-1, -1), 0.5, ACCENT_RED),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    return t

def info_box(title, text):
    s_info_title = ParagraphStyle("InfoTitle", parent=s_alert_title, textColor=ACCENT_BLUE)
    s_info_body = ParagraphStyle("InfoBody", parent=s_alert_body, textColor=DARK_GRAY)
    data = [[Paragraph(f"<b>{title}</b>", s_info_title)],
            [Paragraph(text, s_info_body)]]
    t = Table(data, colWidths=[PAGE_W - MARGIN_LEFT - MARGIN_RIGHT - 20])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), HexColor("#eef3f9")),
        ("BOX", (0, 0), (-1, -1), 0.5, ACCENT_BLUE),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    return t

def make_table(headers, rows, col_widths=None):
    """Create a styled table with header row."""
    avail_w = PAGE_W - MARGIN_LEFT - MARGIN_RIGHT
    n = len(headers)
    if col_widths is None:
        col_widths = [avail_w / n] * n

    hdr_cells = [Paragraph(h, s_table_header) for h in headers]
    data = [hdr_cells]
    for row in rows:
        data.append([Paragraph(str(c), s_table_cell) for c in row])

    t = Table(data, colWidths=col_widths, repeatRows=1)
    style_cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), TABLE_HEADER_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
        ("TOPPADDING", (0, 0), (-1, 0), 6),
        ("GRID", (0, 0), (-1, -1), 0.4, LIGHT_LINE),
        ("TOPPADDING", (0, 1), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]
    # Alternate row colors
    for i in range(1, len(data)):
        if i % 2 == 0:
            style_cmds.append(("BACKGROUND", (0, i), (-1, i), TABLE_ALT_BG))
    t.setStyle(TableStyle(style_cmds))
    return t

def hr():
    return HRFlowable(width="100%", thickness=0.5, color=LIGHT_LINE, spaceBefore=6, spaceAfter=6)

def sp(h=6):
    return Spacer(1, h)

# ─── Build Document ──────────────────────────────────────────────────────────
def build_pdf():
    doc = SimpleDocTemplate(
        OUTPUT_PATH,
        pagesize=A4,
        leftMargin=MARGIN_LEFT,
        rightMargin=MARGIN_RIGHT,
        topMargin=MARGIN_TOP,
        bottomMargin=MARGIN_BOTTOM,
        title="PROTOCOLO ANTI-ERRORES Y PROTECCION DE DATOS - XuperStream",
        author="XuperStream",
        subject="Protocolo de seguridad y proteccion de datos"
    )

    story = []
    avail_w = PAGE_W - MARGIN_LEFT - MARGIN_RIGHT

    # ═══════════════════════════════════════════════════════════════════════
    # COVER PAGE
    # ═══════════════════════════════════════════════════════════════════════
    story.append(Spacer(1, 120))
    story.append(Paragraph("PROTOCOLO ANTI-ERRORES", s_title_cover))
    story.append(Spacer(1, 8))
    story.append(Paragraph("Y PROTECCION DE DATOS", s_subtitle_cover))
    story.append(Spacer(1, 30))
    story.append(HRFlowable(width="60%", thickness=2, color=ACCENT_BLUE, spaceBefore=0, spaceAfter=20))
    story.append(Paragraph("Trabajo seguro en XuperStream", s_cover_desc))
    story.append(Spacer(1, 16))
    story.append(Paragraph(
        "Manual de procedimientos obligatorios para la prevencion de errores, "
        "perdida de datos y gestion segura del proyecto.",
        s_cover_subdesc
    ))
    story.append(Spacer(1, 80))
    story.append(HRFlowable(width="80%", thickness=0.5, color=LIGHT_LINE, spaceBefore=0, spaceAfter=10))
    story.append(Paragraph(
        "Proyecto: XuperStream | Repositorio: github.com/yecos/Hele | "
        "Version: 1.0 | Fecha: 2026-04-27",
        s_cover_footer
    ))
    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════════
    # TABLE OF CONTENTS
    # ═══════════════════════════════════════════════════════════════════════
    story.append(Paragraph("TABLA DE CONTENIDOS", s_toc_title))
    story.append(hr())
    story.append(sp(8))

    toc_entries = [
        ("Seccion 1:", "Principios Fundamentales", "3"),
        ("Seccion 2:", "Protocolo de Inicio de Sesion", "5"),
        ("Seccion 3:", "Proteccion de Codigo Fuente", "8"),
        ("Seccion 4:", "Proteccion de Datos (Prisma/SQLite)", "10"),
        ("Seccion 5:", "Seguridad de la Aplicacion", "13"),
        ("Seccion 6:", "Gates de Calidad Obligatorios", "15"),
        ("Seccion 7:", "Gestion de Incidentes y Emergencias", "17"),
        ("Seccion 8:", "Comunicacion y Coordinacion", "19"),
        ("Seccion 9:", "Checklists Rapidas de Referencia", "21"),
        ("Anexo A:", "Archivos Criticos del Proyecto", "23"),
        ("Anexo B:", "Comandos Git Esenciales", "24"),
    ]
    toc_data = []
    for label, title, page in toc_entries:
        toc_data.append([
            Paragraph(f"<b>{label}</b> {title}", s_toc_entry),
            Paragraph(page, ParagraphStyle("TOCPage", parent=s_toc_entry, alignment=TA_RIGHT))
        ])

    toc_table = Table(toc_data, colWidths=[avail_w * 0.85, avail_w * 0.15])
    toc_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LINEBELOW", (0, 0), (-1, -1), 0.3, LIGHT_LINE),
    ]))
    story.append(toc_table)
    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════════
    # SECTION 1: PRINCIPIOS FUNDAMENTALES
    # ═══════════════════════════════════════════════════════════════════════
    story.append(heading("SECCION 1: PRINCIPIOS FUNDAMENTALES"))
    story.append(hr())

    story.append(subheading("1.1 Proposito del Protocolo"))
    story.append(body(
        "Este protocolo establece las reglas <b>obligatorias</b> para todas las sesiones de trabajo "
        "en el proyecto XuperStream. Su cumplimiento es responsabilidad de cada participante y no "
        "admite excepciones. Todo agente, desarrollador o colaborador debe conocer y seguir estos "
        "procedimientos desde el primer momento de su sesion de trabajo."
    ))
    story.append(sp(4))
    story.append(body(
        "El objetivo principal es garantizar la <b>integridad del codigo fuente</b>, la "
        "<b>proteccion de los datos</b>, la <b>continuidad del servicio</b> y la "
        "<b>trazabilidad completa</b> de todas las modificaciones realizadas en el proyecto."
    ))

    story.append(subheading("1.2 Los Tres Pilares"))
    story.append(body(
        "Todo procedimiento en este protocolo se sustenta en tres pilares fundamentales:"
    ))
    story.append(sp(4))

    pillar_data = [
        [Paragraph("<b>Pilar</b>", s_table_header),
         Paragraph("<b>Descripcion</b>", s_table_header),
         Paragraph("<b>Implementacion</b>", s_table_header)],
        [Paragraph("<b>REDUNDANCIA</b>", s_table_cell),
         Paragraph("Toda informacion critica debe existir en 2 o mas ubicaciones simultaneamente.", s_table_cell),
         Paragraph("Backup en Git tags, documentacion en bitacora, copias de seguridad periodicas.", s_table_cell)],
        [Paragraph("<b>TRAZABILIDAD</b>", s_table_cell),
         Paragraph("Cada cambio realizado debe ser rastreable hasta su autor, razon y momento exacto.", s_table_cell),
         Paragraph("Commits atomicos con mensajes descriptivos, bitacora actualizada, registro de sesiones.", s_table_cell)],
        [Paragraph("<b>VERIFICACION</b>", s_table_cell),
         Paragraph("Todo cambio debe ser verificado y validado antes de llegar a produccion.", s_table_cell),
         Paragraph("Gates de calidad, build local, revision de cambios, pruebas funcionales.", s_table_cell)],
    ]
    pt = Table(pillar_data, colWidths=[avail_w * 0.18, avail_w * 0.42, avail_w * 0.40])
    pt.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), TABLE_HEADER_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), white),
        ("GRID", (0, 0), (-1, -1), 0.4, LIGHT_LINE),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 2), (-1, 2), TABLE_ALT_BG),
    ]))
    story.append(pt)
    story.append(sp(6))

    story.append(subheading("1.3 Consecuencias de la Violacion"))
    story.append(body("El incumplimiento de este protocolo puede resultar en:"))
    story.append(sp(2))
    story.append(alert_box(
        "RIESGOS CRITICOS",
        "\u2022 <b>Perdida de datos</b>: Informacion irrecuperable en base de datos o archivos.\n"
        "\u2022 <b>Caída en produccion</b>: Errores que afectan a usuarios finales.\n"
        "\u2022 <b>Corrupcion del repositorio</b>: Historial Git dañado o irreversible.\n"
        "\u2022 <b>Conflictos irresolubles</b>: Duplicacion de trabajo y perdida de cambios.\n"
        "\u2022 <b>Violacion de seguridad</b>: Exposicion de datos sensibles o credenciales."
    ))
    story.append(sp(6))

    story.append(subheading("1.4 Cadena de Responsabilidad"))
    story.append(body(
        "Cuando multiples sesiones trabajan en paralelo, se establece la siguiente cadena de "
        "responsabilidad:"
    ))
    story.append(numbered(1, "Cada sesion es responsable de su propia rama de trabajo."))
    story.append(numbered(2, "El primer agente en iniciar sesion es el responsable de la coordinacion general."))
    story.append(numbered(3, "Todo conflicto debe ser resuelto mediante comunicacion directa antes de hacer merge."))
    story.append(numbered(4, "La bitacora es la fuente de verdad para el estado actual del proyecto."))
    story.append(numbered(5, "En caso de emergencia, el agente con acceso admin tiene prioridad para hotfixes."))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════════
    # SECTION 2: PROTOCOLO DE INICIO DE SESION
    # ═══════════════════════════════════════════════════════════════════════
    story.append(heading("SECCION 2: PROTOCOLO DE INICIO DE SESION"))
    story.append(hr())

    story.append(subheading("2.1 Checklist Obligatoria (7 Pasos)"))
    story.append(body(
        "Antes de comenzar cualquier trabajo en el proyecto, se debe completar la siguiente "
        "checklist en orden estricto. Ningun paso puede ser omitido."
    ))
    story.append(sp(4))

    story.append(info_box("PASO 1 - Leer LEE_PRIMERO.txt",
        "Abrir y leer completamente el archivo docs/LEE_PRIMERO.txt. Este archivo contiene "
        "informacion critica sobre el estado actual del proyecto y advertencias activas."))
    story.append(sp(4))
    story.append(info_box("PASO 2 - Leer INSTRUCTIVO_BITACORA.txt",
        "Abrir y leer completamente el archivo docs/INSTRUCTIVO_BITACORA.txt para entender "
        "el formato y las reglas de la bitacora del proyecto."))
    story.append(sp(4))
    story.append(info_box("PASO 3 - Actualizar repositorio local",
        "Ejecutar: <font face='Courier'>git pull origin main</font><br/>"
        "Verificar que no hay conflictos. Si los hay, resolverlos antes de continuar."))
    story.append(sp(4))
    story.append(info_box("PASO 4 - Verificar build",
        "Ejecutar: <font face='Courier'>bun run lint &amp;&amp; bun run build</font><br/>"
        "El build debe completar sin errores. Si falla, reportar inmediatamente."))
    story.append(sp(4))
    story.append(info_box("PASO 5 - Verificar canales de comunicacion",
        "Revisar que los canales de comunicacion del equipo estan activos y que no hay "
        "mensajes pendientes o alertas de otros miembros del equipo."))
    story.append(sp(4))
    story.append(info_box("PASO 6 - Crear o continuar rama",
        "Si inicia nueva tarea: <font face='Courier'>git checkout -b feat/descripcion-tarea</font><br/>"
        "Si continua trabajo: <font face='Courier'>git checkout nombre-rama</font><br/>"
        "NUNCA trabajar directamente en main (excepto hotfixes criticos)."))
    story.append(sp(4))
    story.append(info_box("PASO 7 - Registrar inicio de sesion",
        "Registrar en la bitacora el inicio de sesion con todos los campos requeridos "
        "(ver formato a continuacion)."))

    story.append(sp(8))
    story.append(subheading("2.2 Formato de Registro de Sesion"))
    story.append(body("Cada inicio de sesion debe documentarse con la siguiente informacion:"))
    story.append(sp(4))

    reg_data = [
        [Paragraph("<b>Campo</b>", s_table_header),
         Paragraph("<b>Descripcion</b>", s_table_header),
         Paragraph("<b>Ejemplo</b>", s_table_header)],
        [Paragraph("Fecha", s_table_cell),
         Paragraph("Fecha y hora de inicio", s_table_cell),
         Paragraph("2026-04-27 14:30 UTC", s_table_cell)],
        [Paragraph("Agente", s_table_cell),
         Paragraph("Nombre o identificador del agente", s_table_cell),
         Paragraph("Claude-3.5-Sonnet", s_table_cell)],
        [Paragraph("Objetivo", s_table_cell),
         Paragraph("Descripcion de la tarea a realizar", s_table_cell),
         Paragraph("Implementar sistema de favoritos", s_table_cell)],
        [Paragraph("Rama", s_table_cell),
         Paragraph("Nombre de la rama de trabajo", s_table_cell),
         Paragraph("feat/user-favorites", s_table_cell)],
        [Paragraph("Archivos", s_table_cell),
         Paragraph("Lista de archivos a modificar", s_table_cell),
         Paragraph("src/lib/db.ts, src/app/api/...", s_table_cell)],
    ]
    rt = Table(reg_data, colWidths=[avail_w * 0.15, avail_w * 0.40, avail_w * 0.45])
    rt.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), TABLE_HEADER_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), white),
        ("GRID", (0, 0), (-1, -1), 0.4, LIGHT_LINE),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 2), (-1, 2), TABLE_ALT_BG),
        ("BACKGROUND", (0, 4), (-1, 4), TABLE_ALT_BG),
    ]))
    story.append(rt)

    story.append(sp(8))
    story.append(subheading("2.3 Reglas de Cierre de Sesion"))
    story.append(body("Antes de finalizar una sesion de trabajo, se deben cumplir los siguientes requisitos:"))
    story.append(sp(2))
    story.append(numbered(1, "<b>Commit + Push</b>: Todos los cambios deben estar committeados y pusheados. No dejar cambios locales sin subir."))
    story.append(numbered(2, "<b>Actualizar bitacora</b>: Registrar los cambios realizados, archivos modificados y estado final."))
    story.append(numbered(3, "<b>Listar archivos</b>: Proporcionar la lista completa de archivos creados, modificados o eliminados."))
    story.append(numbered(4, "<b>Notificar al equipo</b>: Informar sobre el estado de la tarea y cualquier problema pendiente."))
    story.append(numbered(5, "<b>Verificar build</b>: Ejecutar bun run build para confirmar que el proyecto sigue compilando correctamente."))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════════
    # SECTION 3: PROTECCION DE CODIGO FUENTE
    # ═══════════════════════════════════════════════════════════════════════
    story.append(heading("SECCION 3: PROTECCION DE CODIGO FUENTE"))
    story.append(hr())

    story.append(subheading("3.1 Reglas de Commits"))
    story.append(body("Todos los commits deben seguir estas reglas obligatorias:"))
    story.append(sp(2))
    story.append(bullet("<b>Atomicos</b>: Cada commit debe representar un unico cambio logico. No mezclar funcionalidades no relacionadas."))
    story.append(bullet("<b>Descriptivos</b>: Usar prefijos estandar: <font face='Courier'>feat:</font>, <font face='Courier'>fix:</font>, <font face='Courier'>refactor:</font>, <font face='Courier'>docs:</font>, <font face='Courier'>style:</font>, <font face='Courier'>chore:</font>"))
    story.append(bullet("<b>Frecuentes</b>: Commits cada 15-30 minutos de trabajo activo. No acumular cambios grandes."))
    story.append(bullet("<b>Inmediatos</b>: Push inmediatamente despues de cada commit. No mantener commits locales sin pushear."))
    story.append(bullet("<b>Tags de backup</b>: Crear tags de backup antes de cualquier cambio riesgoso (ver seccion 3.3)."))

    story.append(sp(4))
    story.append(subheading("3.2 Prohibiciones Git Absolutas"))
    story.append(sp(2))
    story.append(alert_box(
        "PROHIBICIONES ABSOLUTAS - NUNCA EJECUTAR",
        "<font face='Courier'>git push --force</font> - Puede eliminar commits de otros colaboradores.<br/>"
        "<font face='Courier'>git reset --hard</font> en ramas compartidas - Destruye cambios sin recuperacion.<br/>"
        "<font face='Courier'>git add .</font> sin revision - Puede incluir archivos no deseados o datos sensibles.<br/>"
        "<font face='Courier'>git commit</font> con .env que contenga valores reales - Expone credenciales.<br/>"
        "Trabajar directamente en <font face='Courier'>main</font> - Excepto para hotfixes criticos con aprobacion."
    ))

    story.append(sp(8))
    story.append(subheading("3.3 Sistema de Tags de Backup"))
    story.append(body(
        "Los tags de backup son puntos de restauracion que permiten volver a un estado conocido "
        "del codigo en caso de problemas."
    ))
    story.append(sp(2))

    story.append(subsubheading("Formato del Tag"))
    story.append(code_block(
        "backup/AAAA-MM-DD/descripcion-corta<br/>"
        "Ejemplo: backup/2026-04-27/pre-favorites-feature<br/>"
        "Ejemplo: backup/2026-04-27/pre-auth-refactor"
    ))
    story.append(sp(2))

    tag_data = [
        [Paragraph("<b>Momento</b>", s_table_header),
         Paragraph("<b>Comando</b>", s_table_header),
         Paragraph("<b>Ejemplo</b>", s_table_header)],
        [Paragraph("Antes de nueva feature", s_table_cell),
         Paragraph("<font face='Courier'>git tag backup/... pre-nombre-feature</font>", s_table_cell),
         Paragraph("pre-user-favorites", s_table_cell)],
        [Paragraph("Antes de bugfix", s_table_cell),
         Paragraph("<font face='Courier'>git tag backup/... pre-fix-descripcion</font>", s_table_cell),
         Paragraph("pre-fix-auth-crash", s_table_cell)],
        [Paragraph("Antes de refactor", s_table_cell),
         Paragraph("<font face='Courier'>git tag backup/... pre-refactor-area</font>", s_table_cell),
         Paragraph("pre-refactor-api-routes", s_table_cell)],
        [Paragraph("Antes de deploy", s_table_cell),
         Paragraph("<font face='Courier'>git tag backup/... pre-deploy</font>", s_table_cell),
         Paragraph("pre-deploy-v1.2", s_table_cell)],
    ]
    tt = Table(tag_data, colWidths=[avail_w * 0.22, avail_w * 0.45, avail_w * 0.33])
    tt.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), TABLE_HEADER_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), white),
        ("GRID", (0, 0), (-1, -1), 0.4, LIGHT_LINE),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 2), (-1, 2), TABLE_ALT_BG),
        ("BACKGROUND", (0, 4), (-1, 4), TABLE_ALT_BG),
    ]))
    story.append(tt)

    story.append(sp(8))
    story.append(subheading("3.4 Recuperacion de Codigo"))
    story.append(body("Herramientas disponibles para recuperacion de codigo:"))
    story.append(sp(2))
    story.append(bullet("<b>git reflog</b>: Muestra el historial completo de operaciones HEAD. Util para encontrar commits perdidos."))
    story.append(bullet("<b>git checkout [tag]</b>: Restaura el codigo a un tag de backup especifico."))
    story.append(bullet("<b>git revert [commit]</b>: Crea un nuevo commit que deshace los cambios de un commit anterior (seguro)."))
    story.append(bullet("<b>git stash</b>: Guarda cambios temporales sin hacer commit para cambiar de rama."))
    story.append(bullet("<b>GitHub como backup</b>: El repositorio remoto actua como backup. Siempre verificar que los cambios estan pusheados."))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════════
    # SECTION 4: PROTECCION DE DATOS (PRISMA/SQLITE)
    # ═══════════════════════════════════════════════════════════════════════
    story.append(heading("SECCION 4: PROTECCION DE DATOS (PRISMA/SQLITE)"))
    story.append(hr())

    story.append(subheading("4.1 Reglas para Operaciones que Modifican Datos"))
    story.append(body(
        "Toda operacion que modifique datos en la base de datos debe seguir estas reglas estrictas "
        "para garantizar la integridad y seguridad de la informacion."
    ))
    story.append(sp(4))

    story.append(alert_box(
        "PROHIBICIONES ABSOLUTAS - DATOS",
        "\u2022 NUNCA eliminar datos sin confirmacion explicita del usuario o del admin.<br/>"
        "\u2022 NUNCA modificar el schema de Prisma sin ejecutar <font face='Courier'>bun run db:push</font> despues.<br/>"
        "\u2022 NUNCA commitear archivos .db al repositorio (incluidos en .gitignore).<br/>"
        "\u2022 NUNCA ejecutar operaciones destructivas (DROP, DELETE masivo) sin backup previo."
    ))

    story.append(sp(8))
    story.append(subheading("4.2 Mantenimiento de Datos Seed"))
    story.append(body(
        "Cuando el schema de Prisma cambie, es obligatorio actualizar el archivo "
        "<font face='Courier'>prisma/seed-data.ts</font> para reflejar la nueva estructura. "
        "Los datos seed garantizan que la aplicacion puede inicializarse correctamente desde cero."
    ))
    story.append(sp(2))
    story.append(bullet("Verificar que seed-data.ts coincide con el schema actual."))
    story.append(bullet("Incluir datos de prueba representativos."))
    story.append(bullet("Ejecutar <font face='Courier'>bun run db:seed</font> despues de cambios de schema."))

    story.append(sp(6))
    story.append(subheading("4.3 Consideraciones de Migracion: SQLite a PostgreSQL"))
    story.append(body(
        "El proyecto actualmente utiliza SQLite para desarrollo. La migracion a PostgreSQL para "
        "produccion requiere consideraciones especiales:"
    ))
    story.append(sp(2))
    story.append(bullet("El provider en schema.prisma debe cambiarse de <font face='Courier'>sqlite</font> a <font face='Courier'>postgresql</font>."))
    story.append(bullet("Los tipos de datos pueden variar entre SQLite y PostgreSQL."))
    story.append(bullet("Las funciones de SQLite (como datetime()) deben adaptarse."))
    story.append(bullet("Probar exhaustivamente todas las operaciones CRUD despues de la migracion."))
    story.append(bullet("Los datos seed deben ser compatibles con ambos motores."))

    story.append(sp(6))
    story.append(subheading("4.4 Plan de Recuperacion de Datos"))
    story.append(body("En caso de perdida o corrupcion de datos, seguir estos pasos en orden:"))
    story.append(sp(2))
    story.append(numbered(1, "<b>Detener la fuente de dano</b>: Identificar y detener el proceso que causo la perdida."))
    story.append(numbered(2, "<b>Evaluar el alcance</b>: Determinar que datos fueron afectados y la gravedad."))
    story.append(numbered(3, "<b>Verificar backups</b>: Revisar si existen backups recientes (Vercel, GitHub, dumps manuales)."))
    story.append(numbered(4, "<b>Revisar git log</b>: Verificar si los datos se pueden recuperar desde el historial de seed files."))
    story.append(numbered(5, "<b>Comunicar</b>: Informar al equipo y, si aplica, a los usuarios afectados."))
    story.append(numbered(6, "<b>Implementar medidas preventivas</b>: Corregir la causa raiz para evitar repeticion."))

    story.append(sp(6))
    story.append(subheading("4.5 Aislamiento de Datos Multiusuario"))
    story.append(body(
        "Cada usuario debe tener sus datos completamente aislados de los demas. Las consultas "
        "a la base de datos siempre deben filtrar por el identificador del usuario:"
    ))
    story.append(sp(2))
    story.append(bullet("<b>Favoritos</b>: Cada usuario tiene su propia lista de favoritos, filtrada por userId."))
    story.append(bullet("<b>Historial</b>: El historial de visualizacion es exclusivo de cada usuario."))
    story.append(bullet("<b>Playlists</b>: Las playlists creadas por un usuario no son visibles para otros."))

    story.append(sp(6))
    story.append(subheading("4.6 Proteccion de Datos de Administracion"))
    story.append(body(
        "Las rutas de administracion (<font face='Courier'>/api/admin/*</font>) estan protegidas "
        "por verificacion de rol. Solo los usuarios con rol <b>admin</b> pueden acceder a estas rutas. "
        "La verificacion se realiza en el servidor mediante JWT y no puede ser omitida desde el cliente."
    ))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════════
    # SECTION 5: SEGURIDAD DE LA APLICACION
    # ═══════════════════════════════════════════════════════════════════════
    story.append(heading("SECCION 5: SEGURIDAD DE LA APLICACION"))
    story.append(hr())

    story.append(subheading("5.1 Autenticacion en Rutas API"))
    story.append(body(
        "Todas las rutas protegidas de la API deben verificar el token JWT almacenado en una "
        "cookie httpOnly. La verificacion debe realizarse en <b>cada request</b> y nunca almacenar "
        "en caché el resultado de la autenticacion."
    ))
    story.append(sp(2))
    story.append(bullet("Verificar la existencia y validez del token JWT en cada endpoint protegido."))
    story.append(bullet("Si el token es invalido o ha expirado, devolver 401 Unauthorized."))
    story.append(bullet("Nunca confiar en datos del cliente sin verificacion en el servidor."))
    story.append(bullet("Implementar rate limiting en endpoints sensibles (login, registro)."))

    story.append(sp(6))
    story.append(subheading("5.2 Sistema JWT - Detalles Tecnicos"))
    story.append(sp(2))

    jwt_data = [
        [Paragraph("<b>Componente</b>", s_table_header),
         Paragraph("<b>Implementacion</b>", s_table_header)],
        [Paragraph("Hash de contrasenas", s_table_cell),
         Paragraph("SHA-256 con salt aleatorio para cada usuario", s_table_cell)],
        [Paragraph("Firma de tokens", s_table_cell),
         Paragraph("HMAC-SHA256 con JWT_SECRET del entorno", s_table_cell)],
        [Paragraph("Expiracion", s_table_cell),
         Paragraph("7 dias desde la emision del token", s_table_cell)],
        [Paragraph("Almacenamiento", s_table_cell),
         Paragraph("Cookie httpOnly (no accesible via JavaScript)", s_table_cell)],
        [Paragraph("Renovacion", s_table_cell),
         Paragraph("Token nuevo emitido al verificar token valido", s_table_cell)],
    ]
    jt = Table(jwt_data, colWidths=[avail_w * 0.30, avail_w * 0.70])
    jt.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), TABLE_HEADER_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), white),
        ("GRID", (0, 0), (-1, -1), 0.4, LIGHT_LINE),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 2), (-1, 2), TABLE_ALT_BG),
        ("BACKGROUND", (0, 4), (-1, 4), TABLE_ALT_BG),
    ]))
    story.append(jt)

    story.append(sp(6))
    story.append(subheading("5.3 Seguridad del Lado del Cliente"))
    story.append(body(
        "Las cookies httpOnly previenen que el token JWT sea robado mediante ataques XSS "
        "(Cross-Site Scripting). Sin embargo, se deben mantener las siguientes precauciones:"
    ))
    story.append(sp(2))
    story.append(bullet("Toda validacion debe realizarse en el servidor, nunca confiar solo en validacion del cliente."))
    story.append(bullet("Sanitizar entradas del usuario en formularios y campos de texto."))
    story.append(bullet("No exponer informacion sensible en el codigo del cliente (API keys, secrets)."))
    story.append(bullet("Utilizar Content Security Policy headers cuando sea posible."))

    story.append(sp(6))
    story.append(subheading("5.4 Variables de Entorno y Secretos"))
    story.append(sp(2))
    story.append(alert_box(
        "SECRETOS - SOLO EN VERCEL ENV VARS",
        "Las siguientes variables NUNCA deben estar codificadas en el codigo:<br/><br/>"
        "\u2022 <font face='Courier'>JWT_SECRET</font> - Clave para firmar tokens JWT<br/>"
        "\u2022 <font face='Courier'>DATABASE_URL</font> - URL de conexion a la base de datos<br/>"
        "\u2022 <font face='Courier'>NEXT_PUBLIC_APP_URL</font> - URL publica de la aplicacion<br/><br/>"
        "Estas variables SOLO deben configurarse en las Variables de Entorno de Vercel."
    ))

    story.append(sp(6))
    story.append(subheading("5.5 Seguridad de la Documentacion"))
    story.append(body(
        "Los archivos de documentacion del proyecto (instructivo y bitacora) son criticos para "
        "la coordinacion del equipo. Se aplican las siguientes reglas:"
    ))
    story.append(sp(2))
    story.append(bullet("Solo un editor a la vez puede modificar la bitacora."))
    story.append(bullet("Nunca eliminar entradas existentes de la bitacora (solo agregar nuevas)."))
    story.append(bullet("El instructivo solo debe modificarse con acuerdo del equipo."))
    story.append(bullet("Mantener un historial de versiones de los documentos de documentacion."))

    story.append(sp(6))
    story.append(subheading("5.6 Control de Acceso por Roles"))
    story.append(body(
        "El sistema implementa control de acceso basado en roles (RBAC) para proteger las rutas "
        "de la API:"
    ))
    story.append(sp(2))
    story.append(bullet("<b>Rutas de admin</b> (<font face='Courier'>/api/admin/*</font>): Protegidas por verificacion de rol admin."))
    story.append(bullet("<b>Rutas de usuario</b>: Protegidas por verificacion de userId, asegurando que cada usuario solo accede a sus propios datos."))
    story.append(bullet("<b>Rutas publicas</b>: No requieren autenticacion (login, registro, contenido publico)."))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════════
    # SECTION 6: GATES DE CALIDAD OBLIGATORIOS
    # ═══════════════════════════════════════════════════════════════════════
    story.append(heading("SECCION 6: GATES DE CALIDAD OBLIGATORIOS"))
    story.append(hr())

    story.append(body(
        "Los Gates de Calidad son puntos de verificacion obligatorios que deben aprobarse "
        "antes de avanzar a la siguiente fase del proceso de desarrollo. Ningun gate puede "
        "ser omitido bajo ninguna circunstancia."
    ))
    story.append(sp(6))

    story.append(subheading("Gate 1: Build Local (Obligatorio antes de commit)"))
    story.append(body("Antes de realizar cualquier commit, ejecutar:"))
    story.append(code_block("bun run lint &amp;&amp; bun run build"))
    story.append(sp(2))
    story.append(body("El build debe completar sin errores ni advertencias. Si falla:"))
    story.append(bullet("Revisar los errores reportados."))
    story.append(bullet("Corregir antes de continuar."))
    story.append(bullet("NUNCA commitear codigo que no compila."))

    story.append(sp(6))
    story.append(subheading("Gate 2: Revision de Cambios (Obligatorio antes de push)"))
    story.append(body("Antes de hacer push, revisar todos los cambios pendientes:"))
    story.append(code_block(
        "git status          # Ver archivos modificados<br/>"
        "git diff            # Ver cambios detallados<br/>"
        "git log --oneline -5  # Ver commits recientes"
    ))
    story.append(sp(2))
    story.append(body("Verificar que:"))
    story.append(bullet("Solo se incluyen archivos intencionales."))
    story.append(bullet("No hay datos sensibles (tokens, passwords, API keys)."))
    story.append(bullet("Los mensajes de commit son descriptivos y siguen el formato estandar."))

    story.append(sp(6))
    story.append(subheading("Gate 3: Verificacion Post-Deploy (Despues del deploy)"))
    story.append(body("Despues de cada deploy, verificar:"))
    story.append(sp(2))
    story.append(numbered(1, "<b>La aplicacion carga correctamente</b>: La URL principal responde sin errores."))
    story.append(numbered(2, "<b>Login funciona</b>: Un usuario puede autenticarse correctamente."))
    story.append(numbered(3, "<b>Funcionalidades afectadas probadas</b>: Las features modificadas funcionan como esperado."))
    story.append(numbered(4, "<b>Sin regresiones</b>: Las funcionalidades existentes no se han roto."))

    story.append(sp(6))
    story.append(subheading("Gate 4: Bitacora Actualizada (Antes de finalizar sesion)"))
    story.append(body("Antes de cerrar la sesion de trabajo, verificar que la bitacora contiene:"))
    story.append(sp(2))
    story.append(bullet("Todos los cambios realizados documentados."))
    story.append(bullet("Archivos creados, modificados o eliminados listados."))
    story.append(bullet("Problemas encontrados y soluciones aplicadas registrados."))
    story.append(bullet("Tareas pendientes o bloqueadores identificados."))

    story.append(sp(8))
    story.append(subheading("Checklist Maestra de Calidad (10 Items)"))
    story.append(sp(2))

    quality_items = [
        ("1", "Build pasa sin errores", "bun run lint &amp;&amp; bun run build"),
        ("2", "No hay datos sensibles en el codigo", "Verificar .env, tokens, passwords"),
        ("3", "No hay console.log en produccion", "Buscar y eliminar antes de push"),
        ("4", "Tipos TypeScript correctos", "Sin errores de tipado"),
        ("5", "Bitacora actualizada", "Todos los cambios documentados"),
        ("6", "Commits atomicos", "Un cambio logico por commit"),
        ("7", "Tags de backup creados", "Antes de cambios riesgosos"),
        ("8", "Aplicacion funcional", "Todas las features operativas"),
        ("9", "Sin dependencias rotas", "package.json actualizado"),
        ("10", "Revision por pares", "Otro agente reviso los cambios"),
    ]
    q_data = [[Paragraph("<b>#</b>", s_table_header),
                Paragraph("<b>Item</b>", s_table_header),
                Paragraph("<b>Verificacion</b>", s_table_header)]]
    for num, item, verif in quality_items:
        q_data.append([
            Paragraph(num, s_table_cell_center),
            Paragraph(item, s_table_cell),
            Paragraph(verif, s_table_cell),
        ])
    qt = Table(q_data, colWidths=[avail_w * 0.06, avail_w * 0.42, avail_w * 0.52])
    qt.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), TABLE_HEADER_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), white),
        ("GRID", (0, 0), (-1, -1), 0.4, LIGHT_LINE),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 2), (-1, 2), TABLE_ALT_BG),
        ("BACKGROUND", (0, 4), (-1, 4), TABLE_ALT_BG),
        ("BACKGROUND", (0, 6), (-1, 6), TABLE_ALT_BG),
        ("BACKGROUND", (0, 8), (-1, 8), TABLE_ALT_BG),
        ("BACKGROUND", (0, 10), (-1, 10), TABLE_ALT_BG),
    ]))
    story.append(qt)

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════════
    # SECTION 7: GESTION DE INCIDENTES Y EMERGENCIAS
    # ═══════════════════════════════════════════════════════════════════════
    story.append(heading("SECCION 7: GESTION DE INCIDENTES Y EMERGENCIAS"))
    story.append(hr())

    story.append(body(
        "Esta seccion define los procedimientos de respuesta ante incidentes criticos que "
        "afecten la produccion o la integridad del proyecto."
    ))
    story.append(sp(6))

    story.append(subheading("7.1 Bug Critico en Produccion"))
    story.append(alert_box(
        "PROCEDIMIENTO DE EMERGENCIA",
        "Seguir estos pasos en orden estricto y sin demora:"
    ))
    story.append(sp(4))
    story.append(numbered(1, "<b>Identificar alcance</b>: Determinar que funcionalidades o usuarios estan afectados."))
    story.append(numbered(2, "<b>Crear rama de hotfix</b>: <font face='Courier'>git checkout -b hotfix/descripcion</font>"))
    story.append(numbered(3, "<b>Crear tag de backup</b>: <font face='Courier'>git tag backup/.../pre-hotfix</font>"))
    story.append(numbered(4, "<b>Aplicar fix minimo</b>: Cambio mas pequeno posible que resuelva el problema."))
    story.append(numbered(5, "<b>Verificar</b>: Build local + pruebas funcionales del fix."))
    story.append(numbered(6, "<b>Deploy</b>: Push y deploy a produccion."))
    story.append(numbered(7, "<b>Notificar al equipo</b>: Informar sobre el incidente y la resolucion."))
    story.append(numbered(8, "<b>Documentar</b>: Registrar en bitacora el incidente completo, causa y solucion."))

    story.append(sp(6))
    story.append(subheading("7.2 Error de Build en Deploy"))
    story.append(body(
        "Si el build falla durante el despliegue en Vercel, seguir estos pasos:"
    ))
    story.append(sp(2))
    story.append(numbered(1, "<b>Verificar build local</b>: Ejecutar <font face='Courier'>bun run build</font> localmente."))
    story.append(numbered(2, "<b>Revisar logs de deploy</b>: Acceder a los logs de Vercel para identificar el error."))
    story.append(numbered(3, "<b>Verificar variables de entorno</b>: Comprobar que todas las env vars necesarias estan configuradas."))
    story.append(numbered(4, "<b>Verificar dependencias</b>: Asegurar que <font face='Courier'>package.json</font> esta actualizado y <font face='Courier'>bun install</font> fue ejecutado."))
    story.append(numbered(5, "<b>Revert rapido si es necesario</b>: Si no se puede resolver rapidamente, revertir al ultimo commit funcional."))

    story.append(sp(6))
    story.append(subheading("7.3 Perdida de Datos en Base de Datos"))
    story.append(body(
        "En caso de perdida o corrupcion de datos en la base de datos:"
    ))
    story.append(sp(2))
    story.append(numbered(1, "<b>Detener la fuente de dano</b>: Identificar y detener inmediatamente la causa."))
    story.append(numbered(2, "<b>Evaluar alcance</b>: Cuantos registros/usuarios fueron afectados."))
    story.append(numbered(3, "<b>Verificar backups</b>: Revisar dumps, backups de Vercel, seed data."))
    story.append(numbered(4, "<b>Revisar git log</b>: Buscar versiones anteriores de seed-data.ts o schemas."))
    story.append(numbered(5, "<b>Comunicar a usuarios</b>: Si aplica, informar sobre el impacto y las medidas tomadas."))
    story.append(numbered(6, "<b>Implementar medidas preventivas</b>: Agregar validaciones, backups automaticos, etc."))

    story.append(sp(6))
    story.append(subheading("7.4 Limites de Vercel"))
    story.append(body(
        "Vercel tiene limitaciones que deben considerarse para evitar problemas:"
    ))
    story.append(sp(2))
    story.append(bullet("<b>100 deploys/dia</b>: Planificar los deploys cuidadosamente. No hacer deploys innecesarios."))
    story.append(bullet("<b>Agrupar commits</b>: Hacer push de multiples commits juntos en lugar de deploy por commit."))
    story.append(bullet("<b>Preview deployments</b>: Utilizar deploys de preview para probar antes de produccion."))
    story.append(bullet("<b>Planificar ventanas de deploy</b>: Coordinar deploys importantes con el equipo."))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════════
    # SECTION 8: COMUNICACION Y COORDINACION
    # ═══════════════════════════════════════════════════════════════════════
    story.append(heading("SECCION 8: COMUNICACION Y COORDINACION"))
    story.append(hr())

    story.append(subheading("8.1 Eventos que Requieren Comunicacion Obligatoria"))
    story.append(body(
        "Los siguientes eventos requieren notificacion inmediata al equipo. La comunicacion "
        "debe ser clara, especifica y incluir toda la informacion relevante."
    ))
    story.append(sp(4))

    comm_data = [
        [Paragraph("<b>Evento</b>", s_table_header),
         Paragraph("<b>Cuando Notificar</b>", s_table_header),
         Paragraph("<b>Formato / Contenido</b>", s_table_header)],
        [Paragraph("Inicio de sesion", s_table_cell),
         Paragraph("Inmediatamente al comenzar", s_table_cell),
         Paragraph("Agente, objetivo, rama, archivos a tocar", s_table_cell)],
        [Paragraph("Modificacion de archivo", s_table_cell),
         Paragraph("Antes de modificar archivos compartidos", s_table_cell),
         Paragraph("Archivo, razon, cambios esperados", s_table_cell)],
        [Paragraph("Bug encontrado", s_table_cell),
         Paragraph("Inmediatamente al detectar", s_table_cell),
         Paragraph("Descripcion, pasos reproducir, severidad", s_table_cell)],
        [Paragraph("Conflicto de merge", s_table_cell),
         Paragraph("Al detectar conflicto", s_table_cell),
         Paragraph("Ramas involucradas, archivos afectados", s_table_cell)],
        [Paragraph("Incidente en produccion", s_table_cell),
         Paragraph("INMEDIATAMENTE", s_table_cell),
         Paragraph("Descripcion, alcance, usuarios afectados, acciones", s_table_cell)],
        [Paragraph("Cambio de arquitectura", s_table_cell),
         Paragraph("Antes de implementar", s_table_cell),
         Paragraph("Motivo, impacto, plan de migracion", s_table_cell)],
        [Paragraph("Fin de sesion", s_table_cell),
         Paragraph("Antes de cerrar", s_table_cell),
         Paragraph("Resumen de cambios, estado, pendientes", s_table_cell)],
    ]
    ct = Table(comm_data, colWidths=[avail_w * 0.22, avail_w * 0.33, avail_w * 0.45])
    ct.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), TABLE_HEADER_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), white),
        ("GRID", (0, 0), (-1, -1), 0.4, LIGHT_LINE),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 2), (-1, 2), TABLE_ALT_BG),
        ("BACKGROUND", (0, 4), (-1, 4), TABLE_ALT_BG),
        ("BACKGROUND", (0, 6), (-1, 6), TABLE_ALT_BG),
    ]))
    story.append(ct)

    story.append(sp(8))
    story.append(subheading("8.2 Reglas de Comunicacion"))
    story.append(sp(2))
    story.append(bullet("<b>Anticipar, no reaccionar</b>: Comunicar proactivamente antes de que surjan problemas."))
    story.append(bullet("<b>Ser especifico</b>: Incluir detalles concretos (archivos, errores, pasos)."))
    story.append(bullet("<b>No asumir</b>: Si algo no esta claro, preguntar antes de actuar."))
    story.append(bullet("<b>Documentar decisiones</b>: Toda decision importante debe quedar registrada en la bitacora."))
    story.append(bullet("<b>Respetar zonas horarias</b>: Considerar la disponibilidad de otros miembros del equipo."))
    story.append(bullet("<b>Usar canales apropiados</b>: Urgencias por canal rapido, discusiones por canal asincrono."))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════════
    # SECTION 9: CHECKLISTS RAPIDAS DE REFERENCIA
    # ═══════════════════════════════════════════════════════════════════════
    story.append(heading("SECCION 9: CHECKLISTS RAPIDAS DE REFERENCIA"))
    story.append(hr())

    story.append(body(
        "Estas checklists son resumenes rapidos para consulta frecuente. Para detalles completos, "
        "referirse a las secciones correspondientes de este documento."
    ))
    story.append(sp(6))

    # Session start
    story.append(subheading("9.1 Checklist de Inicio de Sesion"))
    start_items = [
        "Leer docs/LEE_PRIMERO.txt completamente",
        "Leer docs/INSTRUCTIVO_BITACORA.txt completamente",
        "Ejecutar git pull origin main",
        "Ejecutar bun run lint &amp;&amp; bun run build (build sin errores)",
        "Verificar canales de comunicacion del equipo",
        "Crear o continuar rama de trabajo (NUNCA en main)",
        "Registrar inicio de sesion en bitacora",
    ]
    for i, item in enumerate(start_items, 1):
        story.append(numbered(i, f"[ ] {item}"))

    story.append(sp(6))
    # Pre-commit
    story.append(subheading("9.2 Checklist Pre-Commit"))
    commit_items = [
        "Build local pasa sin errores (bun run lint &amp;&amp; bun run build)",
        "No hay datos sensibles en los cambios (tokens, passwords, API keys)",
        "No hay console.log ni comentarios de debug",
        "Los tipos TypeScript son correctos",
        "El commit es atomico (un cambio logico)",
        "El mensaje sigue el formato: tipo: descripcion",
        "Tag de backup creado si es cambio riesgoso",
    ]
    for i, item in enumerate(commit_items, 1):
        story.append(numbered(i, f"[ ] {item}"))

    story.append(sp(6))
    # Pre-push
    story.append(subheading("9.3 Checklist Pre-Push"))
    push_items = [
        "git status: solo archivos intencionales",
        "git diff: cambios revisados uno por uno",
        "git log --oneline -5: commits recientes correctos",
        "Bitacora actualizada con los cambios",
        "No hay archivos .db, .env o binarios sin intencion",
        "Rama correcta (no empujar a main sin approval)",
        "Sin conflictos pendientes de resolucion",
    ]
    for i, item in enumerate(push_items, 1):
        story.append(numbered(i, f"[ ] {item}"))

    story.append(sp(6))
    # Session closure
    story.append(subheading("9.4 Checklist de Cierre de Sesion"))
    close_items = [
        "Todos los cambios commiteados y pusheados",
        "Bitacora actualizada con resumen de la sesion",
        "Lista de archivos modificados proporcionada",
        "Estado de la tarea comunicado al equipo",
        "Build local verificado (bun run build pasa)",
        "Problemas pendientes documentados",
        "Siguiente steps definidos si la tarea continua",
        "Rama mergeada o documentada como pendiente de merge",
    ]
    for i, item in enumerate(close_items, 1):
        story.append(numbered(i, f"[ ] {item}"))

    story.append(sp(6))
    # Emergency
    story.append(subheading("9.5 Checklist de Emergencia"))
    emergency_items = [
        "Identificar el alcance del problema",
        "Detener la fuente de dano si es posible",
        "Crear tag de backup del estado actual",
        "Crear rama de hotfix si es necesario",
        "Aplicar fix minimo y verificable",
        "Verificar build local + funcionalidad",
        "Deploy y verificacion en produccion",
        "Notificar al equipo sobre el incidente",
        "Documentar incidente completo en bitacora",
    ]
    for i, item in enumerate(emergency_items, 1):
        story.append(numbered(i, f"[ ] {item}"))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════════
    # ANEXO A: ARCHIVOS CRITICOS DEL PROYECTO
    # ═══════════════════════════════════════════════════════════════════════
    story.append(heading("ANEXO A: ARCHIVOS CRITICOS DEL PROYECTO"))
    story.append(hr())

    story.append(body(
        "La siguiente tabla lista los archivos mas criticos del proyecto, su nivel de riesgo "
        "y las precauciones que deben tomarse al modificarlos."
    ))
    story.append(sp(6))

    files_data = [
        ("src/lib/store.ts", "CRITICO", "Estado global Zustand. Modificar con cuidado extreno. Backup antes de cambios. Probar todos los consumidores del store."),
        ("src/lib/db.ts", "CRITICO", "Conexion Prisma. No cambiar sin verificar compatibilidad con schema. Probar todas las operaciones DB."),
        ("src/lib/auth.ts", "CRITICO", "Sistema JWT. Cambios pueden afectar toda la autenticacion. Probar login/logout/verificacion exhaustivamente."),
        ("src/app/page.tsx", "CRITICO", "Componente principal. Cambios afectan la pagina de inicio. Verificar responsividad y rendimiento."),
        ("prisma/schema.prisma", "CRITICO", "Schema de base de datos. Cambios requieren db:push. Actualizar seed-data.ts. Probar migracion."),
        ("src/app/layout.tsx", "ALTO", "Layout raiz. Afecta todas las paginas. Verificar que metadata, fuentes y providers funcionan."),
        ("src/app/globals.css", "ALTO", "Estilos globales. Cambios pueden afectar multiples componentes. Verificar en diferentes viewports."),
        ("package.json", "MEDIO", "Dependencias del proyecto. Verificar compatibilidad antes de agregar/quitar paquetes."),
        ("src/components/streaming/VideoPlayer.tsx", "ALTO", "Reproductor de video. Probar en diferentes navegadores y dispositivos."),
        ("src/components/streaming/HeroBanner.tsx", "MEDIO", "Banner principal. Verificar carga de imagenes y responsividad."),
        ("src/components/streaming/MovieDetailModal.tsx", "MEDIO", "Modal de detalle. Verificar datos, imagenes y cierre correcto."),
        ("src/app/api/admin/movies/route.ts", "ALTO", "CRUD de admin. Protegido por rol admin. Probar todas las operaciones CRUD."),
        ("INSTRUCTIVO_BITACORA.txt", "MEDIO", "Bitacora del proyecto. Solo un editor a la vez. No eliminar entradas existentes."),
    ]

    f_data = [[Paragraph("<b>Archivo</b>", s_table_header),
               Paragraph("<b>Riesgo</b>", s_table_header),
               Paragraph("<b>Precauciones</b>", s_table_header)]]
    for fname, risk, prec in files_data:
        risk_style = s_table_cell_center
        f_data.append([
            Paragraph(f"<font face='Courier' size='8'>{fname}</font>", s_table_cell),
            Paragraph(f"<b>{risk}</b>", risk_style),
            Paragraph(prec, s_table_cell),
        ])

    ft = Table(f_data, colWidths=[avail_w * 0.28, avail_w * 0.12, avail_w * 0.60])
    ft.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), TABLE_HEADER_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), white),
        ("GRID", (0, 0), (-1, -1), 0.4, LIGHT_LINE),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 2), (-1, 2), TABLE_ALT_BG),
        ("BACKGROUND", (0, 4), (-1, 4), TABLE_ALT_BG),
        ("BACKGROUND", (0, 6), (-1, 6), TABLE_ALT_BG),
        ("BACKGROUND", (0, 8), (-1, 8), TABLE_ALT_BG),
        ("BACKGROUND", (0, 10), (-1, 10), TABLE_ALT_BG),
        ("BACKGROUND", (0, 12), (-1, 12), TABLE_ALT_BG),
    ]))
    story.append(ft)

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════════
    # ANEXO B: COMANDOS GIT ESENCIALES
    # ═══════════════════════════════════════════════════════════════════════
    story.append(heading("ANEXO B: COMANDOS GIT ESENCIALES"))
    story.append(hr())

    story.append(body(
        "Referencia rapida de los comandos Git mas utilizados en el proyecto, organizados "
        "por fase de trabajo."
    ))
    story.append(sp(6))

    # Inicio de sesion
    story.append(subheading("B.1 Inicio de Sesion"))
    git_start = [
        [Paragraph("<b>Comando</b>", s_table_header),
         Paragraph("<b>Descripcion</b>", s_table_header)],
        [Paragraph("<font face='Courier'>git pull origin main</font>", s_table_cell),
         Paragraph("Actualizar repositorio local con cambios remotos", s_table_cell)],
        [Paragraph("<font face='Courier'>git status</font>", s_table_cell),
         Paragraph("Ver estado actual del repositorio", s_table_cell)],
        [Paragraph("<font face='Courier'>git log --oneline -10</font>", s_table_cell),
         Paragraph("Ver ultimos 10 commits", s_table_cell)],
        [Paragraph("<font face='Courier'>git checkout -b feat/nombre</font>", s_table_cell),
         Paragraph("Crear y cambiar a nueva rama de feature", s_table_cell)],
        [Paragraph("<font face='Courier'>git checkout nombre-rama</font>", s_table_cell),
         Paragraph("Cambiar a rama existente", s_table_cell)],
    ]
    gst = Table(git_start, colWidths=[avail_w * 0.45, avail_w * 0.55])
    gst.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), TABLE_HEADER_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), white),
        ("GRID", (0, 0), (-1, -1), 0.4, LIGHT_LINE),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 2), (-1, 2), TABLE_ALT_BG),
        ("BACKGROUND", (0, 4), (-1, 4), TABLE_ALT_BG),
    ]))
    story.append(gst)

    story.append(sp(8))
    # Durante la sesion
    story.append(subheading("B.2 Durante la Sesion"))
    git_during = [
        [Paragraph("<b>Comando</b>", s_table_header),
         Paragraph("<b>Descripcion</b>", s_table_header)],
        [Paragraph("<font face='Courier'>git add archivo.ts</font>", s_table_cell),
         Paragraph("Agregar archivo especifico al staging area", s_table_cell)],
        [Paragraph("<font face='Courier'>git diff --staged</font>", s_table_cell),
         Paragraph("Ver cambios en staging area", s_table_cell)],
        [Paragraph("<font face='Courier'>git commit -m \"tipo: desc\"</font>", s_table_cell),
         Paragraph("Crear commit con mensaje descriptivo", s_table_cell)],
        [Paragraph("<font face='Courier'>git push origin nombre-rama</font>", s_table_cell),
         Paragraph("Subir commits al repositorio remoto", s_table_cell)],
        [Paragraph("<font face='Courier'>git stash</font>", s_table_cell),
         Paragraph("Guardar cambios temporales sin commit", s_table_cell)],
        [Paragraph("<font face='Courier'>git stash pop</font>", s_table_cell),
         Paragraph("Recuperar cambios guardados con stash", s_table_cell)],
    ]
    gdt = Table(git_during, colWidths=[avail_w * 0.45, avail_w * 0.55])
    gdt.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), TABLE_HEADER_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), white),
        ("GRID", (0, 0), (-1, -1), 0.4, LIGHT_LINE),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 2), (-1, 2), TABLE_ALT_BG),
        ("BACKGROUND", (0, 4), (-1, 4), TABLE_ALT_BG),
        ("BACKGROUND", (0, 6), (-1, 6), TABLE_ALT_BG),
    ]))
    story.append(gdt)

    story.append(sp(8))
    # Antes de cambios riesgosos + Resolucion de conflictos
    story.append(subheading("B.3 Antes de Cambios Riesgosos y Resolucion de Conflictos"))
    git_risky = [
        [Paragraph("<b>Comando</b>", s_table_header),
         Paragraph("<b>Descripcion</b>", s_table_header)],
        [Paragraph("<font face='Courier'>git tag backup/fecha/desc</font>", s_table_cell),
         Paragraph("Crear tag de backup antes de cambios riesgosos", s_table_cell)],
        [Paragraph("<font face='Courier'>git tag -l \"backup/*\"</font>", s_table_cell),
         Paragraph("Listar todos los tags de backup", s_table_cell)],
        [Paragraph("<font face='Courier'>git checkout [tag]</font>", s_table_cell),
         Paragraph("Restaurar codigo a un tag especifico", s_table_cell)],
        [Paragraph("<font face='Courier'>git revert [commit-hash]</font>", s_table_cell),
         Paragraph("Revertir un commit (crear nuevo commit inverso)", s_table_cell)],
        [Paragraph("<font face='Courier'>git reflog</font>", s_table_cell),
         Paragraph("Ver historial completo de operaciones HEAD", s_table_cell)],
        [Paragraph("<font face='Courier'>git merge main</font>", s_table_cell),
         Paragraph("Mergear cambios de main a la rama actual", s_table_cell)],
        [Paragraph("<font face='Courier'>git mergetool</font>", s_table_cell),
         Paragraph("Abrir herramienta de resolucion de conflictos", s_table_cell)],
    ]
    grt = Table(git_risky, colWidths=[avail_w * 0.45, avail_w * 0.55])
    grt.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), TABLE_HEADER_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), white),
        ("GRID", (0, 0), (-1, -1), 0.4, LIGHT_LINE),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 2), (-1, 2), TABLE_ALT_BG),
        ("BACKGROUND", (0, 4), (-1, 4), TABLE_ALT_BG),
        ("BACKGROUND", (0, 6), (-1, 6), TABLE_ALT_BG),
    ]))
    story.append(grt)

    story.append(sp(20))
    story.append(hr())
    story.append(sp(8))
    story.append(Paragraph(
        "<b>FIN DEL DOCUMENTO</b><br/>"
        "PROTOCOLO ANTI-ERRORES Y PROTECCION DE DATOS<br/>"
        "Proyecto XuperStream v1.0 - 2026-04-27",
        ParagraphStyle("EndDoc", parent=s_body, alignment=TA_CENTER, fontSize=10,
                       textColor=DARK_GRAY)
    ))

    # ─── Build ────────────────────────────────────────────────────────────
    # Use different callbacks for cover vs. rest
    # We build in two parts: cover page and rest
    # Actually, we can't easily do that with SimpleDocTemplate in one pass.
    # Let's use a single onFirstPage/onLaterPages approach.

    # For cover page, we want a different header. Let's use a flag-based approach
    # through a wrapper.

    # Override: cover uses header_footer_cover, rest uses header_footer
    first_page = [True]

    def on_first_page(c, d):
        header_footer_cover(c, d)

    def on_later_pages(c, d):
        header_footer(c, d)

    doc.build(story, onFirstPage=on_first_page, onLaterPages=on_later_pages)
    print(f"PDF generado exitosamente: {OUTPUT_PATH}")


if __name__ == "__main__":
    build_pdf()
