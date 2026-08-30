"""Generate cute vector SVG assets for the studio.

Every function returns a full SVG document string. Characters and props use a
200x200 viewBox; backgrounds use 900x520 (the studio canvas size).
"""


def _doc(body: str, width: int = 200, height: int = 200) -> str:
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
        f'viewBox="0 0 {width} {height}">'
        f"{body}</svg>"
    )


def _ell(cx: float, cy: float, rx: float, ry: float, fill: str, extra: str = "") -> str:
    return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{fill}" {extra}/>'


def _circle(cx: float, cy: float, r: float, fill: str, extra: str = "") -> str:
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}" {extra}/>'


def _rect(x: float, y: float, w: float, h: float, fill: str, rx: float = 0, extra: str = "") -> str:
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" {extra}/>'


def _poly(points: str, fill: str, extra: str = "") -> str:
    return f'<polygon points="{points}" fill="{fill}" {extra}/>'


def _path(d: str, fill: str, extra: str = "") -> str:
    return f'<path d="{d}" fill="{fill}" {extra}/>'


# ---------------------------------------------------------------- characters

def animal(kind: str) -> str:
    """Cute rounded animal characters."""
    if kind == "fox":
        body, belly, ear, nose = "#ff8a50", "#ffffff", "#5a3a2a", "#3b2317"
        ears = _poly("45,55 62,15 82,55", ear) + _poly("118,55 138,15 155,55", ear)
        tail = _path("M150,150 Q185,150 175,118 Q168,138 150,150 Z", body)
    elif kind == "bear":
        body, belly, ear, nose = "#a07450", "#e8d8b8", "#7a5230", "#3b2b1c"
        ears = _circle(58, 42, 18, ear) + _circle(142, 42, 18, ear)
        tail = ""
    elif kind == "rabbit":
        body, belly, ear, nose = "#e8e6ea", "#ffffff", "#cfc6d6", "#d69a9a"
        ears = (
            _ell(60, 30, 13, 34, ear)
            + _ell(140, 30, 13, 34, ear)
            + _ell(60, 30, 6, 20, "#ffffff")
            + _ell(140, 30, 6, 20, "#ffffff")
        )
        tail = _circle(162, 150, 16, "#ffffff")
    elif kind == "owl":
        body, belly, ear, nose = "#8a6bbf", "#e6d9f0", "#5d4690", "#f2a33c"
        ears = _poly("45,70 70,28 88,62", ear) + _poly("112,62 130,28 155,70", ear)
        tail = ""
    elif kind == "cat":
        body, belly, ear, nose = "#9aa3ad", "#e9edf2", "#7c8590", "#f58b8b"
        ears = _poly("45,52 58,18 80,55", ear) + _poly("120,55 142,18 155,52", ear)
        tail = _path("M155,145 Q185,150 178,120 Q170,138 155,145 Z", body)
    elif kind == "dog":
        body, belly, ear, nose = "#d9a878", "#f5e2c8", "#a5764a", "#5a4632"
        ears = _ell(58, 38, 14, 24, ear) + _ell(142, 38, 14, 24, ear)
        tail = ""
    else:
        raise ValueError(f"unknown animal {kind}")

    body_el = _ell(100, 120, 58, 48, body)
    belly_el = _ell(100, 140, 34, 28, belly)
    eyes = (
        _circle(82, 96, 8, "#222222")
        + _circle(118, 96, 8, "#222222")
        + _circle(84, 93, 3, "#ffffff")
        + _circle(120, 93, 3, "#ffffff")
    )
    nose_el = _ell(100, 112, 9, 7, nose)
    mouth = _path("M92,124 Q100,132 108,124", "none", 'stroke="#4a2a22" stroke-width="3" stroke-linecap="round"')
    return _doc(f"{ears}{tail}{body_el}{belly_el}{eyes}{nose_el}{mouth}")


