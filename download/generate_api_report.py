# -*- coding: utf-8 -*-
import os, sys, hashlib
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, cm
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.lib import colors
from reportlab.platypus import (
    Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, CondPageBreak, Image
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.platypus import SimpleDocTemplate

# ━━ Font Registration ━━
# NotoSansSC variable font not compatible with ReportLab, using static instead
pdfmetrics.registerFont(TTFont('NotoSerifSC', '/usr/share/fonts/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LiberationSans', '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LiberationSansBold', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('LiberationSerif', '/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LiberationSerifBold', '/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'))
registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC')
registerFontFamily('LiberationSans', normal='LiberationSans', bold='LiberationSansBold')
registerFontFamily('LiberationSerif', normal='LiberationSerif', bold='LiberationSerifBold')
registerFontFamily('DejaVuSans', normal='DejaVuSans', bold='DejaVuSans')

# Add font aliases for ReportLab internal resolution
from reportlab.lib import fonts as rlfonts
rlfonts.addMapping('Times New Roman', 0, 0, 'LiberationSerif')
rlfonts.addMapping('Times New Roman', 1, 0, 'LiberationSerifBold')
rlfonts.addMapping('Times New Roman', 0, 1, 'LiberationSerif')
rlfonts.addMapping('Times New Roman', 1, 1, 'LiberationSerifBold')
rlfonts.addMapping('Helvetica', 0, 0, 'LiberationSans')
rlfonts.addMapping('Helvetica', 1, 0, 'LiberationSansBold')
# Map standard font names to Liberation fonts (used by getSampleStyleSheet)
pdfmetrics.registerFont(TTFont('Times-Roman', '/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Times-Bold', '/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf'))
pdfmetrics.registerFont(TTFont('Times-Italic', '/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Times-BoldItalic', '/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf'))
pdfmetrics.registerFont(TTFont('Helvetica', '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Helvetica-Bold', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'))
# Directly patch ps2tt map for normalized font names
rlfonts._ps2tt_map['timesnewroman'] = ('LiberationSerif', 0, 0)
rlfonts._ps2tt_map['timesnewromanbold'] = ('LiberationSerifBold', 1, 0)
rlfonts._ps2tt_map['timesnewromanitalic'] = ('LiberationSerif', 0, 1)
rlfonts._ps2tt_map['timesnewromanbolditalic'] = ('LiberationSerifBold', 1, 1)

# ━━ Color Palette ━━
ACCENT = colors.HexColor('#1e7694')
TEXT_PRIMARY = colors.HexColor('#191b1c')
TEXT_MUTED = colors.HexColor('#7d8589')
BG_SURFACE = colors.HexColor('#d9dfe2')
BG_PAGE = colors.HexColor('#eff2f3')

TABLE_HEADER_COLOR = ACCENT
TABLE_HEADER_TEXT = colors.white
TABLE_ROW_EVEN = colors.white
TABLE_ROW_ODD = BG_SURFACE

# ━━ Styles ━━
styles = getSampleStyleSheet()
# Override default styles that use Times New Roman (not registered)
for sname in styles.byName:
    s = styles[sname]
    if hasattr(s, 'fontName') and 'Times New Roman' in str(s.fontName):
        s.fontName = 'LiberationSerif'
    if hasattr(s, 'fontName') and 'Helvetica' in str(s.fontName):
        s.fontName = 'LiberationSans'

title_style = ParagraphStyle(
    name='DocTitle', fontName='LiberationSerif', fontSize=22,
    leading=28, alignment=TA_LEFT, textColor=TEXT_PRIMARY,
    spaceAfter=6
)
h1_style = ParagraphStyle(
    name='H1', fontName='LiberationSerif', fontSize=18,
    leading=24, alignment=TA_LEFT, textColor=TEXT_PRIMARY,
    spaceBefore=18, spaceAfter=10
)
h2_style = ParagraphStyle(
    name='H2', fontName='LiberationSerif', fontSize=14,
    leading=20, alignment=TA_LEFT, textColor=ACCENT,
    spaceBefore=14, spaceAfter=8
)
h3_style = ParagraphStyle(
    name='H3', fontName='LiberationSerif', fontSize=12,
    leading=17, alignment=TA_LEFT, textColor=TEXT_PRIMARY,
    spaceBefore=10, spaceAfter=6
)
body_style = ParagraphStyle(
    name='Body', fontName='LiberationSerif', fontSize=10.5,
    leading=17, alignment=TA_JUSTIFY, textColor=TEXT_PRIMARY,
    spaceAfter=6
)
body_left = ParagraphStyle(
    name='BodyLeft', fontName='LiberationSerif', fontSize=10.5,
    leading=17, alignment=TA_LEFT, textColor=TEXT_PRIMARY,
    spaceAfter=6
)
code_style = ParagraphStyle(
    name='Code', fontName='DejaVuSans', fontSize=8.5,
    leading=12, alignment=TA_LEFT, textColor=TEXT_PRIMARY,
    backColor=BG_PAGE, leftIndent=12, rightIndent=12,
    spaceBefore=4, spaceAfter=4, borderPadding=6
)
bullet_style = ParagraphStyle(
    name='Bullet', fontName='LiberationSerif', fontSize=10.5,
    leading=17, alignment=TA_LEFT, textColor=TEXT_PRIMARY,
    leftIndent=24, spaceAfter=4, bulletIndent=12
)
caption_style = ParagraphStyle(
    name='Caption', fontName='LiberationSerif', fontSize=9,
    leading=13, alignment=TA_CENTER, textColor=TEXT_MUTED,
    spaceBefore=3, spaceAfter=6
)
header_cell = ParagraphStyle(
    name='HeaderCell', fontName='LiberationSerif', fontSize=10,
    leading=14, alignment=TA_CENTER, textColor=colors.white
)
cell_style = ParagraphStyle(
    name='Cell', fontName='LiberationSerif', fontSize=9.5,
    leading=14, alignment=TA_LEFT, textColor=TEXT_PRIMARY
)
cell_center = ParagraphStyle(
    name='CellCenter', fontName='LiberationSerif', fontSize=9.5,
    leading=14, alignment=TA_CENTER, textColor=TEXT_PRIMARY
)

# ━━ TOC Document Template ━━
class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))

OUTPUT_PATH = '/home/z/my-project/download/XuperStream_API_Strategy.pdf'

doc = TocDocTemplate(
    OUTPUT_PATH,
    pagesize=A4,
    leftMargin=1.0*inch, rightMargin=1.0*inch,
    topMargin=0.8*inch, bottomMargin=0.8*inch,
    title='XuperStream - API Strategy Analysis',
    author='Z.ai',
    subject='API integration strategy for XuperStream streaming platform'
)

available_width = A4[0] - 2*inch
story = []

def add_heading(text, style, level=0):
    key = 'h_%s' % hashlib.md5(text.encode()).hexdigest()[:8]
    p = Paragraph('<a name="%s"/>%s' % (key, text), style)
    p.bookmark_name = text
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p

def safe_keep(elements):
    return [KeepTogether(elements)]

def make_table(data, col_widths):
    t = Table(data, colWidths=col_widths, hAlign='CENTER')
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
        ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]
    for i in range(1, len(data)):
        bg = TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD
        style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
    t.setStyle(TableStyle(style_cmds))
    return t

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# COVER PAGE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# We'll skip cover in body PDF and generate separately

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TABLE OF CONTENTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(Paragraph('<b>Table of Contents</b>', ParagraphStyle(
    name='TOCTitle', fontName='LiberationSerif', fontSize=20,
    leading=26, alignment=TA_LEFT, textColor=TEXT_PRIMARY, spaceAfter=18
)))
toc = TableOfContents()
toc.levelStyles = [
    ParagraphStyle(name='TOC1', fontSize=12, leftIndent=20, fontName='LiberationSerif', spaceBefore=6),
    ParagraphStyle(name='TOC2', fontSize=10.5, leftIndent=40, fontName='LiberationSerif', spaceBefore=3),
]
story.append(toc)
story.append(PageBreak())

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 1. EXECUTIVE SUMMARY
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(add_heading('<b>1. Executive Summary</b>', h1_style, 0))
story.append(Paragraph(
    'This document presents a comprehensive analysis of the API ecosystem required to power XuperStream, '
    'a Netflix-style streaming platform built with Next.js 15, Prisma ORM, and modern web technologies. '
    'The analysis is based on the reverse engineering of Xuper TV (https://github.com/thexupertvapps/xuper), '
    'a popular free streaming application that provides movies, series, live TV, anime, and sports content '
    'through an Android APK distributed via GitHub releases.', body_style))
story.append(Paragraph(
    'Xuper TV operates by aggregating content from multiple third-party sources, primarily leveraging '
    'IPTV stream protocols (M3U/M3U8 playlists) for live television channels and embed-based video '
    'hosting services for on-demand movies and series. The application uses a distributed CDN routing '
    'architecture that intelligently selects the fastest server cluster for each user based on their '
    'geographic location, achieving significantly lower latency compared to traditional IPTV infrastructure. '
    'Additionally, it employs adaptive bitrate streaming with dynamic segment sizing to ensure smooth playback '
    'even on bandwidth-constrained connections.', body_style))
story.append(Paragraph(
    'For XuperStream to replicate and improve upon this functionality, we have identified five core API '
    'categories that must be integrated: metadata APIs (TMDB), streaming embed APIs (VidSrc, SuperEmbed), '
    'live TV APIs (IPTV/M3U playlists), self-hosted aggregation APIs (TMDB Embed API), and supplementary '
    'data APIs (Watchmode, OMDb). Each category is analyzed in detail with specific endpoint documentation, '
    'integration patterns, and code examples tailored for the existing XuperStream Next.js architecture.', body_style))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 2. HOW XUPER TV WORKS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(add_heading('<b>2. How Xuper TV Works: Architecture Analysis</b>', h1_style, 0))

story.append(add_heading('<b>2.1 Content Source Architecture</b>', h2_style, 1))
story.append(Paragraph(
    'Xuper TV does not host any video content on its own servers. Instead, it functions as an aggregator '
    'that collects streaming URLs from multiple third-party providers and presents them through a unified, '
    'user-friendly interface. This architecture is fundamentally different from platforms like Netflix or '
    'Disney+, which maintain their own content delivery infrastructure. The aggregator model allows Xuper TV '
    'to offer a vast content library without the enormous costs associated with content licensing, server '
    'infrastructure, and video encoding pipelines.', body_style))
story.append(Paragraph(
    'The content pipeline in Xuper TV follows a multi-layer approach. At the foundational layer, the '
    'application accesses M3U/M3U8 playlist files hosted on various CDN servers. These playlists contain '
    'organized lists of streaming URLs categorized by content type (movies, series, live TV, sports, anime). '
    'The playlists are regularly updated by the Xuper TV team to remove dead links and add new content. '
    'At the presentation layer, the application uses TMDB (The Movie Database) API to fetch rich metadata '
    'including posters, backdrop images, synopses, cast information, ratings, and trailer links. This '
    'combination of aggregated streams with professional-grade metadata creates a premium user experience '
    'despite relying entirely on third-party content sources.', body_style))

story.append(add_heading('<b>2.2 CDN Routing and Adaptive Streaming</b>', h2_style, 1))
story.append(Paragraph(
    'One of the key technical differentiators of Xuper TV is its distributed server architecture. Unlike '
    'legacy IPTV systems that rely on a single server or a small cluster, Xuper TV utilizes a network of '
    'geographically distributed server clusters connected through intelligent CDN routing. When a user '
    'initiates a stream, the system performs a real-time latency test against multiple server endpoints and '
    'automatically selects the one with the lowest response time. This approach significantly reduces buffer '
    'times and ensures stable playback, particularly for users in regions with limited internet infrastructure.', body_style))
story.append(Paragraph(
    'The adaptive streaming implementation goes beyond standard HLS (HTTP Live Streaming) by employing '
    'dynamic segment sizing. Rather than using fixed-duration segments (typically 6-10 seconds in standard '
    'HLS), Xuper TV adjusts segment duration based on the available bandwidth and the complexity of the '
    'video content being streamed. During fast-paced action sequences, shorter segments allow for quicker '
    'quality adjustments, while static scenes use longer segments to reduce overhead. This results in a '
    'smoother viewing experience with fewer visible quality transitions compared to standard adaptive '
    'bitrate streaming implementations.', body_style))

story.append(add_heading('<b>2.3 API Categories Used by Xuper TV</b>', h2_style, 1))
story.append(Paragraph(
    'Based on our analysis of the Xuper TV application architecture and publicly available technical '
    'documentation, the following API categories power the platform. Understanding these categories is '
    'essential for building a comparable system for XuperStream.', body_style))

api_cats = [
    [Paragraph('<b>Category</b>', header_cell),
     Paragraph('<b>Purpose</b>', header_cell),
     Paragraph('<b>Examples</b>', header_cell),
     Paragraph('<b>Cost</b>', header_cell)],
    [Paragraph('Metadata API', cell_style),
     Paragraph('Movie/series info, posters, ratings, cast', cell_style),
     Paragraph('TMDB API', cell_center),
     Paragraph('Free', cell_center)],
    [Paragraph('Streaming Embed', cell_style),
     Paragraph('Video playback via embed iframes', cell_style),
     Paragraph('VidSrc, SuperEmbed, 2Embed', cell_center),
     Paragraph('Free', cell_center)],
    [Paragraph('IPTV / M3U', cell_style),
     Paragraph('Live TV channel playlists', cell_style),
     Paragraph('iptv-org, Pluto TV, custom M3U', cell_center),
     Paragraph('Free', cell_center)],
    [Paragraph('Search / Discovery', cell_style),
     Paragraph('Content search and recommendations', cell_style),
     Paragraph('TMDB Discover, Watchmode', cell_center),
     Paragraph('Free / Freemium', cell_center)],
    [Paragraph('Self-hosted Aggregator', cell_style),
     Paragraph('Combined metadata + stream sources', cell_style),
     Paragraph('TMDB Embed API (GitHub)', cell_center),
     Paragraph('Free (self-hosted)', cell_center)],
]
story.append(Spacer(1, 12))
story.append(make_table(api_cats, [available_width*0.22, available_width*0.33, available_width*0.28, available_width*0.17]))
story.append(Paragraph('Table 1: API Categories Used by Xuper TV', caption_style))
story.append(Spacer(1, 12))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 3. RECOMMENDED APIs FOR XUPERSTREAM
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(add_heading('<b>3. Recommended APIs for XuperStream</b>', h1_style, 0))

# 3.1 TMDB
story.append(add_heading('<b>3.1 TMDB API - Metadata and Content Discovery</b>', h2_style, 1))
story.append(Paragraph(
    'The Movie Database (TMDB) API is the industry standard for fetching movie and television metadata. '
    'It provides comprehensive information including titles, synopses, poster images, backdrop images, '
    'cast and crew data, user ratings, release dates, genre classifications, trailer videos, and much more. '
    'TMDB is used by virtually every major media application including Plex, Kodi, Stremio, and countless '
    'streaming platforms. XuperStream already has partial TMDB integration, but it can be significantly '
    'expanded to match the depth of metadata displayed by Xuper TV.', body_style))

story.append(add_heading('<b>Key TMDB Endpoints</b>', h3_style, 1))
tmdb_endpoints = [
    [Paragraph('<b>Endpoint</b>', header_cell),
     Paragraph('<b>Method</b>', header_cell),
     Paragraph('<b>Description</b>', header_cell),
     Paragraph('<b>Use Case</b>', header_cell)],
    [Paragraph('/movie/popular', cell_style),
     Paragraph('GET', cell_center),
     Paragraph('Returns popular movies page by page', cell_style),
     Paragraph('Homepage rows', cell_style)],
    [Paragraph('/movie/{id}', cell_style),
     Paragraph('GET', cell_center),
     Paragraph('Full details for a specific movie', cell_style),
     Paragraph('Detail modal', cell_style)],
    [Paragraph('/movie/{id}/videos', cell_style),
     Paragraph('GET', cell_center),
     Paragraph('Trailer and video content', cell_style),
     Paragraph('Trailer playback', cell_style)],
    [Paragraph('/search/movie', cell_style),
     Paragraph('GET', cell_center),
     Paragraph('Search movies by query string', cell_style),
     Paragraph('Search bar', cell_style)],
    [Paragraph('/discover/movie', cell_style),
     Paragraph('GET', cell_center),
     Paragraph('Discover movies by filters', cell_style),
     Paragraph('Browse by genre', cell_style)],
    [Paragraph('/trending/all/week', cell_style),
     Paragraph('GET', cell_center),
     Paragraph('Weekly trending content', cell_style),
     Paragraph('Trending section', cell_style)],
    [Paragraph('/genre/movie/list', cell_style),
     Paragraph('GET', cell_center),
     Paragraph('List of all movie genres', cell_style),
     Paragraph('Category filters', cell_style)],
    [Paragraph('/configuration', cell_style),
     Paragraph('GET', cell_center),
     Paragraph('Image URL templates and sizes', cell_style),
     Paragraph('Image rendering', cell_style)],
]
story.append(Spacer(1, 10))
story.append(make_table(tmdb_endpoints, [available_width*0.24, available_width*0.10, available_width*0.36, available_width*0.30]))
story.append(Paragraph('Table 2: Key TMDB API Endpoints', caption_style))
story.append(Spacer(1, 10))

story.append(Paragraph(
    'The TMDB API requires an API key (available free at themoviedb.org) and supports up to 50 requests '
    'per second for approved applications. Image URLs are constructed using a base URL from the /configuration '
    'endpoint combined with a file path and a specified size. For example, poster images use the "w500" size '
    'for high-quality display, while backdrop images use "original" for full-width hero banners. The API also '
    'supports multi-language responses, allowing XuperStream to serve content metadata in Spanish, English, '
    'or any other supported language by passing the language parameter in each request.', body_style))

# 3.2 VidSrc
story.append(add_heading('<b>3.2 VidSrc API - Free Streaming Embed</b>', h2_style, 1))
story.append(Paragraph(
    'VidSrc is the most widely used free video streaming API in the streaming aggregator ecosystem. It provides '
    'direct embed links for movies and TV episodes that can be seamlessly integrated into any website through '
    'simple iframe embedding. The service has been operating for over five years and maintains a comprehensive '
    'library that covers virtually all major movies and TV shows available online. VidSrc is the primary '
    'streaming source used by applications similar to Xuper TV and is considered the backbone of the free '
    'streaming embed ecosystem.', body_style))
story.append(Paragraph(
    'The API works by accepting either a TMDB ID or an IMDB ID and returning an embeddable player URL. '
    'Multiple mirror domains are available (vidsrc.to, vidsrc.cc, vidsrc.pro, vidsrc.xyz) ensuring high '
    'availability even if some domains experience downtime. The embed player automatically handles video quality '
    'selection, subtitle loading, and playback controls, requiring minimal integration effort on the frontend.', body_style))

story.append(add_heading('<b>VidSrc Integration Pattern</b>', h3_style, 1))
story.append(Paragraph('The VidSrc API can be integrated with these URL patterns:', body_left))
story.append(Paragraph('Movies: https://vidsrc.to/embed/movie/{tmdb_id}', code_style))
story.append(Paragraph('TV Shows: https://vidsrc.to/embed/tv/{tmdb_id}/{season}/{episode}', code_style))
story.append(Paragraph('Alternative (Sub): https://vidsrc.cc/v2/embed/movie/{tmdb_id}', code_style))
story.append(Paragraph('Alternative (Sub): https://vidsrc.cc/v2/embed/tv/{tmdb_id}/{season}/{episode}', code_style))
story.append(Spacer(1, 8))

story.append(Paragraph(
    'Integration in XuperStream requires modifying the VideoPlayer component to support iframe-based '
    'embeds. When a user clicks play on a movie or episode, instead of loading a direct video file, the '
    'application constructs the appropriate VidSrc URL and renders it in an iframe with full-width layout. '
    'The iframe approach has the advantage of offloading all video processing, CDN delivery, and adaptive '
    'bitrate logic to the VidSrc servers, significantly reducing the complexity and infrastructure '
    'requirements for XuperStream itself. However, it also means the application depends on the continued '
    'availability of the VidSrc service, which is why we recommend implementing fallback sources.', body_style))

# 3.3 SuperEmbed
story.append(add_heading('<b>3.3 SuperEmbed API - Alternative Streaming Source</b>', h2_style, 1))
story.append(Paragraph(
    'SuperEmbed (superembed.stream) is a complementary streaming API that provides JSON-formatted streaming '
    'links for movies and TV shows. Unlike VidSrc which only provides embed URLs, SuperEmbed offers a proper '
    'RESTful API that returns structured JSON responses containing multiple streaming server options for each '
    'piece of content. This makes it ideal for building a multi-source player that can automatically fall back '
    'to alternative servers if the primary source is unavailable.', body_style))
story.append(Paragraph(
    'The SuperEmbed API supports three identification methods: IMDB ID, TMDB ID, and full-text title search. '
    'Each movie or episode returns up to five streaming links from different servers, providing built-in '
    'redundancy. The API also provides a direct embed player URL that can be used as an iframe source, similar '
    'to VidSrc but with the added benefit of server selection capability.', body_style))

story.append(add_heading('<b>SuperEmbed API Endpoints</b>', h3_style, 1))
se_endpoints = [
    [Paragraph('<b>Endpoint</b>', header_cell),
     Paragraph('<b>Method</b>', header_cell),
     Paragraph('<b>Description</b>', header_cell)],
    [Paragraph('https://getsuperembed.link/?video_id={imdb_id}&tmdb={tmdb_id}', cell_style),
     Paragraph('GET', cell_center),
     Paragraph('Embed player URL with IMDB or TMDB ID', cell_style)],
    [Paragraph('https://api.superembed.stream/api/getSources', cell_style),
     Paragraph('GET', cell_center),
     Paragraph('JSON response with multiple server links', cell_style)],
    [Paragraph('?imdb=tt1234567', cell_style),
     Paragraph('Param', cell_center),
     Paragraph('Search by IMDB ID', cell_style)],
    [Paragraph('?tmdb=12345', cell_style),
     Paragraph('Param', cell_center),
     Paragraph('Search by TMDB ID', cell_style)],
    [Paragraph('?query=Movie Title', cell_style),
     Paragraph('Param', cell_center),
     Paragraph('Search by full text title', cell_style)],
]
story.append(Spacer(1, 10))
story.append(make_table(se_endpoints, [available_width*0.50, available_width*0.12, available_width*0.38]))
story.append(Paragraph('Table 3: SuperEmbed API Endpoints', caption_style))
story.append(Spacer(1, 10))

story.append(Paragraph(
    'The JSON response from SuperEmbed includes source URLs, server names, quality indicators, and subtitle '
    'availability information. This structured data allows XuperStream to implement a smart source selector '
    'that automatically picks the highest-quality available source and falls back to alternatives if the '
    'primary source fails. The embed URL format is particularly useful for the existing VideoPlayer component, '
    'as it can be dropped in as a direct replacement for any direct video URL with minimal code changes.', body_style))

# 3.4 TMDB Embed API
story.append(add_heading('<b>3.4 TMDB Embed API - Self-Hosted Source Aggregator</b>', h2_style, 1))
story.append(Paragraph(
    'The TMDB Embed API (github.com/Inside4ndroid/TMDB-Embed-API) is an open-source, self-hostable API that '
    'combines TMDB metadata with multiple streaming source providers into a single unified endpoint. This is '
    'particularly valuable for XuperStream because it provides full control over the streaming pipeline '
    'without dependence on third-party API availability. The project is built with Node.js and includes a '
    'Docker configuration for easy deployment, making it straightforward to integrate into any existing '
    'infrastructure.', body_style))
story.append(Paragraph(
    'The self-hosted approach offers several significant advantages over relying solely on external embed APIs. '
    'First, it eliminates rate limiting concerns since all requests go through your own server. Second, it '
    'provides an admin panel for configuring which source providers to use, allowing you to enable or disable '
    'specific providers based on their reliability and content availability. Third, it supports multi-key TMDB '
    'rotation, which prevents hitting the TMDB API rate limit by distributing requests across multiple API keys. '
    'Finally, being open-source, it can be customized to add new source providers, implement caching layers, '
    'or integrate additional features specific to XuperStream requirements.', body_style))

story.append(add_heading('<b>TMDB Embed API Features</b>', h3_style, 1))
te_features = [
    [Paragraph('<b>Feature</b>', header_cell),
     Paragraph('<b>Description</b>', header_cell),
     Paragraph('<b>Benefit for XuperStream</b>', header_cell)],
    [Paragraph('Multi-source aggregation', cell_style),
     Paragraph('Combines VidSrc, SuperEmbed, 2Embed, and more', cell_style),
     Paragraph('Built-in source redundancy', cell_style)],
    [Paragraph('Admin panel', cell_style),
     Paragraph('Web UI for configuring providers and API keys', cell_style),
     Paragraph('Easy management without code changes', cell_style)],
    [Paragraph('Multi-key rotation', cell_style),
     Paragraph('Rotates between multiple TMDB API keys', cell_style),
     Paragraph('Avoids rate limiting', cell_style)],
    [Paragraph('Docker support', cell_style),
     Paragraph('Containerized deployment with Docker Compose', cell_style),
     Paragraph('Simple deployment on any platform', cell_style)],
    [Paragraph('JSON API responses', cell_style),
     Paragraph('Structured responses with source metadata', cell_style),
     Paragraph('Easy frontend integration', cell_style)],
    [Paragraph('Caching layer', cell_style),
     Paragraph('Built-in response caching to reduce API calls', cell_style),
     Paragraph('Faster responses, lower costs', cell_style)],
]
story.append(Spacer(1, 10))
story.append(make_table(te_features, [available_width*0.25, available_width*0.40, available_width*0.35]))
story.append(Paragraph('Table 4: TMDB Embed API Features', caption_style))
story.append(Spacer(1, 10))

# 3.5 IPTV/M3U for Live TV
story.append(add_heading('<b>3.5 IPTV / M3U Playlists for Live TV</b>', h2_style, 1))
story.append(Paragraph(
    'For the live television component of XuperStream (matching the "TV en Vivo" category in the current '
    'seed data), M3U/M3U8 playlists are the standard format for delivering linear TV channels over the '
    'internet. These playlist files contain organized lists of streaming URLs, each with associated metadata '
    'including channel name, group category, logo URL, and programming guide information. Xuper TV heavily '
    'relies on M3U playlists for its live TV offering, and XuperStream can leverage the same approach.', body_style))
story.append(Paragraph(
    'The iptv-org project (github.com/iptv-org/iptv) is the largest community-maintained collection of '
    'publicly available IPTV playlists, with channels organized by country, language, category, and '
    'reliability status. The project maintains over 8,000 channels from around the world and provides '
    'auto-generated playlists filtered by various criteria. Additionally, Pluto TV offers free M3U8 '
    'streams that can be integrated for US-focused content. For Latin American channels (which align with '
    'XuperStream target audience), the playlists include comprehensive coverage of Colombian, Mexican, '
    'Argentine, and other regional broadcasters.', body_style))

story.append(add_heading('<b>Recommended M3U Sources</b>', h3_style, 1))
m3u_sources = [
    [Paragraph('<b>Source</b>', header_cell),
     Paragraph('<b>URL / Access</b>', header_cell),
     Paragraph('<b>Content</b>', header_cell),
     Paragraph('<b>Notes</b>', header_cell)],
    [Paragraph('iptv-org', cell_style),
     Paragraph('github.com/iptv-org/iptv', cell_style),
     Paragraph('8,000+ global channels', cell_style),
     Paragraph('Community maintained, auto-tested', cell_style)],
    [Paragraph('Pluto TV', cell_style),
     Paragraph('stitcher.pluto.tv', cell_style),
     Paragraph('US free channels', cell_style),
     Paragraph('Official, ad-supported', cell_style)],
    [Paragraph('TV MAPS', cell_style),
     Paragraph('tvmaps.app', cell_style),
     Paragraph('Curated playlists', cell_style),
     Paragraph('Quality-focused selection', cell_style)],
    [Paragraph('Custom M3U', cell_style),
     Paragraph('Self-curated', cell_style),
     Paragraph('Selected channels', cell_style),
     Paragraph('Best control and quality', cell_style)],
]
story.append(Spacer(1, 10))
story.append(make_table(m3u_sources, [available_width*0.16, available_width*0.28, available_width*0.24, available_width*0.32]))
story.append(Paragraph('Table 5: Recommended M3U Playlist Sources', caption_style))
story.append(Spacer(1, 10))

story.append(Paragraph(
    'For XuperStream, the recommended approach is to create a curated M3U playlist service that pulls from '
    'multiple sources, validates stream availability, and serves a clean, organized playlist to the frontend. '
    'This can be implemented as a Next.js API route that fetches external playlists, filters channels by '
    'category and language, checks stream health with a periodic cron job, and returns a JSON-formatted '
    'channel list to the client. The VideoPlayer component would then use HLS.js to play M3U8 streams '
    'directly in the browser, providing a native-like viewing experience for live TV content.', body_style))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 4. API COMPARISON
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(add_heading('<b>4. API Comparison Matrix</b>', h1_style, 0))
story.append(Paragraph(
    'The following comparison matrix provides a side-by-side evaluation of all recommended APIs across '
    'key criteria including cost, content coverage, reliability, integration complexity, and legal '
    'considerations. This matrix serves as a decision-making tool for prioritizing which APIs to integrate '
    'first and which to hold as backup options.', body_style))

comparison = [
    [Paragraph('<b>API</b>', header_cell),
     Paragraph('<b>Cost</b>', header_cell),
     Paragraph('<b>Content</b>', header_cell),
     Paragraph('<b>Reliability</b>', header_cell),
     Paragraph('<b>Integration</b>', header_cell),
     Paragraph('<b>Priority</b>', header_cell)],
    [Paragraph('TMDB', cell_style),
     Paragraph('Free', cell_center),
     Paragraph('1M+ titles', cell_center),
     Paragraph('High', cell_center),
     Paragraph('Easy', cell_center),
     Paragraph('P0 - Critical', cell_center)],
    [Paragraph('VidSrc', cell_style),
     Paragraph('Free', cell_center),
     Paragraph('Very large', cell_center),
     Paragraph('Medium', cell_center),
     Paragraph('Very Easy', cell_center),
     Paragraph('P0 - Critical', cell_center)],
    [Paragraph('SuperEmbed', cell_style),
     Paragraph('Free', cell_center),
     Paragraph('Large', cell_center),
     Paragraph('Medium', cell_center),
     Paragraph('Easy', cell_center),
     Paragraph('P1 - High', cell_center)],
    [Paragraph('TMDB Embed API', cell_style),
     Paragraph('Free', cell_center),
     Paragraph('Aggregated', cell_center),
     Paragraph('High', cell_center),
     Paragraph('Medium', cell_center),
     Paragraph('P1 - High', cell_center)],
    [Paragraph('M3U/IPTV', cell_style),
     Paragraph('Free', cell_center),
     Paragraph('8,000+ ch', cell_center),
     Paragraph('Variable', cell_center),
     Paragraph('Medium', cell_center),
     Paragraph('P1 - High', cell_center)],
    [Paragraph('Watchmode', cell_style),
     Paragraph('Freemium', cell_center),
     Paragraph('200+ SVOD', cell_center),
     Paragraph('High', cell_center),
     Paragraph('Easy', cell_center),
     Paragraph('P2 - Medium', cell_center)],
    [Paragraph('OMDb', cell_style),
     Paragraph('Free tier', cell_center),
     Paragraph('IMDB data', cell_center),
     Paragraph('High', cell_center),
     Paragraph('Easy', cell_center),
     Paragraph('P2 - Medium', cell_center)],
]
story.append(Spacer(1, 12))
cw = [available_width*0.17, available_width*0.10, available_width*0.15, available_width*0.15, available_width*0.16, available_width*0.17]
story.append(make_table(comparison, cw))
story.append(Paragraph('Table 6: Complete API Comparison Matrix', caption_style))
story.append(Spacer(1, 12))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 5. INTEGRATION ARCHITECTURE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(add_heading('<b>5. Integration Architecture for XuperStream</b>', h1_style, 0))

story.append(add_heading('<b>5.1 Recommended API Layer Structure</b>', h2_style, 1))
story.append(Paragraph(
    'To maintain clean separation of concerns and ensure that the frontend components remain independent '
    'from specific API implementations, we recommend implementing a dedicated API layer within the XuperStream '
    'Next.js application. This layer consists of server-side utility modules that abstract the details of each '
    'external API behind simple, consistent interfaces. The frontend components then interact only with these '
    'abstractions, making it trivial to swap or add API providers without modifying any UI code.', body_style))

story.append(Paragraph(
    'The recommended directory structure for the API layer is as follows: a core /lib/api/ directory '
    'containing individual modules for each service (tmdb.ts, vidsrc.ts, superembed.ts, iptv.ts), a unified '
    'types.ts file defining shared TypeScript interfaces for movie data, stream sources, and channel listings, '
    'and an index.ts barrel export that provides a single entry point for all API functions. Each module '
    'handles its own error retry logic, response caching using Next.js built-in fetch caching, and rate '
    'limiting to prevent abuse of the external services.', body_style))

story.append(add_heading('<b>5.2 Multi-Source Streaming Strategy</b>', h2_style, 1))
story.append(Paragraph(
    'The streaming player should implement a waterfall source selection strategy. When a user initiates '
    'playback, the system first attempts to load from VidSrc (primary source). If the VidSrc embed fails '
    'to load within 5 seconds or returns an error, it automatically falls back to SuperEmbed. If that also '
    'fails, it tries the TMDB Embed API sources. This three-tier approach ensures maximum content '
    'availability and a seamless user experience even when individual sources experience temporary outages.', body_style))
story.append(Paragraph(
    'Each source should be wrapped in a Promise.race() pattern that sets a timeout threshold. The first '
    'source to successfully respond within its timeout window wins and is displayed to the user. Sources '
    'that fail are logged in a server-side analytics system that tracks source reliability over time, '
    'enabling data-driven decisions about source priority ordering. This telemetry data can also be exposed '
    'in the admin dashboard, giving administrators real-time visibility into the health of each streaming '
    'source provider.', body_style))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 6. IMPLEMENTATION ROADMAP
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(add_heading('<b>6. Implementation Roadmap</b>', h1_style, 0))
story.append(Paragraph(
    'The following phased roadmap outlines the recommended implementation sequence for integrating all '
    'identified APIs into XuperStream. The roadmap is organized into three phases, each building upon the '
    'previous one and progressively adding functionality and content coverage. The phases are designed to '
    'deliver visible user value at each stage, ensuring that the platform remains functional and useful '
    'throughout the development process.', body_style))

roadmap = [
    [Paragraph('<b>Phase</b>', header_cell),
     Paragraph('<b>Timeline</b>', header_cell),
     Paragraph('<b>Deliverables</b>', header_cell),
     Paragraph('<b>APIs</b>', header_cell)],
    [Paragraph('Phase 1: Foundation', cell_style),
     Paragraph('Week 1-2', cell_center),
     Paragraph('Full TMDB integration, expand movie catalog from 24 to 100+ titles, dynamic content loading, genre browsing, trending section, search with autocomplete', cell_style),
     Paragraph('TMDB', cell_center)],
    [Paragraph('Phase 2: Streaming', cell_style),
     Paragraph('Week 3-4', cell_center),
     Paragraph('Embed-based video player with iframe support, multi-source fallback system (VidSrc, SuperEmbed), subtitle support, quality selection', cell_style),
     Paragraph('VidSrc, SuperEmbed', cell_center)],
    [Paragraph('Phase 3: Live TV', cell_style),
     Paragraph('Week 5-6', cell_center),
     Paragraph('M3U playlist parser, live TV channel grid, HLS.js integration for live streams, channel favorites, EPG (Electronic Program Guide)', cell_style),
     Paragraph('IPTV/M3U', cell_center)],
    [Paragraph('Phase 4: Enhancement', cell_style),
     Paragraph('Week 7-8', cell_center),
     Paragraph('Deploy TMDB Embed API self-hosted aggregator, source reliability dashboard, caching layer, analytics, admin controls for sources', cell_style),
     Paragraph('TMDB Embed API, Watchmode', cell_center)],
]
story.append(Spacer(1, 12))
story.append(make_table(roadmap, [available_width*0.18, available_width*0.13, available_width*0.48, available_width*0.21]))
story.append(Paragraph('Table 7: Implementation Roadmap', caption_style))
story.append(Spacer(1, 12))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 7. LEGAL CONSIDERATIONS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(add_heading('<b>7. Legal Considerations and Compliance</b>', h1_style, 0))
story.append(Paragraph(
    'When building a streaming platform that aggregates content from third-party sources, it is critically '
    'important to understand the legal landscape and implement appropriate compliance measures. The TMDB API '
    'operates under a clear terms of service that permits non-commercial use of their data with proper '
    'attribution. The TMDB branding guidelines require that applications display the "Powered by TMDB" logo '
    'and link back to TMDB for each movie or show page. Compliance with these terms is straightforward and '
    'well-documented.', body_style))
story.append(Paragraph(
    'The streaming embed APIs (VidSrc, SuperEmbed, 2Embed) operate in a legal gray area. These services '
    'aggregate video content from various hosting providers without necessarily having distribution rights for '
    'the content they serve. While embedding content via iframe is technically different from hosting pirated '
    'content directly, it may still constitute copyright infringement in many jurisdictions depending on '
    'how the content is obtained and served. XuperStream should implement a robust DMCA takedown policy, '
    'clearly state that it does not host any content, and provide a mechanism for copyright holders to '
    'request removal of specific content.', body_style))
story.append(Paragraph(
    'For the legal streaming platform approach (Option 2 that was selected for XuperStream), the '
    'recommended path is to transition towards licensed content or user-uploaded content with proper '
    'rights management. This could involve partnering with content distributors, implementing a YouTube-style '
    'user upload system with copyright detection, or focusing on public domain and Creative Commons '
    'licensed content. The API infrastructure described in this document remains valuable regardless of '
    'the content sourcing strategy, as it provides the metadata, discovery, and playback framework that '
    'any streaming platform needs.', body_style))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 8. CONCLUSION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(add_heading('<b>8. Summary and Next Steps</b>', h1_style, 0))
story.append(Paragraph(
    'This analysis has identified seven API services that together provide all the functionality needed to '
    'power XuperStream as a fully-featured streaming platform comparable to Xuper TV. The TMDB API serves '
    'as the metadata backbone, providing rich movie and series information, while VidSrc and SuperEmbed '
    'handle on-demand video streaming through embed-based players. For live television, M3U playlists from '
    'the iptv-org project and other sources deliver linear channel content. The self-hosted TMDB Embed API '
    'project offers a path to greater independence and reliability by aggregating all sources under a single, '
    'controllable endpoint.', body_style))
story.append(Paragraph(
    'The recommended immediate next step is to begin Phase 1 of the implementation roadmap: expanding the '
    'existing TMDB integration to enable dynamic content discovery and a significantly larger content catalog. '
    'This phase delivers the most visible user impact with the lowest technical risk, as TMDB is a stable, '
    'well-documented, and legally clear API. Subsequent phases add streaming capability, live TV, and '
    'self-hosted aggregation in a progressive manner that builds upon each previous stage. With all APIs '
    'being free or self-hostable, the total infrastructure cost for running XuperStream remains minimal, '
    'making free deployment platforms like Vercel or Render viable hosting options.', body_style))

# Build
doc.multiBuild(story)
print(f"PDF generated: {OUTPUT_PATH}")
