#!/usr/bin/env python3
"""README visuals for dsh-autotier — v5.

The plugin is a tier router, so neither figure is a left-to-right pipeline.

* hero: one instruction card with its confidence, a fork into the two model
  tiers (strong plans / cheap implements, handoff in between), and the landing
  seam bar underneath.
* flow: a two-channel switchyard. A decision panel on the left feeds a strong
  lane and a cheap lane; two opposite bridges cross the lanes — leaving plan
  mode hands the work down to cheap, repeated failures escalate cheap back up
  to strong for a TTL — and both lanes merge into the landing seam that fixes
  the next step's provider/model/effort.

Every label is a real seam, config key, tier id or measured threshold from
`src/`; nothing here is invented.
"""
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'docs', 'assets')

FONT_CJK = r'C:\Windows\Fonts\msyh.ttc'
FONT_CJK_BOLD = r'C:\Windows\Fonts\msyhbd.ttc'
FONT_MONO = r'C:\Windows\Fonts\consola.ttf'
for _p in (FONT_CJK, FONT_CJK_BOLD, FONT_MONO):
    if not os.path.exists(_p):
        raise SystemExit(f'FATAL: font missing: {_p}')

SKIN = {
    'light': dict(bg_from='#f9f6fd', bg_to='#e4eaf8', card='#ffffff',
                  card_edge='#e2dff0', text='#141419', sub='#4d5261',
                  faint='#8f94a4', accent='#4B67B4', accent2='#16a34a',
                  warn='#bc4c00', pill='#ece7f9', grid='#e3dff0',
                  shadow=(38, 30, 72)),
    'dark': dict(bg_from='#131a2a', bg_to='#0c1016', card='#1b2231',
                 card_edge='#2e374b', text='#f0f3f9', sub='#a8b1c4',
                 faint='#737b8d', accent='#8496f5', accent2='#3fb950',
                 warn='#d29922', pill='#242d42', grid='#232c3f',
                 shadow=(0, 0, 0)),
}


def font(size, kind='cjk_bold'):
    return ImageFont.truetype(
        {'cjk': FONT_CJK, 'cjk_bold': FONT_CJK_BOLD, 'mono': FONT_MONO}[kind],
        size)


def hx(s):
    s = s.lstrip('#')
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))


def mix(a, b, t):
    return tuple(int(x + (y - x) * t) for x, y in zip(hx(a), hx(b)))


def gradient(w, h, c1, c2):
    base = Image.new('RGB', (w, h))
    d = ImageDraw.Draw(base)
    for y in range(h):
        t = 0.18 * (y / h) + 0.82 * (y / h) ** 1.4
        d.line([(0, y), (w, y)], fill=mix(c1, c2, t))
    return base


def glow(img, cx, cy, r, color, alpha=54):
    layer = Image.new('RGBA', img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for i in range(10, 0, -1):
        rr = r * i / 10
        d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr],
                  fill=color + (int(alpha * (1 - i / 11)),))
    return Image.alpha_composite(img.convert('RGBA'), layer).convert('RGB')