def kid(gender: str) -> str:
    """Simplified child character."""
    if gender == "girl":
        skin, hair, shirt = "#f5c9a2", "#6b4a2b", "#e05d8a"
        bow = _path("M118,48 Q130,40 140,48 Q130,52 118,48 Z", "#ff3d6e") + _circle(128, 48, 4, "#ff3d6e")
        hair_el = (
            _circle(100, 52, 42, hair)
            + _rect(58, 48, 84, 18, hair, rx=9)
            + _poly("58,52 74,70 88,52", hair)
        )
    elif gender == "boy":
        skin, hair, shirt = "#f5c9a2", "#3a3a3a", "#4c8bf5"
        bow = ""
        hair_el = (
            _path("M58,52 Q58,18 100,18 Q142,18 142,52 L100,46 Z", hair)
            + _poly("58,50 70,68 82,50", hair)
            + _poly("118,50 130,68 142,50", hair)
        )
    else:
        raise ValueError(f"unknown kid {gender}")

    body_el = _rect(58, 96, 84, 74, shirt, rx=26)
    head = _circle(100, 62, 34, skin)
    eyes = (
        _circle(88, 60, 5, "#222222")
        + _circle(112, 60, 5, "#222222")
        + _circle(89, 58, 1.8, "#ffffff")
        + _circle(113, 58, 1.8, "#ffffff")
    )
    smile = _path("M90,72 Q100,80 110,72", "none", 'stroke="#8a4b3a" stroke-width="2.5" stroke-linecap="round"')
    return _doc(f"{hair_el}{bow}{body_el}{head}{eyes}{smile}")


# ---------------------------------------------------------------- props

def prop_tree() -> str:
    return _doc(
        _rect(88, 120, 24, 52, "#8a5a2b", rx=6)
        + _circle(100, 70, 42, "#3f9d3f")
        + _circle(72, 96, 28, "#4caf50")
        + _circle(128, 96, 28, "#4caf50")
        + _circle(100, 100, 30, "#5dc95d")
    )


def prop_sun() -> str:
    rays = "".join(
        f'<line x1="{100 + 55 * cos}" y1="{100 + 55 * sin}" x2="{100 + 80 * cos}" y2="{100 + 80 * sin}" '
        'stroke="#f6a821" stroke-width="8" stroke-linecap="round"/>'
        for cos, sin in ((1, 0), (0.7, 0.7), (0, 1), (-0.7, 0.7), (-1, 0), (-0.7, -0.7), (0, -1), (0.7, -0.7))
    )
    return _doc(rays + _circle(100, 100, 46, "#ffd23e"))


def prop_cloud() -> str:
    return _doc(
        _circle(70, 110, 26, "#ffffff")
        + _circle(100, 92, 34, "#ffffff")
        + _circle(132, 110, 26, "#ffffff")
        + _rect(60, 100, 82, 38, "#ffffff", rx=18)
        + '<rect x="60" y="112" width="82" height="26" rx="13" fill="#ffffff"/>'
    )


def prop_rock() -> str:
    return _doc(
        _path("M60,150 Q60,100 95,95 Q125,92 140,112 Q150,132 145,150 Z", "#9aa0a6")
        + _path("M70,140 Q78,118 100,114 Q120,112 130,128", "none", 'stroke="#7d838a" stroke-width="4" stroke-linecap="round"')
    )


def prop_flower() -> str:
    return _doc(
        _path("M100,150 L100,80", "none", 'stroke="#3f9d3f" stroke-width="6" stroke-linecap="round"')
        + _ell(100, 140, 16, 7, "#3f9d3f")
        + "".join(
            _ell(100 + 20 * _c(ang), 80 + 20 * _s(ang), 14, 12, petal) for ang, petal in (
                (0, "#ff7eb6"), (1.2566, "#ffb3d1"), (2.5132, "#ff7eb6"), (3.7699, "#ffb3d1"), (5.0265, "#ff7eb6")
            )
        )
        + _circle(100, 80, 11, "#ffd23e")
    )


def prop_house() -> str:
    return _doc(
        _rect(55, 110, 90, 60, "#e8b27a")
        + _rect(84, 135, 32, 35, "#7a4a2a", rx=2)
        + _circle(108, 152, 3, "#ffd23e")
        + _poly("45,112 100,52 155,112", "#d9635b")
    )


