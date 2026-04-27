#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Plan Estrategico XuperStream - Documento PDF
"""

import sys
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.lib import colors
from reportlab.lib.units import inch, cm
from reportlab.platypus import (
    Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, CondPageBreak
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
import hashlib

# ━━ Font Registration ━━
pdfmetrics.registerFont(TTFont('Carlito', '/usr/share/fonts/truetype/english/Carlito-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Carlito-Bold', '/usr/share/fonts/truetype/english/Carlito-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans-Bold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSerif', '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSerif-Bold', '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf'))

registerFontFamily('Carlito', normal='Carlito', bold='Carlito-Bold')
registerFontFamily('DejaVuSans', normal='DejaVuSans', bold='DejaVuSans-Bold')
registerFontFamily('DejaVuSerif', normal='DejaVuSerif', bold='DejaVuSerif-Bold')

# ━━ Color Palette ━━
ACCENT = colors.HexColor('#24738e')
TEXT_PRIMARY = colors.HexColor('#202123')
TEXT_MUTED = colors.HexColor('#798086')
BG_SURFACE = colors.HexColor('#e0e5e9')
BG_PAGE = colors.HexColor('#f0f1f3')

TABLE_HEADER_COLOR = ACCENT
TABLE_HEADER_TEXT = colors.white
TABLE_ROW_EVEN = colors.white
TABLE_ROW_ODD = BG_SURFACE

# ━━ TOC Document Template ━━
from reportlab.platypus import SimpleDocTemplate

class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))

# ━━ Document Setup ━━
output_path = "/home/z/my-project/download/Plan_Estrategico_XuperStream.pdf"
doc = TocDocTemplate(
    output_path,
    pagesize=A4,
    leftMargin=1.0*inch,
    rightMargin=1.0*inch,
    topMargin=1.0*inch,
    bottomMargin=1.0*inch,
)

page_width = A4[0]
left_margin = 1.0 * inch
right_margin = 1.0 * inch
available_width = page_width - left_margin - right_margin

# ━━ Styles ━━
styles = getSampleStyleSheet()

cover_title = ParagraphStyle(
    name='CoverTitle', fontName='Carlito', fontSize=36,
    leading=44, alignment=TA_CENTER, textColor=ACCENT, spaceAfter=12
)
cover_subtitle = ParagraphStyle(
    name='CoverSubtitle', fontName='Carlito', fontSize=16,
    leading=22, alignment=TA_CENTER, textColor=TEXT_PRIMARY, spaceAfter=8
)
cover_meta = ParagraphStyle(
    name='CoverMeta', fontName='Carlito', fontSize=12,
    leading=18, alignment=TA_CENTER, textColor=TEXT_MUTED, spaceAfter=6
)

h1_style = ParagraphStyle(
    name='H1Style', fontName='Carlito', fontSize=20,
    leading=26, alignment=TA_LEFT, textColor=ACCENT,
    spaceBefore=18, spaceAfter=12
)
h2_style = ParagraphStyle(
    name='H2Style', fontName='Carlito', fontSize=16,
    leading=22, alignment=TA_LEFT, textColor=TEXT_PRIMARY,
    spaceBefore=14, spaceAfter=8
)
h3_style = ParagraphStyle(
    name='H3Style', fontName='Carlito', fontSize=13,
    leading=18, alignment=TA_LEFT, textColor=TEXT_PRIMARY,
    spaceBefore=10, spaceAfter=6
)

body_style = ParagraphStyle(
    name='BodyStyle', fontName='Carlito', fontSize=10.5,
    leading=17, alignment=TA_JUSTIFY, textColor=TEXT_PRIMARY,
    spaceBefore=0, spaceAfter=6
)

bullet_style = ParagraphStyle(
    name='BulletStyle', fontName='Carlito', fontSize=10.5,
    leading=17, alignment=TA_LEFT, textColor=TEXT_PRIMARY,
    leftIndent=24, bulletIndent=12, spaceBefore=2, spaceAfter=4
)

header_cell_style = ParagraphStyle(
    name='HeaderCell', fontName='Carlito', fontSize=10,
    leading=14, alignment=TA_CENTER, textColor=colors.white
)

cell_style = ParagraphStyle(
    name='CellStyle', fontName='Carlito', fontSize=9.5,
    leading=14, alignment=TA_LEFT, textColor=TEXT_PRIMARY,
    wordWrap='CJK'
)

cell_center_style = ParagraphStyle(
    name='CellCenterStyle', fontName='Carlito', fontSize=9.5,
    leading=14, alignment=TA_CENTER, textColor=TEXT_PRIMARY
)

caption_style = ParagraphStyle(
    name='CaptionStyle', fontName='Carlito', fontSize=9,
    leading=13, alignment=TA_CENTER, textColor=TEXT_MUTED,
    spaceBefore=3, spaceAfter=6
)

toc_h1 = ParagraphStyle(name='TOCH1', fontSize=13, leftIndent=20, fontName='Carlito', leading=20)
toc_h2 = ParagraphStyle(name='TOCH2', fontSize=11, leftIndent=40, fontName='Carlito', leading=18)
toc_h3 = ParagraphStyle(name='TOCH3', fontSize=10, leftIndent=60, fontName='Carlito', leading=16)

# ━━ Helper Functions ━━

def heading(text, style, level=0):
    key = 'h_%s' % hashlib.md5(text.encode()).hexdigest()[:8]
    p = Paragraph('<a name="%s"/><b>%s</b>' % (key, text), style)
    p.bookmark_name = text
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p

def body(text):
    return Paragraph(text, body_style)

def bullet(text):
    return Paragraph('<bullet>&bull;</bullet> ' + text, bullet_style)

def make_table(headers, rows, col_ratios=None):
    data = [[Paragraph('<b>%s</b>' % h, header_cell_style) for h in headers]]
    for row in rows:
        data.append([Paragraph(str(c), cell_style) if not isinstance(c, Paragraph) else c for c in row])

    if col_ratios is None:
        col_ratios = [1.0 / len(headers)] * len(headers)
    col_widths = [r * available_width for r in col_ratios]

    t = Table(data, colWidths=col_widths, hAlign='CENTER')
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
        ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]
    for i in range(1, len(data)):
        bg = TABLE_ROW_ODD if i % 2 == 0 else TABLE_ROW_EVEN
        style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
    t.setStyle(TableStyle(style_cmds))
    return t

def safe_keep(elements):
    total = 0
    for el in elements:
        w, h = el.wrap(available_width, 1000)
        total += h
    if total <= 340:
        return [KeepTogether(elements)]
    elif len(elements) >= 2:
        return [KeepTogether(elements[:2])] + list(elements[2:])
    return list(elements)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# BUILD STORY
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story = []

# ── COVER PAGE ──
story.append(Spacer(1, 120))
story.append(Paragraph('<b>Plan Estrategico</b>', cover_title))
story.append(Spacer(1, 12))
story.append(Paragraph('<b>XuperStream</b>', ParagraphStyle(
    name='CoverApp', fontName='Carlito', fontSize=42,
    leading=50, alignment=TA_CENTER, textColor=TEXT_PRIMARY
)))
story.append(Spacer(1, 24))
story.append(Paragraph('Integracion de APIs de Streaming y Plataforma de Entretenimiento', cover_subtitle))
story.append(Spacer(1, 36))
story.append(Paragraph('Documento de Planificacion Tecnica y Estrategica', cover_meta))
story.append(Spacer(1, 8))
story.append(Paragraph('Fecha: Abril 2026', cover_meta))
story.append(Spacer(1, 8))
story.append(Paragraph('Version 1.0', cover_meta))
story.append(PageBreak())

# ── TABLE OF CONTENTS ──
toc = TableOfContents()
toc.levelStyles = [toc_h1, toc_h2, toc_h3]
story.append(Paragraph('<b>Tabla de Contenidos</b>', ParagraphStyle(
    name='TOCTitle', fontName='Carlito', fontSize=20,
    leading=26, alignment=TA_LEFT, textColor=ACCENT, spaceAfter=12
)))
story.append(toc)
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════
# 1. RESUMEN EJECUTIVO
# ═══════════════════════════════════════════════════════════════
story.extend([heading('1. Resumen Ejecutivo', h1_style, 0)])

story.append(body(
    'XuperStream es una plataforma de streaming tipo Netflix construida con Next.js 15, Prisma, SQLite y Tailwind CSS, '
    'cuyo codigo se encuentra disponible en el repositorio de GitHub github.com/yecos/Hele. La aplicacion cuenta con un sistema '
    'de autenticacion completo, un panel de administracion, un reproductor de video personalizado, y una interfaz oscura inspirada '
    'en Netflix. Actualmente, la plataforma utiliza datos semilla para su catalogo de peliculas, series, deportes y TV en vivo, '
    'con integracion parcial de la API de TMDB para metadatos de peliculas.'
))

story.append(body(
    'El objetivo principal de este documento es establecer un plan estrategico integral que permita a XuperStream evolucionar '
    'desde su estado actual de prototipo hacia una plataforma de streaming funcional con contenido real. Para lograrlo, se ha '
    'realizado un analisis profundo de Xuper TV (disponible en github.com/thexupertvapps/xuper/releases), una aplicacion de '
    'streaming popular en Latinoamerica que ofrece TV en vivo, peliculas, series, deportes y anime de forma gratuita a traves '
    'de sus APKs para Android, Fire TV, PC y Smart TV.'
))

story.append(body(
    'A traves de la investigacion de los releases de Xuper TV, el analisis de su presencia en Google Play y Apple App Store, '
    'y la revision de multiples fuentes de informacion, se ha identificado que Xuper TV utiliza la API de TMDb para metadatos '
    'de peliculas y se basa en la infraestructura IPTV (probablemente Xtream Codes) para la entrega de contenido de streaming. '
    'Xuper TV es sucesor de Magis TV, una de las aplicaciones de streaming IPTV mas conocidas en la region. Este documento '
    'detalla las fases necesarias para integrar APIs similares en XuperStream, along con alternativas legales y consideraciones '
    'tecnicas para cada componente de la plataforma.'
))

story.append(Spacer(1, 18))

# ═══════════════════════════════════════════════════════════════
# 2. ANALISIS DE XUPER TV
# ═══════════════════════════════════════════════════════════════
story.extend([heading('2. Analisis de Xuper TV', h1_style, 0)])

story.extend([heading('2.1 Informacion General del Repositorio', h2_style, 1)])

story.append(body(
    'El repositorio oficial de Xuper TV se encuentra en github.com/thexupertvapps/xuper bajo la organizacion thexupertvapps. '
    'El repositorio contiene un unico commit inicial (hash 746c7b2) realizado hace aproximadamente tres meses, con un solo archivo: '
    'README.md cuyo contenido es "Todo sobre xuper tv". No se publica codigo fuente en el repositorio; unicamente se distribuyen '
    'los archivos APK compilados a traves de la seccion de releases.'
))

story.append(body(
    'La seccion de releases contiene un unico release llamado "Xuper" con fecha del 6 de enero, que incluye seis archivos: '
    'cuatro variantes de APK (celular, firestick, pc y tv), y dos archivos de codigo fuente en formato zip y tar.gz. '
    'La descripcion del release indica que Xuper TV es "una aplicacion de streaming fiable y facil de usar que ofrece una amplia '
    'variedad de entretenimiento en un solo lugar", con interfaz limpia, reproduccion fluida, y compatibilidad con conexiones '
    'a Internet moderadas.'
))

story.append(Spacer(1, 12))

# Table: Release Assets
story.extend(safe_keep([
    heading('2.2 Assets del Release', h2_style, 1),
    make_table(
        ['Archivo', 'Tipo', 'Plataforma Destino'],
        [
            ['thexupertvapps.com_celular.apk', 'APK', 'Telefonos Android'],
            ['thexupertvapps.com_firestick.apk', 'APK', 'Amazon Fire TV Stick'],
            ['thexupertvapps.com_pc.apk', 'APK', 'Emulador de PC (Windows/Mac)'],
            ['thexupertvapps.com_tv.apk', 'APK', 'Smart TV (Android TV)'],
            ['Source code (zip)', 'ZIP', 'Codigo fuente'],
            ['Source code (tar.gz)', 'TAR.GZ', 'Codigo fuente'],
        ],
        [0.40, 0.15, 0.45]
    ),
    Paragraph('<b>Tabla 1.</b> Assets disponibles en el release de Xuper TV', caption_style)
]))

story.append(Spacer(1, 12))

story.extend([heading('2.3 Arquitectura Identificada de Xuper TV', h2_style, 1)])

story.append(body(
    'Basandose en el analisis de multiples fuentes, incluyendo la descripcion de Apple App Store que indica explicitamente '
    '"Utilizamos la API de TMDb para recuperar informacion de las peliculas", y el analisis de seguridad publicado por '
    'eloutput.com que identifica a Xuper TV como sucesor de Magis TV, se ha determinado la siguiente arquitectura tecnica '
    'para la aplicacion Xuper TV:'
))

story.append(bullet('<b>Capa de Metadatos:</b> Xuper TV utiliza la API publica de TMDb (The Movie Database) para obtener '
    'informacion detallada de peliculas y series, incluyendo posters, sinopsis, calificaciones, generos, reparto y trailers. '
    'Esta es la misma API que ya integra parcialmente XuperStream en su estado actual.'))

story.append(bullet('<b>Capa de Streaming IPTV:</b> El contenido real de video (TV en vivo, canales deportivos, series y '
    'peliculas) se entrega a traves de una infraestructura IPTV basada en el protocolo Xtream Codes. Este sistema permite '
    'gestionar canales en vivo, contenido VOD (Video on Demand), series por temporadas, y guia electronica de programacion (EPG). '
    'Los endpoints tipicos de Xtream Codes incluyen autenticacion por usuario/contrasena, listas M3U, y APIs REST para categorias, '
    'streams y contenido VOD.'))

story.append(bullet('<b>Capa de Contenido:</b> Los videos se sirven mediante URLs HLS (HTTP Live Streaming) con extension .m3u8, '
    'que permiten streaming adaptativo segun la velocidad de conexion del usuario. Los canales en vivo utilizan el mismo protocolo, '
    'similar a como funcionan los servicios de television por Internet.'))

story.append(bullet('<b>Capa de Cliente:</b> La aplicacion Android se construye como un contenedor WebView que carga contenido '
    'desde un servidor web (thexupertvapps.com), lo que permite actualizaciones remotas sin necesidad de publicar nuevas versiones '
    'en las tiendas de aplicaciones. Esta es una practica comun en aplicaciones de streaming IPTV.'))

story.append(Spacer(1, 12))

# Architecture table
story.extend(safe_keep([
    heading('2.4 Tecnologias y APIs Identificadas', h2_style, 1),
    make_table(
        ['Componente', 'Tecnologia / API', 'Descripcion'],
        [
            [Paragraph('<b>Metadatos</b>', cell_style),
             Paragraph('TMDB API v3', cell_style),
             Paragraph('Posters, sinopsis, ratings, generos, trailers de peliculas y series', cell_style)],
            [Paragraph('<b>Streaming TV en Vivo</b>', cell_style),
             Paragraph('Xtream Codes / M3U', cell_style),
             Paragraph('Canales de TV en vivo con streaming HLS (.m3u8)', cell_style)],
            [Paragraph('<b>VOD (Peliculas/Series)</b>', cell_style),
             Paragraph('Xtream Codes VOD API', cell_style),
             Paragraph('Catalogo de peliculas y series por temporadas/capitulos', cell_style)],
            [Paragraph('<b>EPG (Guia TV)</b>', cell_style),
             Paragraph('Xtream Codes EPG', cell_style),
             Paragraph('Programacion televisiva con horarios e informacion de canales', cell_style)],
            [Paragraph('<b>Autenticacion</b>', cell_style),
             Paragraph('Xtream Codes Auth', cell_style),
             Paragraph('Login con usuario/contrasena, gestion de sesiones y permisos', cell_style)],
            [Paragraph('<b>Reproduccion</b>', cell_style),
             Paragraph('ExoPlayer / HLS', cell_style),
             Paragraph('Reproductor nativo Android con soporte HLS adaptativo', cell_style)],
        ],
        [0.22, 0.22, 0.56]
    ),
    Paragraph('<b>Tabla 2.</b> Stack tecnologico identificado de Xuper TV', caption_style)
]))

story.append(Spacer(1, 12))

story.extend([heading('2.5 Hallazgos de Seguridad y Consideraciones Legales', h2_style, 1)])

story.append(body(
    'Segun el analisis publicado por eloutput.com, Xuper TV (y su predecesor Magis TV) presenta varios riesgos de seguridad '
    'identificados. La aplicacion se distribuye como APK fuera de las tiendas oficiales y se viraliza a traves de Telegram y '
    'redes sociales. Las investigaciones senalan permisos intrusivos, riesgos de malware, robo de datos y software oculto. '
    'Ademas, la aplicacion solicita permisos que exceden los necesarios para una app de streaming, lo que sugiere posibles '
    'actividades de recopilacion de datos en segundo plano.'
))

story.append(body(
    'Es importante destacar que el contenido ofrecido por Xuper TV probablemente no cuenta con licencias de distribucion '
    'legales, ya que los servicios de streaming gratuitos con catalogos amplios de contenido premium (peliculas de estreno, '
    'canales de television por suscripcion, deportes en vivo) operan fuera del marco regulatorio de derechos de autor. '
    'Estas consideraciones son fundamentales para el desarrollo de XuperStream, ya que el objetivo es construir una plataforma '
    'que pueda operar de manera sostenible y legal a largo plazo.'
))

story.append(Spacer(1, 18))

# ═══════════════════════════════════════════════════════════════
# 3. PLAN DE INTEGRACION DE APIs
# ═══════════════════════════════════════════════════════════════
story.extend([heading('3. Plan de Integracion de APIs', h1_style, 0)])

story.extend([heading('3.1 API de TMDb (The Movie Database)', h2_style, 1)])

story.append(body(
    'La API de TMDb es la pieza fundamental para proporcionar metadatos de calidad a XuperStream. TMDb es una base de datos '
    'colaborativa de peliculas y series de television con una API REST publica y gratuita (con opcion de suscripcion para mayor '
    'numero de requests). Ya se encuentra parcialmente integrada en XuperStream para la carga de peliculas semilla. La integracion '
    'completa requiere implementar los siguientes endpoints:'
))

story.append(bullet('<b>Peliculas Populares y Trending:</b> GET /trending/movie/week y GET /movie/popular para obtener las '
    'peliculas mas populares y en tendencia. Estos endpoints devuelven informacion completa incluyendo poster, backdrop, '
    'sinopsis, calificacion promedio, fecha de estreno y generos.'))

story.append(bullet('<b>Series de Television:</b> GET /tv/popular y GET /trending/tv/week para el catalogo de series. '
    'Se puede acceder a detalles de temporadas y capitulos individuales a traves de GET /tv/{id}/season/{season_number}.'))

story.append(bullet('<b>Busqueda:</b> GET /search/multi para busqueda universal que devuelve resultados de peliculas, series '
    'y personas en una sola consulta. Soporta filtros por ano, genero, idioma y calificacion minima.'))

story.append(bullet('<b>Descubrimiento:</b> GET /discover/movie y GET /discover/tv permiten explorar catalogos con filtros '
    'avanzados como genero, ano, calificacion minima, ordenamiento y proveedor de streaming.'))

story.append(bullet('<b>Proveedores de Streaming:</b> GET /watch/providers/movie devuelve informacion sobre en que plataformas '
    'de streaming esta disponible cada titulo, lo que permite ofrecer enlaces directos a servicios legales.'))

story.append(bullet('<b>Videos y Trailers:</b> GET /movie/{id}/videos devuelve trailers, clips y contenido behind-the-scenes '
    'que se pueden integrar en las paginas de detalle de cada titulo.'))

story.append(Spacer(1, 12))

# TMDB API table
story.extend(safe_keep([
    make_table(
        ['Endpoint', 'Uso en XuperStream', 'Prioridad'],
        [
            [Paragraph('/trending/movie/week', cell_style),
             Paragraph('Seccion "Tendencias" en pagina principal', cell_style),
             Paragraph('Alta', cell_center_style)],
            [Paragraph('/movie/popular', cell_style),
             Paragraph('Catalogo principal de peliculas', cell_style),
             Paragraph('Alta', cell_center_style)],
            [Paragraph('/tv/popular', cell_style),
             Paragraph('Catalogo principal de series', cell_style),
             Paragraph('Alta', cell_center_style)],
            [Paragraph('/search/multi', cell_style),
             Paragraph('Barra de busqueda global', cell_style),
             Paragraph('Alta', cell_center_style)],
            [Paragraph('/discover/movie y /discover/tv', cell_style),
             Paragraph('Filtros avanzados por genero y categoria', cell_style),
             Paragraph('Media', cell_center_style)],
            [Paragraph('/movie/{id}/videos', cell_style),
             Paragraph('Trailers en paginas de detalle', cell_style),
             Paragraph('Media', cell_center_style)],
            [Paragraph('/watch/providers/movie', cell_style),
             Paragraph('Enlaces a plataformas de streaming', cell_style),
             Paragraph('Baja', cell_center_style)],
        ],
        [0.35, 0.45, 0.20]
    ),
    Paragraph('<b>Tabla 3.</b> Endpoints de TMDB planificados para XuperStream', caption_style)
]))

story.append(Spacer(1, 18))

story.extend([heading('3.2 API de Xtream Codes (IPTV)', h2_style, 1)])

story.append(body(
    'La API de Xtream Codes es el estandar de facto para servicios IPTV y es probablemente el backend que utiliza Xuper TV '
    'para entregar su contenido de streaming. Para replicar esta funcionalidad en XuperStream, se necesita un servidor IPTV '
    'o acceso a un servicio IPTV existente. La API de Xtream Codes ofrece los siguientes componentes principales que deben '
    'integrarse en la plataforma:'
))

story.append(bullet('<b>Autenticacion:</b> El endpoint base /player_api.php?username={user}&password={pass} proporciona '
    'informacion del usuario, estado de la cuenta, y autorizacion para acceder al contenido. La respuesta incluye el ID de '
    'usuario, estado de la suscripcion, fecha de expiracion, y limites de conexiones simultaneas.'))

story.append(bullet('<b>Canales en Vivo:</b> Los endpoints /player_api.php?username={user}&password={pass}&action=get_live_categories '
    'y get_live_streams devuelven las categorias y los canales de TV en vivo respectivamente. Cada canal incluye URL de streaming, '
    'logo, EPG channel ID y metadatos adicionales.'))

story.append(bullet('<b>VOD (Video on Demand):</b> Los endpoints get_vod_categories y get_vod_streams proporcionan el catalogo '
    'de peliculas disponibles para streaming bajo demanda, con informacion de contenedor, extension, rating, y URL de streaming.'))

story.append(bullet('<b>Series:</b> Los endpoints get_series_categories, get_series y get_series_info permiten navegar series '
    'por categorias, listar series disponibles, y obtener informacion detallada de temporadas y capitulos con enlaces de streaming.'))

story.append(bullet('<b>EPG (Guia Electronica de Programacion):</b> El endpoint get_epg proporciona la programacion televisiva '
    'con horarios, descripciones e imagenes de cada programa, permitiendo mostrar una guia de TV interactiva.'))

story.append(bullet('<b>Lista M3U:</b> El endpoint /get.php?username={user}&password={pass}&type=m3u_plus genera una lista M3U '
    'compatible con cualquier reproductor IPTV estandar, lo que permite compatibilidad con aplicaciones de terceros.'))

story.append(Spacer(1, 12))

story.extend([heading('3.3 Fuentes Alternativas de Contenido', h2_style, 1)])

story.append(body(
    'Ademas de las APIs de TMDb y Xtream Codes, existen multiples fuentes de contenido legales y semi-legales que pueden '
    'integrarse en XuperStream para ofrecer un catalogo rico y variado. La seleccion de fuentes depende del modelo de negocio '
    'elegido (gratuito con anuncios, suscripcion de pago, o freemium):'
))

story.append(bullet('<b>YouTube Data API v3:</b> Permite integrar videos y canales de YouTube directamente en la plataforma. '
    'Muchos canales de peliculas publicas, documentales y contenido educativo estan disponibles de forma gratuita. La API '
    'proporciona busqueda, reproduccion y metadatos completos.'))

story.append(bullet('<b>APIs de peliculas de dominio publico:</b> Servicios como Internet Archive (archive.org) ofrecen miles '
    'de peliculas clasicas de dominio publico que se pueden integrar legalmente sin costo de licencias.'))

story.append(bullet('<b>Twitch API:</b> Para contenido de streaming en vivo relacionado con gaming, deportes electronicos y '
    'entretenimiento en tiempo real. La API permite integrar streams en vivo y clips bajo demanda.'))

story.append(bullet('<b>APIs de noticias y deportes:</b> Para la seccion de TV en vivo y deportes, se pueden integrar feeds RSS '
    'de canales de noticias y APIs de resultados deportivos en tiempo real para complementar el contenido de streaming.'))

story.append(bullet('<b>Open Movie Database (OMDb API):</b> Como alternativa o complemento a TMDb, OMDb ofrece informacion de '
    'peliculas y series con un modelo de API diferente, incluyendo ratings de IMDb, Rotten Tomatoes y Metacritic.'))

story.append(Spacer(1, 18))

# ═══════════════════════════════════════════════════════════════
# 4. FASES DE DESARROLLO
# ═══════════════════════════════════════════════════════════════
story.extend([heading('4. Fases de Desarrollo', h1_style, 0)])

story.append(body(
    'El desarrollo de XuperStream se estructura en cinco fases principales, cada una con objetivos especificos, entregables '
    'concretos y criterios de aceptacion medibles. Las fases estan disenadas para ser incrementales, permitiendo que la '
    'plataforma sea funcional desde las primeras etapas y vaya incorporando funcionalidades avanzadas de forma progresiva.'
))

story.append(Spacer(1, 12))

# Phase 1
story.extend([heading('4.1 Fase 1: Investigacion y Preparacion (Semanas 1-2)', h2_style, 1)])

story.append(body(
    'La primera fase se centra en completar la investigacion tecnica necesaria y preparar el entorno de desarrollo para las '
    'integraciones de APIs. Esta fase es critica ya que establece los cimientos sobre los que se construiran todas las '
    'funcionalidades subsiguientes de la plataforma.'
))

story.extend(safe_keep([
    make_table(
        ['Tarea', 'Descripcion', 'Entregable'],
        [
            [Paragraph('<b>Ingenieria inversa del APK</b>', cell_style),
             Paragraph('Decompilar el APK de Xuper TV usando herramientas como apktool y jadx para identificar endpoints, URLs de servidores, claves API y estructura de datos', cell_style),
             Paragraph('Informe de endpoints encontrados', cell_style)],
            [Paragraph('<b>Analisis de trafico de red</b>', cell_style),
             Paragraph('Capturar y analizar el trafico HTTP/HTTPS de la aplicacion Xuper TV usando Charles Proxy o mitmproxy para documentar todas las llamadas a la API', cell_style),
             Paragraph('Catalogo completo de requests', cell_style)],
            [Paragraph('<b>Registro en APIs</b>', cell_style),
             Paragraph('Obtener keys de API para TMDB, YouTube Data API, OMDb y cualquier otro servicio identificado', cell_style),
             Paragraph('Keys de API configuradas', cell_style)],
            [Paragraph('<b>Migracion a PostgreSQL</b>', cell_style),
             Paragraph('Migrar la base de datos de SQLite a PostgreSQL para soportar el despliegue en plataformas serverless como Vercel', cell_style),
             Paragraph('Schema migrado y datos preservados', cell_style)],
            [Paragraph('<b>Configuracion de hosting</b>', cell_style),
             Paragraph('Configurar el entorno de despliegue gratuito (Vercel, Render o Railway) con variables de entorno seguras', cell_style),
             Paragraph('App desplegada en staging', cell_style)],
        ],
        [0.22, 0.50, 0.28]
    ),
    Paragraph('<b>Tabla 4.</b> Tareas de la Fase 1: Investigacion y Preparacion', caption_style)
]))

story.append(Spacer(1, 12))

# Phase 2
story.extend([heading('4.2 Fase 2: Integracion de Metadatos (Semanas 3-4)', h2_style, 1)])

story.append(body(
    'La segunda fase se enfoca en integrar completamente la API de TMDb como fuente principal de metadatos del catalogo. '
    'Esto incluye reemplazar los datos semilla actuales con datos dinamicos obtenidos de TMDB, implementar un sistema de '
    'cache para optimizar las llamadas a la API, y crear una interfaz de exploracion rica que aproveche la informacion '
    'disponible como generos, calificaciones, trailers y proveedores de streaming.'
))

story.extend(safe_keep([
    make_table(
        ['Tarea', 'Descripcion', 'Entregable'],
        [
            [Paragraph('<b>Servicio TMDB completo</b>', cell_style),
             Paragraph('Crear un servicio server-side en Next.js que encapsule todas las llamadas a la API de TMDB con manejo de errores, reintentos y rate limiting', cell_style),
             Paragraph('lib/tmdb.ts con todos los endpoints', cell_style)],
            [Paragraph('<b>Sistema de cache</b>', cell_style),
             Paragraph('Implementar cache con Redis o el sistema de cache de Next.js para almacenar respuestas de TMDB y reducir llamadas a la API', cell_style),
             Paragraph('Cache configurado con TTL optimizado', cell_style)],
            [Paragraph('<b>Catalogo dinamico</b>', cell_style),
             Paragraph('Reemplazar los datos semilla de Prisma con datos en tiempo real de TMDB, manteniendo la estructura del modelo de datos existente', cell_style),
             Paragraph('Catalogo con datos de TMDB', cell_style)],
            [Paragraph('<b>Paginacion infinita</b>', cell_style),
             Paragraph('Implementar paginacion basada en scroll para los catalogos de peliculas y series usando los parametros page de TMDB', cell_style),
             Paragraph('Scroll infinito funcional', cell_style)],
            [Paragraph('<b>Generos y filtros</b>', cell_style),
             Paragraph('Crear paginas de categorias por genero con filtros de ano, calificacion y ordenamiento usando el endpoint /discover', cell_style),
             Paragraph('Paginas de genero completas', cell_style)],
        ],
        [0.22, 0.50, 0.28]
    ),
    Paragraph('<b>Tabla 5.</b> Tareas de la Fase 2: Integracion de Metadatos', caption_style)
]))

story.append(Spacer(1, 12))

# Phase 3
story.extend([heading('4.3 Fase 3: Integracion de Streaming (Semanas 5-8)', h2_style, 1)])

story.append(body(
    'La tercera fase es la mas compleja e involucra la integracion del contenido de streaming real. Dependiendo de la opcion '
    'elegida (API de Xtream Codes, servicios IPTV de terceros, o contenido legal gratuito), se implementara la capa de '
    'reproduccion de video que permitira a los usuarios ver contenido en vivo y bajo demanda directamente desde la plataforma. '
    'Esta fase tambien incluye la migracion del reproductor de video actual a un reproductor compatible con los protocolos HLS '
    'utilizados por los servicios de streaming IPTV.'
))

story.extend(safe_keep([
    make_table(
        ['Tarea', 'Descripcion', 'Entregable'],
        [
            [Paragraph('<b>Cliente Xtream Codes</b>', cell_style),
             Paragraph('Desarrollar un modulo TypeScript que implemente la API de Xtream Codes con autenticacion, categorias, streams, series y EPG', cell_style),
             Paragraph('lib/xtream.ts completo', cell_style)],
            [Paragraph('<b>Reproductor HLS</b>', cell_style),
             Paragraph('Migrar el reproductor de video actual a Video.js o similar con soporte nativo para HLS, DASH y streaming adaptativo', cell_style),
             Paragraph('Reproductor HLS funcional', cell_style)],
            [Paragraph('<b>Seccion TV en Vivo</b>', cell_style),
             Paragraph('Crear la seccion de TV en vivo con lista de canales organizados por categorias, EPG, y funcionalidad de favoritos', cell_style),
             Paragraph('Seccion TV en vivo completa', cell_style)],
            [Paragraph('<b>Seccion Series</b>', cell_style),
             Paragraph('Implementar navegacion de series por temporadas y capitulos con seguimiento de progreso de visualizacion', cell_style),
             Paragraph('Navegacion de series funcional', cell_style)],
            [Paragraph('<b>Buscador unificado</b>', cell_style),
             Paragraph('Integrar busqueda de contenido IPTV con busqueda de metadatos TMDB en un unico punto de entrada', cell_style),
             Paragraph('Busqueda unificada operativa', cell_style)],
        ],
        [0.22, 0.50, 0.28]
    ),
    Paragraph('<b>Tabla 6.</b> Tareas de la Fase 3: Integracion de Streaming', caption_style)
]))

story.append(Spacer(1, 12))

# Phase 4
story.extend([heading('4.4 Fase 4: Mejoras de la Plataforma (Semanas 9-10)', h2_style, 1)])

story.append(body(
    'La cuarta fase se dedica a mejorar la experiencia de usuario, optimizar el rendimiento, y agregar funcionalidades '
    'avanzadas que diferencien a XuperStream de la competencia. Estas mejoras incluyen un sistema de recomendaciones '
    'personalizado, notificaciones de contenido nuevo, perfil de usuario con preferencias, y optimizacion para dispositivos '
    'moviles y Smart TVs.'
))

story.extend(safe_keep([
    make_table(
        ['Tarea', 'Descripcion', 'Entregable'],
        [
            [Paragraph('<b>Sistema de recomendaciones</b>', cell_style),
             Paragraph('Implementar motor de recomendaciones basado en historial de visualizacion y generos preferidos usando algoritmo de filtrado colaborativo simplificado', cell_style),
             Paragraph('Motor de recomendaciones basico', cell_style)],
            [Paragraph('<b>Perfiles de usuario</b>', cell_style),
             Paragraph('Crear sistema de perfiles multiples (similar a Netflix) con preferencias individuales, listas de seguimiento y control parental', cell_style),
             Paragraph('Sistema de perfiles funcional', cell_style)],
            [Paragraph('<b>Notificaciones push</b>', cell_style),
             Paragraph('Implementar notificaciones de nuevo contenido, series favoritas actualizadas y recordatorios de programas en vivo', cell_style),
             Paragraph('Sistema de notificaciones activo', cell_style)],
            [Paragraph('<b>PWA y offline</b>', cell_style),
             Paragraph('Convertir la aplicacion en PWA con soporte offline para metadatos cacheados y descarga de contenido bajo demanda', cell_style),
             Paragraph('PWA instalable', cell_style)],
            [Paragraph('<b>Optimizacion movil</b>', cell_style),
             Paragraph('Optimizar rendimiento y UX para dispositivos moviles con lazy loading, imagenes responsivas y navegacion touch-friendly', cell_style),
             Paragraph('Lighthouse score > 90', cell_style)],
        ],
        [0.22, 0.50, 0.28]
    ),
    Paragraph('<b>Tabla 7.</b> Tareas de la Fase 4: Mejoras de la Plataforma', caption_style)
]))

story.append(Spacer(1, 12))

# Phase 5
story.extend([heading('4.5 Fase 5: Despliegue y Lanzamiento (Semanas 11-12)', h2_style, 1)])

story.append(body(
    'La fase final comprende el despliegue de la aplicacion en produccion, la configuracion de monitoreo y analiticas, '
    'la preparacion de documentacion tecnica y de usuario, y el lanzamiento oficial de la plataforma. Esta fase tambien '
    'incluye la configuracion de CI/CD para automatizar los despliegues futuros.'
))

story.extend(safe_keep([
    make_table(
        ['Tarea', 'Descripcion', 'Entregable'],
        [
            [Paragraph('<b>Despliegue en produccion</b>', cell_style),
             Paragraph('Configurar despliegue automatizado en Vercel/Render con dominio personalizado, SSL y CDN para contenido estatico', cell_style),
             Paragraph('App en produccion con dominio', cell_style)],
            [Paragraph('<b>CI/CD pipeline</b>', cell_style),
             Paragraph('Configurar GitHub Actions para pruebas automaticas, linting, build y despliegue automatico en cada push a main', cell_style),
             Paragraph('Pipeline CI/CD funcional', cell_style)],
            [Paragraph('<b>Monitoreo y analiticas</b>', cell_style),
             Paragraph('Integrar Google Analytics, Sentry para errores, y UptimeRobot para monitoreo de disponibilidad', cell_style),
             Paragraph('Dashboard de monitoreo activo', cell_style)],
            [Paragraph('<b>Documentacion</b>', cell_style),
             Paragraph('Crear documentacion tecnica (API docs, arquitectura) y guias de usuario para la plataforma', cell_style),
             Paragraph('Documentacion completa en GitHub', cell_style)],
            [Paragraph('<b>Lanzamiento</b>', cell_style),
             Paragraph('Publicar en redes sociales, directorios de aplicaciones, y comunidades de streaming para atraer los primeros usuarios', cell_style),
             Paragraph('Lanzamiento oficial con marketing basico', cell_style)],
        ],
        [0.22, 0.50, 0.28]
    ),
    Paragraph('<b>Tabla 8.</b> Tareas de la Fase 5: Despliegue y Lanzamiento', caption_style)
]))

story.append(Spacer(1, 18))

# ═══════════════════════════════════════════════════════════════
# 5. ARQUITECTURA FINAL PROPUESTA
# ═══════════════════════════════════════════════════════════════
story.extend([heading('5. Arquitectura Final Propuesta', h1_style, 0)])

story.append(body(
    'La arquitectura final de XuperStream se compone de multiples capas que trabajan en conjunto para proporcionar una '
    'experiencia de streaming completa. El frontend se construye con Next.js 15 utilizando Server Components para la carga '
    'inicial de datos y Client Components para la interactividad. El backend se sirve a traves de API Routes de Next.js que '
    'actuan como proxy para las APIs externas (TMDB, Xtream Codes, YouTube), protegiendo las claves API y proporcionando '
    'una capa de abstraccion que permite cambiar de proveedor de contenido sin afectar el frontend.'
))

story.append(body(
    'La base de datos PostgreSQL almacena informacion de usuarios, favoritos, historial de visualizacion, listas personalizadas '
    'y preferencias. El sistema de cache (implementado con Next.js Data Cache o Redis externo) reduce significativamente '
    'el numero de llamadas a APIs externas y mejora los tiempos de respuesta. El reproductor de video se basa en Video.js '
    'con plugins HLS.js para streaming adaptativo, soportando tanto contenido en vivo (TV) como bajo demanda (VOD).'
))

story.append(Spacer(1, 12))

story.extend(safe_keep([
    heading('5.1 Diagrama de Arquitectura por Capas', h2_style, 1),
    make_table(
        ['Capa', 'Tecnologia', 'Funcion'],
        [
            [Paragraph('<b>Presentacion</b>', cell_style),
             Paragraph('Next.js 15, React, Tailwind CSS, Zustand', cell_style),
             Paragraph('Interfaz de usuario con SSR/SSG, tema oscuro Netflix-like, navegacion responsive', cell_style)],
            [Paragraph('<b>API Gateway</b>', cell_style),
             Paragraph('Next.js API Routes (Route Handlers)', cell_style),
             Paragraph('Proxy para APIs externas, autenticacion JWT, rate limiting, validacion de requests', cell_style)],
            [Paragraph('<b>Servicios Externos</b>', cell_style),
             Paragraph('TMDB API, Xtream Codes, YouTube API', cell_style),
             Paragraph('Metadatos de contenido, streaming de video, catalogo de peliculas y series', cell_style)],
            [Paragraph('<b>Base de Datos</b>', cell_style),
             Paragraph('PostgreSQL (Prisma ORM)', cell_style),
             Paragraph('Usuarios, favoritos, historial, preferencias, sesiones, suscripciones', cell_style)],
            [Paragraph('<b>Cache</b>', cell_style),
             Paragraph('Next.js Data Cache / Redis', cell_style),
             Paragraph('Cache de respuestas TMDB, metadatos, listas de categorias, EPG', cell_style)],
            [Paragraph('<b>Reproduccion</b>', cell_style),
             Paragraph('Video.js + HLS.js', cell_style),
             Paragraph('Streaming HLS adaptativo, soporte live/VOD, controles personalizados', cell_style)],
            [Paragraph('<b>Autenticacion</b>', cell_style),
             Paragraph('JWT (httpOnly cookies), bcrypt', cell_style),
             Paragraph('Registro, login, sesiones seguras, refresh tokens, proteccion de rutas', cell_style)],
            [Paragraph('<b>Infraestructura</b>', cell_style),
             Paragraph('Vercel / Render / Railway', cell_style),
             Paragraph('Hosting serverless, CDN global, SSL automatico, CI/CD con GitHub Actions', cell_style)],
        ],
        [0.18, 0.30, 0.52]
    ),
    Paragraph('<b>Tabla 9.</b> Arquitectura por capas de XuperStream', caption_style)
]))

story.append(Spacer(1, 18))

# ═══════════════════════════════════════════════════════════════
# 6. RUTA CRITICA Y RECURSOS
# ═══════════════════════════════════════════════════════════════
story.extend([heading('6. Ruta Critica y Estimacion de Recursos', h1_style, 0)])

story.extend([heading('6.1 Cronograma General', h2_style, 1)])

story.append(body(
    'El cronograma general del proyecto abarca 12 semanas distribuidas en cinco fases. Las fases 1 y 2 (investigacion y '
    'metadatos) pueden desarrollarse parcialmente en paralelo para optimizar tiempos. La fase 3 (streaming) es la mas '
    'critica y requiere la mayor dedicacion de recursos. Las fases 4 y 5 pueden iniciarse de forma anticipada para '
    'ciertos componentes que no dependan de la fase 3.'
))

story.extend(safe_keep([
    make_table(
        ['Fase', 'Duracion', 'Semanas', 'Dependencias', 'Prioridad'],
        [
            [Paragraph('Fase 1: Investigacion', cell_style),
             Paragraph('2 semanas', cell_center_style),
             Paragraph('1-2', cell_center_style),
             Paragraph('Ninguna', cell_center_style),
             Paragraph('Critica', cell_center_style)],
            [Paragraph('Fase 2: Metadatos TMDB', cell_style),
             Paragraph('2 semanas', cell_center_style),
             Paragraph('3-4', cell_center_style),
             Paragraph('Fase 1 (API keys)', cell_center_style),
             Paragraph('Alta', cell_center_style)],
            [Paragraph('Fase 3: Streaming IPTV', cell_style),
             Paragraph('4 semanas', cell_center_style),
             Paragraph('5-8', cell_center_style),
             Paragraph('Fase 1 + Fase 2', cell_center_style),
             Paragraph('Critica', cell_center_style)],
            [Paragraph('Fase 4: Mejoras UX', cell_style),
             Paragraph('2 semanas', cell_center_style),
             Paragraph('9-10', cell_center_style),
             Paragraph('Fase 2 (parcial)', cell_center_style),
             Paragraph('Media', cell_center_style)],
            [Paragraph('Fase 5: Despliegue', cell_style),
             Paragraph('2 semanas', cell_center_style),
             Paragraph('11-12', cell_center_style),
             Paragraph('Fases 1-4', cell_center_style),
             Paragraph('Alta', cell_center_style)],
        ],
        [0.25, 0.15, 0.15, 0.25, 0.20]
    ),
    Paragraph('<b>Tabla 10.</b> Cronograma general del proyecto (12 semanas)', caption_style)
]))

story.append(Spacer(1, 12))

story.extend([heading('6.2 Recursos Necesarios', h2_style, 1)])

story.append(body(
    'Los recursos necesarios para ejecutar este plan incluyen tanto herramientas de desarrollo como servicios de terceros. '
    'Es importante destacar que el objetivo es mantener los costos al minimo utilizando opciones gratuitas siempre que sea '
    'posible. A continuacion se detallan los recursos estimados:'
))

story.extend(safe_keep([
    make_table(
        ['Recurso', 'Costo', 'Descripcion'],
        [
            [Paragraph('Hosting (Vercel/Render)', cell_style),
             Paragraph('Gratis', cell_center_style),
             Paragraph('Plan gratuito de Vercel (100GB bandwidth) o Render (750 horas/mes) para el frontend y API', cell_style)],
            [Paragraph('PostgreSQL (Supabase/Neon)', cell_style),
             Paragraph('Gratis', cell_center_style),
             Paragraph('Plan gratuito con 500MB de almacenamiento, suficiente para la etapa inicial', cell_style)],
            [Paragraph('TMDB API', cell_style),
             Paragraph('Gratis', cell_center_style),
             Paragraph('Plan gratuito con 40 requests/10 segundos, ampliable con suscripcion de $10/mes', cell_style)],
            [Paragraph('Servicio IPTV', cell_style),
             Paragraph('$5-15/mes', cell_center_style),
             Paragraph('Suscripcion a servicio IPTV con API Xtream Codes para contenido real (opcional)', cell_style)],
            [Paragraph('Redis (Upstash)', cell_style),
             Paragraph('Gratis', cell_center_style),
             Paragraph('Plan gratuito de Upstash con 10K comandos/dia para cache de metadatos', cell_style)],
            [Paragraph('Dominio personalizado', cell_style),
             Paragraph('$10-15/ano', cell_center_style),
             Paragraph('Registro de dominio .com o .tv para la plataforma (opcional)', cell_style)],
            [Paragraph('GitHub (repo privado)', cell_style),
             Paragraph('Gratis', cell_center_style),
             Paragraph('Repositorio privado para codigo fuente con CI/CD via GitHub Actions', cell_style)],
        ],
        [0.30, 0.15, 0.55]
    ),
    Paragraph('<b>Tabla 11.</b> Recursos necesarios y costos estimados', caption_style)
]))

story.append(Spacer(1, 18))

# ═══════════════════════════════════════════════════════════════
# 7. RIESGOS Y MITIGACION
# ═══════════════════════════════════════════════════════════════
story.extend([heading('7. Riesgos y Plan de Mitigacion', h1_style, 0)])

story.append(body(
    'Todo proyecto tecnologico conlleva riesgos que deben ser identificados y mitigados proactivamente. A continuacion se '
    'presentan los principales riesgos asociados al desarrollo de XuperStream y las estrategias de mitigacion propuestas '
    'para cada uno de ellos, priorizados por su impacto potencial y probabilidad de ocurrencia.'
))

story.extend(safe_keep([
    make_table(
        ['Riesgo', 'Impacto', 'Probabilidad', 'Mitigacion'],
        [
            [Paragraph('El servicio IPTV puede dejar de funcionar sin previo aviso, dejando la plataforma sin contenido de streaming', cell_style),
             Paragraph('Alto', cell_center_style),
             Paragraph('Media', cell_center_style),
             Paragraph('Implementar multiples proveedores IPTV con sistema de failover automatico. Mantener contenido de respaldo con YouTube y fuentes legales.', cell_style)],
            [Paragraph('Las APIs gratuitas (TMDB, YouTube) pueden imponer limites que afecten la experiencia de usuario', cell_style),
             Paragraph('Medio', cell_center_style),
             Paragraph('Alta', cell_center_style),
             Paragraph('Implementar cache agresivo con Redis para minimizar llamadas. Monitorear uso de API y ajustar plan de suscripcion cuando sea necesario.', cell_style)],
            [Paragraph('Problemas legales relacionados con el contenido de streaming sin licencia apropiada', cell_style),
             Paragraph('Alto', cell_center_style),
             Paragraph('Media', cell_center_style),
             Paragraph('Priorizar fuentes de contenido legales (YouTube, dominio publico, contenido con licencia). Incluir disclaimer legal y DMCA compliance.', cell_style)],
            [Paragraph('Limitaciones del plan gratuito de hosting que afecten escalabilidad', cell_style),
             Paragraph('Medio', cell_center_style),
             Paragraph('Baja', cell_center_style),
             Paragraph('Disenar la arquitectura para migrar facilmente entre proveedores. Implementar CDN para contenido estatico y lazy loading agresivo.', cell_style)],
            [Paragraph('Vulnerabilidades de seguridad en la autenticacion o manejo de datos de usuario', cell_style),
             Paragraph('Alto', cell_center_style),
             Paragraph('Baja', cell_center_style),
             Paragraph('Implementar JWT con refresh tokens, bcrypt para contrasenas, validacion de entrada, rate limiting y auditorias de seguridad regulares.', cell_style)],
        ],
        [0.28, 0.10, 0.12, 0.50]
    ),
    Paragraph('<b>Tabla 12.</b> Matriz de riesgos y estrategias de mitigacion', caption_style)
]))

story.append(Spacer(1, 18))

# ═══════════════════════════════════════════════════════════════
# 8. PROXIMOS PASOS INMEDIATOS
# ═══════════════════════════════════════════════════════════════
story.extend([heading('8. Proximos Pasos Inmediatos', h1_style, 0)])

story.append(body(
    'Para iniciar la ejecucion de este plan de forma inmediata, se recomienda seguir la siguiente secuencia de acciones '
    'prioritarias que marcan el inicio de la Fase 1. Estas tareas se pueden ejecutar de forma paralela para maximizar la '
    'eficiencia del tiempo de desarrollo y establecer las bases necesarias para las fases posteriores.'
))

story.append(bullet('<b>Accion 1 - Descargar y analizar el APK:</b> Descargar el APK de celular desde github.com/thexupertvapps/xuper/releases, '
    'decompilarlo usando jadx (jadx-gui para interfaz grafica) y apktool para examinar el codigo fuente, recursos, y configuraciones. '
    'Buscar URLs de servidores, endpoints de API, claves hardcodeadas, y cualquier referencia a Xtream Codes o servicios de streaming.'))

story.append(bullet('<b>Accion 2 - Capturar trafico de red:</b> Instalar Xuper TV en un emulador de Android (Android Studio AVD), '
    'configurar Charles Proxy o mitmproxy para capturar todo el trafico HTTPS, navegar por la aplicacion (peliculas, series, '
    'TV en vivo) y documentar todas las peticiones HTTP incluyendo URLs, parametros, headers y respuestas.'))

story.append(bullet('<b>Accion 3 - Registrar claves de API:</b> Crear cuenta en themoviedb.org para obtener la API key de TMDB. '
    'Crear proyecto en Google Cloud Console para la YouTube Data API v3. Registrar cuenta en omdbapi.com como backup de metadatos. '
    'Almacenar todas las claves en un archivo .env.local seguro.'))

story.append(bullet('<b>Accion 4 - Configurar PostgreSQL:</b> Crear proyecto gratuito en Supabase o Neon para obtener una base de datos '
    'PostgreSQL. Actualizar el schema de Prisma para PostgreSQL, ejecutar la migracion con prisma db push, y verificar que los '
    'seed scripts funcionan correctamente con la nueva base de datos.'))

story.append(bullet('<b>Accion 5 - Implementar servicio TMDB:</b> Crear el archivo lib/tmdb.ts con funciones tipadas para los endpoints '
    'principales (trending, popular, search, discover). Crear API routes en Next.js que actuen como proxy para TMDB, '
    'protegiendo la API key. Implementar las paginas de peliculas y series usando datos dinamicos de TMDB en lugar de datos semilla.'))

story.append(Spacer(1, 18))

# ═══════════════════════════════════════════════════════════════
# 9. CONCLUSION
# ═══════════════════════════════════════════════════════════════
story.extend([heading('9. Conclusion', h1_style, 0)])

story.append(body(
    'XuperStream tiene una base solida con una interfaz atractiva, un sistema de autenticacion funcional, un panel de '
    'administracion completo y una arquitectura moderna basada en Next.js 15. La investigacion realizada sobre Xuper TV '
    'ha revelado que su modelo se basa en dos pilares fundamentales: la API de TMDb para metadatos y una infraestructura '
    'IPTV basada en Xtream Codes para la entrega de contenido de streaming.'
))

story.append(body(
    'Este plan estrategico proporciona una hoja de ruta clara y detallada de 12 semanas para transformar XuperStream desde '
    'un prototipo con datos semilla hacia una plataforma de streaming funcional con contenido real. Las cinco fases propuestas '
    'cubren desde la investigacion tecnica inicial hasta el lanzamiento en produccion, pasando por la integracion de APIs, '
    'el desarrollo de funcionalidades de streaming, y las mejoras de experiencia de usuario.'
))

story.append(body(
    'Es fundamental tomar en consideracion los aspectos legales relacionados con la distribucion de contenido de streaming. '
    'El plan recomienda priorizar fuentes de contenido legales como YouTube, Internet Archive, y contenido de dominio publico, '
    'complementados con servicios IPTV de suscripcion que ofrezcan acceso autorizado a canales de TV en vivo y contenido bajo '
    'demanda. Esta estrategia permite construir una plataforma sostenible y escalable sin exponerse a riesgos legales significativos.'
))

story.append(body(
    'La ejecucion exitosa de este plan requerira dedicacion consistente, approximately 15-20 horas semanales de desarrollo, '
    'y una inversion minima en servicios de terceros (estimada en menos de $15 USD mensuales en la fase de produccion). '
    'Con la infraestructura gratuita disponible (Vercel, Supabase, TMDB), es posible lanzar una version funcional de '
    'XuperStream con contenido real sin costos significativos de infraestructura.'))

# ━━ BUILD ━━
doc.multiBuild(story)
print(f"PDF generado exitosamente: {output_path}")