def card(img, box, skin, radius=20, shadow=24, edge=None, width=2, fill=None):
    x0, y0, x1, y1 = box
    sh = Image.new('RGBA', img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sh)
    for i in range(shadow, 0, -3):
        sd.rounded_rectangle([x0 - i // 5, y0 + i // 2, x1 + i // 5, y1 + i],
                             radius=radius + i // 5,
                             fill=skin['shadow'] + (int(9 * (1 - i / shadow)),))
    base = Image.alpha_composite(img.convert('RGBA'),
                                 sh.filter(ImageFilter.GaussianBlur(12)))
    d = ImageDraw.Draw(base)
    d.rounded_rectangle(box, radius=radius, fill=hx(fill or skin['card']),
                        outline=hx(edge or skin['card_edge']), width=width)
    return base.convert('RGB')


def pill(img, xy, text, skin, size=13, fg=None, bg=None, kind='mono',
         padx=14, h=None):
    d = ImageDraw.Draw(img)
    f = font(size, kind)
    tw = d.textlength(text, font=f)
    x, y = xy
    hh = h or size + 14
    d.rounded_rectangle([x, y, x + tw + padx * 2, y + hh], radius=hh // 2,
                        fill=hx(bg or skin['pill']))
    d.text((x + padx, y + (hh - size) // 2 - 2), text, font=f,
           fill=hx(fg or skin['accent']))
    return tw + padx * 2


def fit(d, text, kind, start, maxw, floor=12):
    size = start
    while size > floor:
        f = font(size, kind)
        if d.textlength(text, font=f) <= maxw:
            return f, size
        size -= 2
    return font(floor, kind), floor


def text(d, xy, s, f, fill, anchor='ls'):
    d.text(xy, s, font=f, fill=hx(fill), anchor=anchor)


HERO = {
    'zh': dict(
        kicker='DeepSeek Harness 插件 · 模型分档路由',
        title='dsh-autotier',
        value=['意图进来，档位出去', '强档规划，弱档实施'],
        sub='规则判意图，官方 seam 落档位，全程免手动。',
        meta='agent/request · tools/pre-execute · /tier',
        foot='Apache-2.0 · PerryLink DSH plugin family',
        in_label='用户指令', in_kind='cjk',
        sample='把存储层迁移端到端规划一下',
        conf='0.97',
        conf_label='置信度',
        strong='STRONG', strong_role='规划 / 复审',
        cheap='CHEAP', cheap_role='实施',
        strong_model='deepseek-v4-pro', cheap_model='deepseek-flash',
        strong_note='effort high · followSession false',
        cheap_note='effort low · followSession true',
        sel='选中', handoff='交接', guard='guard',
        landing='落地 seam', land_kind='cjk',
        scalars='采样标量保留',
        chips=['2 次失败 / 60 s → 强档 180 s',
               '/tier auto|strong|cheap|off', 'guard · 仅弱档'],
    ),
    'en': dict(
        kicker='DeepSeek Harness plugin · model-tier router',
        title='dsh-autotier',
        value=['One instruction in.', 'One tier decision out.'],
        sub='Rules pick the tier, the seam lands it.',
        meta='agent/request · tools/pre-execute · /tier',
        foot='Apache-2.0 · PerryLink DSH plugin family',
        in_label='USER INSTRUCTION', in_kind='mono',
        sample='Plan the storage migration end to end',
        conf='0.97',
        conf_label='confidence',
        strong='STRONG', strong_role='plan / review',
        cheap='CHEAP', cheap_role='implement',
        strong_model='deepseek-v4-pro', cheap_model='deepseek-flash',
        strong_note='effort high · followSession false',
        cheap_note='effort low · followSession true',
        sel='selected', handoff='handoff', guard='guard',
        landing='LANDING SEAM', land_kind='mono',
        scalars='sampling scalars preserved',
        chips=['2 fails / 60 s → strong 180 s',
               '/tier auto|strong|cheap|off', 'guard · cheap only'],
    ),
}


def hero(lang, skin):
    """1440x576 banner: decision column on the left, switchboard on the right."""
    s = SKIN[skin]
    H = HERO[lang]
    W, HT = 1440, 576
    img = gradient(W, HT, s['bg_from'], s['bg_to'])
    img = glow(img, 1210, 96, 400, hx(s['accent']), 26 if skin == 'light' else 40)
    img = glow(img, 760, 560, 300, hx(s['accent']), 10 if skin == 'light' else 18)
    d = ImageDraw.Draw(img)

    m = 60
    pill(img, (m, 52), H['kicker'], s, size=15, kind='cjk')

    d = ImageDraw.Draw(img)
    tf, tsize = fit(d, H['title'], 'mono', 84, 570, 78)
    text(d, (m, 200), H['title'], tf, s['text'])

    y = 268
    for line in H['value']:
        text(d, (m, y), line, font(40, 'cjk_bold'), s['text'])
        y += 52

    sf, _ = fit(d, H['sub'], 'cjk', 25, 566, 24)
    text(d, (m + 1, 384), H['sub'], sf, s['sub'])
    text(d, (m + 1, 430), H['meta'], font(20, 'mono'), s['faint'])
    d.line([m + 1, 462, m + 540, 462], fill=hx(s['grid']), width=2)
    text(d, (m + 1, 490), H['foot'], font(16, 'cjk'), s['faint'])

    # ---- right side: instruction -> fork -> two tiers -> landing seam ----
    RX0, RX1 = 700, 1380
    img = card(img, (RX0, 52, RX1, 178), s, radius=22, shadow=26)
    d = ImageDraw.Draw(img)
    text(d, (RX0 + 24, 84), H['in_label'], font(13, H['in_kind']), s['faint'])
    text(d, (RX0 + 24, 124), H['sample'], font(22, 'cjk'), s['text'])
    cx = RX0 + 24
    for tok in ('text', 'tools', 'image', 'depth'):
        w = pill(img, (cx, 142), tok, s, size=11, kind='mono', padx=11, h=22)
        d = ImageDraw.Draw(img)
        cx += w + 8
    text(d, (RX1 - 26, 100), H['conf_label'], font(11, 'cjk'), s['faint'],
         anchor='rs')
    text(d, (RX1 - 26, 144), H['conf'], font(38, 'mono'), s['accent'],
         anchor='rs')

    # fork
    fork_y, card_y = 204, 226
    stem = (RX0 + (RX1 - RX0) // 2, 178)
    d.line([stem, (stem[0], fork_y)], fill=hx(s['accent']), width=3)
    d.line([(850, fork_y), (1230, fork_y)], fill=hx(s['accent']), width=3)
    for fx in (850, 1230):
        d.line([(fx, fork_y), (fx, card_y - 8)], fill=hx(s['accent']), width=3)
        d.polygon([(fx - 9, card_y - 12), (fx + 9, card_y - 12), (fx, card_y)],
                  fill=hx(s['accent']))

    # tier cards
    img = card(img, (700, card_y, 1000, 392), s, radius=20, shadow=26,
               edge=s['accent'], width=3)
    img = card(img, (1080, card_y, 1380, 392), s, radius=20, shadow=22)
    d = ImageDraw.Draw(img)
    text(d, (724, 268), H['strong'], font(14, 'mono'), s['accent'])
    pill(img, (884, 246), H['sel'], s, size=11, kind='cjk', padx=12, h=24)
    d = ImageDraw.Draw(img)
    text(d, (724, 312), H['strong_model'], font(21, 'mono'), s['text'])
    text(d, (724, 342), H['strong_note'], font(12, 'mono'), s['faint'])
    text(d, (724, 376), H['strong_role'], font(17, 'cjk_bold'), s['accent'])

    text(d, (1104, 268), H['cheap'], font(14, 'mono'), s['sub'])
    pill(img, (1300, 246), H['guard'], s, size=11, kind='mono', fg=s['warn'],
         bg=s['pill'], padx=10, h=24)
    d = ImageDraw.Draw(img)
    text(d, (1104, 312), H['cheap_model'], font(21, 'mono'), s['text'])
    text(d, (1104, 342), H['cheap_note'], font(11, 'mono'), s['faint'])
    text(d, (1104, 376), H['cheap_role'], font(17, 'cjk_bold'), s['sub'])

    # handoff between the two tiers
    mid_y = 356
    for x in range(1010, 1066, 12):
        d.line([(x, mid_y), (min(x + 6, 1068), mid_y)], fill=hx(s['faint']),
               width=2)
    d.polygon([(1068, mid_y - 7), (1080, mid_y), (1068, mid_y + 7)],
              fill=hx(s['faint']))
    text(d, (1040, mid_y - 18), H['handoff'], font(11, 'cjk'), s['faint'],
         anchor='ms')

    # arrows into the landing bar
    for fx in (850, 1230):
        d.line([(fx, 392), (fx, 420 - 8)], fill=hx(s['accent']), width=3)
        d.polygon([(fx - 9, 420 - 12), (fx + 9, 420 - 12), (fx, 420)],
                  fill=hx(s['accent']))

    img = card(img, (RX0, 420, RX1, 492), s, radius=18, shadow=18)
    d = ImageDraw.Draw(img)
    text(d, (724, 446), H['landing'], font(12, H['land_kind']), s['accent'])
    text(d, (RX1 - 26, 446), H['scalars'], font(11, 'cjk'), s['faint'],
         anchor='rs')
    text(d, (724, 474), 'agent.model.select()', font(14, 'mono'), s['text'])
    text(d, (918, 474), '0.2.2', font(10, 'mono'), s['faint'])
    text(d, (976, 474), 'agent/request', font(14, 'mono'), s['text'])
    text(d, (1116, 474), '0.2.1', font(10, 'mono'), s['faint'])

    # bottom chips
    cx = RX0
    for c in H['chips']:
        w = pill(img, (cx, 508), c, s, size=11, kind='cjk', padx=12, h=24)
        d = ImageDraw.Draw(img)
        cx += w + 10

    img.save(os.path.join(OUT, f'dsh-autotier-hero-{lang}-{skin}.webp'),
             'WEBP', quality=92)
    print(f'dsh-autotier-hero-{lang}-{skin}.webp')


FLOW = {
    'light': dict(bg1='#f9f6fd', bg2='#e4eaf8', dots='#ddd6ee',
                  zone='#f7f4fc', card='#ffffff', edge='#e6e3f0',
                  text='#141419', sub='#4d5261', faint='#8f94a4',
                  accent='#4B67B4', accent2='#16a34a', warn='#bc4c00',
                  pill='#ece7f9', grid='#e9e4f6', shadow='#1b1735',
                  shadow_op='.10'),
    'dark': dict(bg1='#131a2a', bg2='#0c1016', dots='#1c2536',
                 zone='#101621', card='#1b2231', edge='#2e374b',
                 text='#f0f3f9', sub='#a8b1c4', faint='#737b8d',
                 accent='#8496f5', accent2='#3fb950', warn='#d29922',
                 pill='#242d42', grid='#1b2434', shadow='#000000',
                 shadow_op='.55'),
}

SANS = ("ui-sans-serif, system-ui, -apple-system, 'Segoe UI', "
        "'Microsoft YaHei', 'PingFang SC', 'Noto Sans CJK SC', sans-serif")
MONO = ("ui-monospace, SFMono-Regular, 'Cascadia Mono', Consolas, "
        "'Microsoft YaHei', monospace")


def flow_svg(skin):
    """1100x660 two-channel switchyard with plan-handoff and escalation bridges."""
    s = FLOW[skin]
    W, H = 1100, 660
    lines = []
    add = lines.append

    def t(x, y, body, size=11.5, fill=None, weight='400', family=SANS,
          anchor='start', opacity=None, extra=''):
        op = f' opacity="{opacity}"' if opacity else ''
        add(f'<text x="{x}" y="{y}" fill="{fill or s["text"]}" '
            f'font-family="{family}" font-size="{size}" font-weight="{weight}" '
            f'text-anchor="{anchor}"{op}{extra}>{body}</text>')

    add(f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" aria-label="dsh-autotier two-channel tier routing: signals and confidence on the left, a strong lane and a cheap lane in the middle with a plan-handoff bridge down and a failure-escalation bridge up, and the landing seam on the right">
<title>dsh-autotier: intent gate, strong/cheap lanes, landing seam</title>
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="{s['bg1']}"/>
    <stop offset="1" stop-color="{s['bg2']}"/>
  </linearGradient>
  <filter id="soft" x="-40%" y="-40%" width="180%" height="200%">
    <feDropShadow dx="0" dy="8" stdDeviation="11" flood-color="{s['shadow']}" flood-opacity="{s['shadow_op']}"/>
  </filter>
  <pattern id="dots" width="30" height="30" patternUnits="userSpaceOnUse">
    <circle cx="1.4" cy="1.4" r="1.4" fill="{s['dots']}"/>
  </pattern>
  <marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M0 0 L10 5 L0 10 z" fill="{s['accent']}"/>
  </marker>
  <marker id="g" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M0 0 L10 5 L0 10 z" fill="{s['accent2']}"/>
  </marker>
</defs>
<rect width="{W}" height="{H}" fill="url(#bg)"/>
<rect width="{W}" height="{H}" fill="url(#dots)" opacity=".45"/>''')

    t(40, 48, 'dsh-autotier', 27, s['text'], '700', MONO)
    t(40, 72, 'one instruction → one tier decision → one landing; cheap runs '
              'are guarded, failures escalate', 13, s['sub'])
    t(40, 104, 'DECIDE', 11, s['accent'], '700', MONO, extra=' letter-spacing="1.4"')
    t(316, 104, 'TIER LANES', 11, s['accent'], '700', MONO, extra=' letter-spacing="1.4"')
    t(818, 104, 'LANDING', 11, s['accent'], '700', MONO, extra=' letter-spacing="1.4"')

    # ---------------- left: decision panel ----------------
    add(f'<g filter="url(#soft)"><rect x="40" y="112" width="260" height="384" '
        f'rx="20" fill="{s["card"]}" stroke="{s["edge"]}"/></g>')
    t(58, 136, 'DECISION', 11, s['accent'], '700', MONO)
    t(282, 136, '0 tokens first', 11, s['faint'], '400', MONO, 'end')
    t(58, 160, 'signals', 11, s['faint'])
    chip_y = [168, 194]
    rows = [['text', 'tools', 'image'], ['depth', 'cwd']]
    for row, cy in zip(rows, chip_y):
        cx = 58
        for tok in row:
            w = 20 + len(tok) * 6.4
            add(f'<rect x="{cx}" y="{cy}" width="{w}" height="20" rx="10" '
                f'fill="{s["pill"]}"/>')
            t(cx + 10, cy + 14, tok, 11, s['accent'], '400', MONO)
            cx += w + 8

    add(f'<line x1="58" y1="226" x2="282" y2="226" stroke="{s["grid"]}"/>')
    t(58, 246, 'confidence', 11, s['faint'])
    t(282, 246, 'rule ≥ 0.70', 11, s['accent'], '700', MONO, 'end')
    add(f'<rect x="58" y="254" width="224" height="14" rx="7" fill="{s["grid"]}"/>')
    add(f'<rect x="58" y="254" width="{224 * 0.45:.1f}" height="14" rx="7" fill="{s["pill"]}"/>')
    add(f'<rect x="{58 + 224 * 0.45:.1f}" y="254" width="{224 * 0.25:.1f}" height="14" fill="{s["grid"]}"/>')
    add(f'<rect x="{58 + 224 * 0.7:.1f}" y="254" width="{224 * 0.3:.1f}" height="14" rx="7" fill="{s["accent"]}" opacity=".42"/>')
    for frac, lab in ((0.45, '0.45'), (0.70, '0.70')):
        x = 58 + 224 * frac
        add(f'<line x1="{x:.1f}" y1="250" x2="{x:.1f}" y2="272" stroke="{s["bg1"]}" stroke-width="2"/>')
        t(x, 284, lab, 11, s['faint'], '400', MONO, 'middle')
    add(f'<circle cx="{58 + 224 * 0.97:.1f}" cy="261" r="4.6" fill="{s["accent"]}" stroke="{s["card"]}" stroke-width="2"/>')
    t(58, 302, '≥ 0.70: the rule layer decides alone', 11, s['sub'])
    t(58, 318, 'hysteresis 0.80 / 0.60 damps flapping', 11, s['sub'])

    add(f'<line x1="58" y1="330" x2="282" y2="330" stroke="{s["grid"]}"/>')
    t(58, 350, 'judge', 11, s['faint'])
    t(282, 350, 'only &lt; 0.70', 11, s['faint'], '400', MONO, 'end')
    t(58, 372, 'deepseek-flash', 12, s['accent'], '700', MONO)
    t(58, 390, 'maxTokens 16 · timeout 2 s', 11, s['sub'], '400', MONO)
    t(58, 406, 'cooldown 30 s · skip 2 fails', 11, s['sub'], '400', MONO)

    add(f'<line x1="58" y1="420" x2="282" y2="420" stroke="{s["grid"]}"/>')
    t(58, 440, 'override', 11, s['faint'])
    t(58, 460, '/tier auto|strong|cheap|off', 11.5, s['text'], '700', MONO)
    t(58, 478, 'routingMode · pill · card', 11, s['sub'])

    # ---------------- bus into the two lanes ----------------
    add(f'<line x1="300" y1="304" x2="320" y2="304" stroke="{s["accent"]}" stroke-width="3" marker-end="url(#a)"/>')
    add(f'<line x1="320" y1="194" x2="320" y2="414" stroke="{s["accent"]}" stroke-width="2.4"/>')
    add(f'<line x1="320" y1="194" x2="340" y2="194" stroke="{s["accent"]}" stroke-width="2.4" marker-end="url(#a)"/>')
    add(f'<line x1="320" y1="414" x2="340" y2="414" stroke="{s["accent"]}" stroke-width="2.4" marker-end="url(#a)"/>')

    # ---------------- lanes ----------------
    add(f'<rect x="340" y="112" width="450" height="164" rx="18" fill="{s["zone"]}" stroke="{s["edge"]}" opacity=".96"/>')
    add(f'<rect x="340" y="332" width="450" height="164" rx="18" fill="{s["zone"]}" stroke="{s["edge"]}" opacity=".96"/>')
    t(356, 140, 'STRONG', 14, s['accent'], '700', MONO)
    t(774, 140, 'followSession false', 11, s['faint'], '400', MONO, 'end')
    t(356, 160, 'plan · review', 11.5, s['sub'])
    t(774, 160, 'effort high', 11, s['faint'], '400', MONO, 'end')
    t(356, 360, 'CHEAP', 14, s['sub'], '700', MONO)
    t(774, 360, 'followSession true', 11, s['faint'], '400', MONO, 'end')
    t(356, 380, 'implement · guard', 11.5, s['sub'])
    t(774, 380, 'effort low', 11, s['faint'], '400', MONO, 'end')

    add(f'<g filter="url(#soft)"><rect x="356" y="170" width="203" height="88" rx="18" fill="{s["card"]}" stroke="{s["edge"]}"/></g>')
    t(370, 196, 'plan mode', 15, s['text'], '700')
    t(370, 218, 'complex intent first', 11.5, s['sub'])
    t(370, 238, 'plan/mode', 11, s['accent'], '400', MONO)

    add(f'<g filter="url(#soft)"><rect x="571" y="170" width="203" height="88" rx="18" fill="{s["card"]}" stroke="{s["edge"]}"/></g>')
    t(585, 196, 'deepseek-v4-pro', 14, s['text'], '700', MONO)
    t(585, 218, 'the planning tier', 11.5, s['sub'])
    t(585, 238, 'tiers.strong', 11, s['accent'], '400', MONO)

    add(f'<g filter="url(#soft)"><rect x="356" y="390" width="132" height="88" rx="18" fill="{s["card"]}" stroke="{s["edge"]}"/></g>')
    t(368, 416, 'implement', 15, s['text'], '700')
    t(368, 438, 'simple intent', 11, s['sub'])
    t(368, 458, 'design + build', 11, s['sub'])

    add(f'<g filter="url(#soft)"><rect x="499" y="390" width="132" height="88" rx="18" fill="{s["card"]}" stroke="{s["warn"]}" stroke-width="1.6"/></g>')
    t(511, 416, 'guard', 15, s['warn'], '700')
    t(511, 438, 'tools/pre-execute', 11, s['sub'], '400', MONO)
    t(511, 458, '16 cmd · 5 path', 11, s['sub'])

    add(f'<g filter="url(#soft)"><rect x="642" y="390" width="132" height="88" rx="18" fill="{s["card"]}" stroke="{s["edge"]}"/></g>')
    t(654, 416, 'deepseek-flash', 13, s['text'], '700', MONO)
    t(654, 438, 'effort low', 11, s['sub'])
    t(654, 458, 'cheap landing', 11, s['sub'])

    # ---------------- bridges across the lanes ----------------
    add(f'<path d="M430 276 L430 324" stroke="{s["accent"]}" stroke-width="2.6" stroke-dasharray="6 5" marker-end="url(#a)"/>')
    t(442, 308, 'plan exit', 11, s['accent'], '700', MONO)
    add(f'<path d="M690 332 L690 284" stroke="{s["accent2"]}" stroke-width="2.6" marker-end="url(#g)"/>')
    t(678, 308, 'escalate 2 / 60 s → 180 s', 11, s['accent2'], '700', MONO, 'end')

    # ---------------- merge into the landing seam ----------------
    add(f'<line x1="790" y1="194" x2="806" y2="194" stroke="{s["accent"]}" stroke-width="2.4"/>')
    add(f'<line x1="790" y1="414" x2="806" y2="414" stroke="{s["accent"]}" stroke-width="2.4"/>')
    add(f'<line x1="806" y1="194" x2="806" y2="414" stroke="{s["accent"]}" stroke-width="2.4"/>')
    add(f'<line x1="806" y1="304" x2="812" y2="304" stroke="{s["accent"]}" stroke-width="2.8" marker-end="url(#a)"/>')

    add(f'<g filter="url(#soft)"><rect x="818" y="112" width="242" height="384" rx="20" fill="{s["card"]}" stroke="{s["edge"]}"/></g>')
    t(834, 138, 'LANDING SEAM', 11, s['accent'], '700', MONO)
    t(834, 166, '0.2.2', 11, s['faint'], '400', MONO)
    t(834, 186, 'agent.model.select()', 12, s['accent'], '700', MONO)
    t(834, 206, 'next admitted input', 11, s['sub'])
    t(834, 224, 'provider · model · effort', 11, s['faint'], '400', MONO)
    add(f'<line x1="834" y1="238" x2="1044" y2="238" stroke="{s["grid"]}"/>')
    t(834, 262, '0.2.1', 11, s['faint'], '400', MONO)
    t(834, 282, 'agent/request', 12, s['accent'], '700', MONO)
    t(834, 302, 'replacement triple', 11, s['sub'])
    t(834, 320, 'sampling scalars kept', 11, s['faint'], '400', MONO)
    add(f'<line x1="834" y1="334" x2="1044" y2="334" stroke="{s["grid"]}"/>')
    t(834, 358, 'OUTPUT', 11, s['faint'], '400', MONO, extra=' letter-spacing="1"')
    t(834, 380, 'provider/model/effort', 11, s['text'], '700', MONO)
    t(834, 400, 'autotier/tier-changed', 11, s['accent2'], '400', MONO)
    t(834, 418, 'ctx.autotier.status()', 11, s['faint'], '400', MONO)
    add(f'<line x1="834" y1="432" x2="1044" y2="432" stroke="{s["grid"]}"/>')
    t(834, 454, 'image turn', 11, s['sub'])
    t(834, 474, 'tiers.vision → deepseek-flash', 11, s['accent'], '400', MONO)

    # ---------------- footnotes ----------------
    add(f'<line x1="40" y1="520" x2="1060" y2="520" stroke="{s["grid"]}"/>')
    t(40, 542, 'guard denies rm -rf · sudo · mkfs · git push --force · '
               'credential writes · .dsh / AGENTS.md / package.json / '
               '.github/workflows', 11.5, s['sub'], '400', MONO)
    t(40, 562, 'fallback chain tiers.*.fallback · 300 s TTL · '
               'intent.attemptBand 0.45–0.70 ships disabled', 11, s['faint'], '400', MONO)
    t(40, 582, 'per-session override /tier · routingMode auto|strong|cheap|'
               'delegated|off · composer pill · settings card', 11, s['faint'], '400', MONO)
    t(40, 626, 'Apache-2.0 · PerryLink DSH plugin family', 11, s['faint'], '400', MONO)
    t(1060, 626, 'src/intent.ts · policy.ts · routing.ts · guard.ts', 11,
      s['faint'], '400', MONO, 'end')

    add('</svg>')
    path = os.path.join(OUT, f'dsh-autotier-flow-v5-{skin}.svg')
    with open(path, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write('\n'.join(lines) + '\n')
    print(f'dsh-autotier-flow-v5-{skin}.svg')


def main():
    os.makedirs(OUT, exist_ok=True)
    for skin in ('light', 'dark'):
        for lang in ('zh', 'en'):
            hero(lang, skin)
        flow_svg(skin)


if __name__ == '__main__':
    main()