def prop_star() -> str:
    pts = []
    for i in range(10):
        ang = -90 + i * 36
        r = 70 if i % 2 == 0 else 30
        pts.append(f"{100 + r * _c(ang):.1f},{100 + r * _s(ang):.1f}")
    return _doc(_poly(" ".join(pts), "#ffd23e"))


def prop_moon() -> str:
    return _doc(
        _path("M120,40 A70,70 0 1 0 160,130 A58,58 0 1 1 120,40 Z", "#f4f1de")
        + _circle(148, 70, 7, "#e0dcc6")
        + _circle(120, 110, 5, "#e0dcc6")
    )


def prop_pizza() -> str:
    return _doc(
        _circle(100, 100, 62, "#f5b94a")
        + _circle(100, 100, 50, "#ffd47a")
        + "".join(_circle(cx, cy, 7, "#c0392b") for cx, cy in ((88, 84), (112, 84), (100, 120), (80, 108), (120, 108)))
        + "".join(_circle(cx, cy, 4, "#3f9d3f") for cx, cy in ((94, 96), (110, 96), (100, 108)))
    )


def prop_carrot() -> str:
    return _doc(
        _path("M100,150 L62,70 L138,70 Z", "#ff8c42")
        + _path("M100,150 L100,70", "none", 'stroke="#f06a2a" stroke-width="4"')
        + _path("M100,72 Q84,44 66,56", "none", 'stroke="#3f9d3f" stroke-width="7" stroke-linecap="round"')
        + _path("M100,72 Q118,44 134,56", "none", 'stroke="#4caf50" stroke-width="7" stroke-linecap="round"')
    )


def prop_book() -> str:
    return _doc(
        _rect(60, 45, 80, 110, "#5b8dd9", rx=6)
        + _rect(62, 47, 76, 106, "#ffffff", rx=5)
        + _rect(66, 54, 68, 92, "#f2f7ff", rx=3)
        + _rect(96, 47, 4, 106, "#5b8dd9")
        + _circle(98, 52, 2, "#5b8dd9")
        + "".join(_rect(74, 60 + i * 18, 50, 3, "#cfe0f5", rx=1.5) for i in range(5))
    )


def prop_butterfly() -> str:
    return _doc(
        _ell(72, 88, 30, 26, "#f28ab2")
        + _ell(128, 88, 30, 26, "#f28ab2")
        + _ell(62, 132, 22, 20, "#ffb3d1")
        + _ell(138, 132, 22, 20, "#ffb3d1")
        + _path("M98,76 L102,130", "none", 'stroke="#5a4632" stroke-width="4"')
        + _circle(86, 84, 5, "#ffffff")
        + _circle(114, 84, 5, "#ffffff")
    )


def prop_waterdrop() -> str:
    return _doc(
        _path("M100,30 Q142,88 142,122 A42,42 0 0 1 58,122 Q58,88 100,30 Z", "#4fc3f7")
        + _path("M80,122 Q78,104 92,94", "none", 'stroke="#d9f4ff" stroke-width="6" stroke-linecap="round"')
    )


def prop_rainbow() -> str:
    return _doc(
        "".join(
            f'<path d="M40,150 A90,90 0 0 1 160,150" fill="none" stroke="{c}" stroke-width="10"/>'
            for c in ("#ff5b5b", "#ffb347", "#ffe05b", "#7fd66e", "#5ba8ff")
        )
    )


# ---------------------------------------------------------------- backgrounds

def background_sky() -> str:
    return _doc(
        '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">'
        '<stop offset="0" stop-color="#4fc3f7"/><stop offset="1" stop-color="#bcebff"/></linearGradient></defs>'
        + _rect(0, 0, 900, 520, "url(#g)")
        + _circle(720, 100, 46, "#ffd23e")
        + _poly("720,60 732,88 762,88 738,105 746,134 720,116 694,134 702,105 678,88 708,88", "#f6a821")
        + _cloud_group(180, 130, 1) + _cloud_group(430, 90, 1.3) + _cloud_group(640, 180, 0.9)
    )


def background_forest() -> str:
    return _doc(
        '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">'
        '<stop offset="0" stop-color="#8be3a0"/><stop offset="1" stop-color="#cdeecb"/></linearGradient></defs>'
        + _rect(0, 0, 900, 520, "url(#g)")
        + _hill(150, 340, 220, "#58b45a") + _hill(700, 360, 260, "#66c46a")
        + _tree_bg(140, 300, 0.8) + _tree_bg(360, 320, 1) + _tree_bg(590, 310, 0.9) + _tree_bg(790, 330, 1.1)
        + _circle(760, 90, 40, "#ffd23e")
    )


def background_beach() -> str:
    return _doc(
        '<defs><linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">'
        '<stop offset="0" stop-color="#38b6e8"/><stop offset="1" stop-color="#7ad2f5"/></linearGradient></defs>'
        + _rect(0, 0, 900, 230, "url(#sea)")
        + _circle(720, 90, 42, "#ffd23e")
        + _rect(0, 230, 900, 290, "#f7e0a1")
        + "".join(_wave(60 + i * 130, 180, 40) for i in range(7))
        + _ell(700, 470, 70, 26, "#e8d191")
        + _ell(180, 440, 50, 18, "#e8d191")
    )


def background_space() -> str:
    stars = "".join(_circle(x, y, r, "#ffffff", 'opacity="0.9"') for x, y, r in (
        (60, 60, 2), (140, 120, 1.5), (210, 40, 2.5), (300, 160, 1.5), (420, 80, 2), (520, 200, 1.5),
        (610, 50, 2.5), (700, 140, 1.5), (800, 60, 2), (840, 200, 1.5), (90, 260, 1.5), (380, 280, 2),
        (560, 300, 1.5), (760, 260, 2), (180, 340, 1.5), (500, 360, 1.5), (40, 400, 2), (300, 420, 1.5),
        (660, 400, 2), (830, 350, 1.5),
    ))
    return _doc(
        _rect(0, 0, 900, 520, "#1b1f3b")
        + stars
        + _circle(150, 120, 30, "#e8a33c")
        + _circle(150, 120, 24, "#f2c14e")
        + _circle(150, 120, 26, "#f2c14e", 'opacity="0.6"')
        + _ell(700, 330, 90, 40, "#7a6fd8")
        + _ell(700, 330, 60, 24, "#8f86e0")
    )


def background_meadow() -> str:
    return _doc(
        '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">'
        '<stop offset="0" stop-color="#8fd05f"/><stop offset="1" stop-color="#c9f0b0"/></linearGradient></defs>'
        + _rect(0, 0, 900, 520, "url(#g)")
        + _hill(200, 300, 200, "#79c95c") + _hill(650, 310, 230, "#84d466")
        + "".join(_flower_bg(60 + i * 95, 400 + (i % 3) * 30) for i in range(9))
        + _circle(780, 90, 38, "#ffd23e")
    )


def background_underwater() -> str:
    return _doc(
        '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">'
        '<stop offset="0" stop-color="#37c3f7"/><stop offset="1" stop-color="#0a7bd6"/></linearGradient></defs>'
        + _rect(0, 0, 900, 520, "url(#g)")
        + "".join(_bubble(90 + i * 170, 80 + (i % 4) * 40, 6 + (i % 3) * 4) for i in range(6))
        + "".join(_bubble(150 + i * 170, 160 + (i % 3) * 36, 4 + (i % 2) * 3) for i in range(5))
        + _seaweed(120, 520) + _seaweed(300, 520, 1.2) + _seaweed(520, 520, 0.8) + _seaweed(720, 520, 1.1)
        + _ell(760, 470, 120, 40, "#e6c06a")
    )


def background_castle() -> str:
    return _doc(
        '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">'
        '<stop offset="0" stop-color="#c7a8f5"/><stop offset="1" stop-color="#8f5fd0"/></linearGradient></defs>'
        + _rect(0, 0, 900, 520, "url(#g)")
        + _circle(760, 90, 40, "#ffd23e")
        + _rect(330, 240, 240, 180, "#e8e0f0")
        + _rect(390, 120, 120, 130, "#e8e0f0")
        + _poly("390,120 450,60 510,120", "#5b3a8a")
        + "".join(_rect(340 + i * 50, 200, 30, 44, "#5b3a8a", 2) for i in range(5))
        + _rect(430, 300, 40, 120, "#5b3a8a", rx=2)
        + _circle(454, 330, 4, "#ffd23e")
        + "".join(_rect(80 + i * 90, 360, 30, 60, "#c8b8e0") for i in range(9))
    )


# ---------------------------------------------------------------- helpers

def _c(deg: float) -> float:
    import math
    return math.cos(deg)


def _s(deg: float) -> float:
    import math
    return math.sin(deg)


def _cloud_group(x: float, y: float, s: float) -> str:
    return (
        f'<g transform="translate({x},{y}) scale({s})">'
        + _circle(0, 0, 26, "#ffffff")
        + _circle(30, -16, 32, "#ffffff")
        + _circle(62, 0, 26, "#ffffff")
        + _rect(-16, -4, 92, 30, "#ffffff", rx=15)
        + "</g>"
    )


def _hill(x: float, y: float, r: float, color: str) -> str:
    return f'<path d="M{x - r},{y + 80} A{r},{r * 0.7} 0 0 1 {x + r},{y + 80} Z" fill="{color}"/>'


def _tree_bg(x: float, y: float, s: float) -> str:
    return (
        f'<g transform="translate({x},{y}) scale({s})">'
        + _rect(-7, 10, 14, 34, "#7a5230", rx=4)
        + _circle(0, -8, 26, "#3f9d3f")
        + _circle(-20, 14, 18, "#4caf50")
        + _circle(20, 14, 18, "#4caf50")
        + "</g>"
    )


def _wave(x: float, y: float, r: float) -> str:
    return f'<path d="M{x - r},{y} A{r},{r * 0.55} 0 0 0 {x + r},{y}" fill="none" stroke="#e8f8ff" stroke-width="5" stroke-linecap="round"/>'


def _flower_bg(x: float, y: float) -> str:
    return (
        f'<g transform="translate({x},{y})">'
        + _circle(0, -10, 7, "#ff7eb6")
        + _circle(-7, -3, 7, "#ff9ec9")
        + _circle(7, -3, 7, "#ff9ec9")
        + _circle(0, 4, 7, "#ff7eb6")
        + _circle(0, -3, 5, "#ffd23e")
        + "</g>"
    )


def _bubble(x: float, y: float, r: float) -> str:
    return _circle(x, y, r, "#ffffff", 'opacity="0.35"')


def _seaweed(x: float, y: float, s: float = 1) -> str:
    return (
        f'<g transform="translate({x},{y}) scale({s})">'
        + _path("M0,0 Q20,-60 0,-120 Q-20,-180 0,-240", "none", 'stroke="#2e9e62" stroke-width="14" stroke-linecap="round"')
        + _path("M30,10 Q50,-50 30,-100 Q12,-150 30,-200", "none", 'stroke="#3fb57a" stroke-width="12" stroke-linecap="round"')
        + "</g>"
    )


CHARACTERS = {"fox", "bear", "rabbit", "owl", "cat", "dog"}
PROPS = {
    "tree": prop_tree,
    "sun": prop_sun,
    "cloud": prop_cloud,
    "rock": prop_rock,
    "flower": prop_flower,
    "house": prop_house,
    "star": prop_star,
    "moon": prop_moon,
    "pizza": prop_pizza,
    "carrot": prop_carrot,
    "book": prop_book,
    "butterfly": prop_butterfly,
    "waterdrop": prop_waterdrop,
    "rainbow": prop_rainbow,
}
BACKGROUNDS = {
    "sky": background_sky,
    "forest": background_forest,
    "beach": background_beach,
    "space": background_space,
    "meadow": background_meadow,
    "underwater": background_underwater,
    "castle": background_castle,
}


def render(key: str) -> str:
    if key in CHARACTERS:
        return animal(key)
    if key in ("girl", "boy"):
        return kid(key)
    if key in PROPS:
        return PROPS[key]()
    if key in BACKGROUNDS:
        return BACKGROUNDS[key]()
    raise ValueError(f"unknown render key {key}")


def is_background(key: str) -> bool:
    return key in BACKGROUNDS