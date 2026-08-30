"""Curated starter asset library definitions.

Each entry becomes one row in the `assets` table and one generated SVG file in
the local media directory. `render_key` selects the generator in svg_lib.
"""

from typing import TypedDict


class SeedAsset(TypedDict):
    slug: str
    name: str
    description: str
    kind: str
    render_key: str
    tags: list[str]
    age_min: int | None
    age_max: int | None


CHARACTERS: list[SeedAsset] = [
    {"slug": "fox", "name": "Fox", "description": "A friendly orange fox.", "kind": "character", "render_key": "fox", "tags": ["animal", "storytelling", "food-chain"], "age_min": 5, "age_max": None},
    {"slug": "bear", "name": "Bear", "description": "A cuddly brown bear.", "kind": "character", "render_key": "bear", "tags": ["animal", "storytelling"], "age_min": 5, "age_max": None},
    {"slug": "rabbit", "name": "Rabbit", "description": "A fluffy white rabbit.", "kind": "character", "render_key": "rabbit", "tags": ["animal", "storytelling", "food-chain"], "age_min": 5, "age_max": None},
    {"slug": "owl", "name": "Owl", "description": "A wise purple owl.", "kind": "character", "render_key": "owl", "tags": ["animal", "storytelling"], "age_min": 5, "age_max": None},
    {"slug": "cat", "name": "Cat", "description": "A calm grey cat.", "kind": "character", "render_key": "cat", "tags": ["animal", "storytelling"], "age_min": 5, "age_max": None},
    {"slug": "dog", "name": "Dog", "description": "A happy golden dog.", "kind": "character", "render_key": "dog", "tags": ["animal", "storytelling"], "age_min": 5, "age_max": None},
    {"slug": "girl", "name": "Girl", "description": "A cheerful girl with a bow.", "kind": "character", "render_key": "girl", "tags": ["person", "storytelling"], "age_min": 5, "age_max": None},
    {"slug": "boy", "name": "Boy", "description": "A smiling boy.", "kind": "character", "render_key": "boy", "tags": ["person", "storytelling"], "age_min": 5, "age_max": None},
]

PROPS: list[SeedAsset] = [
    {"slug": "tree", "name": "Tree", "description": "A green leafy tree.", "kind": "prop", "render_key": "tree", "tags": ["nature", "storytelling", "environment"], "age_min": 5, "age_max": None},
    {"slug": "sun", "name": "Sun", "description": "A bright smiling sun.", "kind": "prop", "render_key": "sun", "tags": ["nature", "water-cycle", "solar-system", "environment"], "age_min": 5, "age_max": None},
    {"slug": "cloud", "name": "Cloud", "description": "A fluffy white cloud.", "kind": "prop", "render_key": "cloud", "tags": ["nature", "water-cycle", "environment"], "age_min": 5, "age_max": None},
    {"slug": "rock", "name": "Rock", "description": "A smooth grey rock.", "kind": "prop", "render_key": "rock", "tags": ["nature", "storytelling"], "age_min": 5, "age_max": None},
    {"slug": "flower", "name": "Flower", "description": "A pink flower with a stem.", "kind": "prop", "render_key": "flower", "tags": ["nature", "storytelling", "environment"], "age_min": 5, "age_max": None},
    {"slug": "house", "name": "House", "description": "A cosy house with a red roof.", "kind": "prop", "render_key": "house", "tags": ["storytelling", "fractions"], "age_min": 5, "age_max": None},
    {"slug": "star", "name": "Star", "description": "A shiny golden star.", "kind": "prop", "render_key": "star", "tags": ["solar-system", "space", "storytelling"], "age_min": 5, "age_max": None},
    {"slug": "moon", "name": "Moon", "description": "A pale crescent moon.", "kind": "prop", "render_key": "moon", "tags": ["solar-system", "space"], "age_min": 5, "age_max": None},
    {"slug": "pizza", "name": "Pizza", "description": "A tasty pizza with toppings.", "kind": "prop", "render_key": "pizza", "tags": ["fractions", "food"], "age_min": 5, "age_max": None},
    {"slug": "carrot", "name": "Carrot", "description": "A crunchy orange carrot.", "kind": "prop", "render_key": "carrot", "tags": ["food-chain", "food", "fractions"], "age_min": 5, "age_max": None},
    {"slug": "book", "name": "Book", "description": "An open blue book.", "kind": "prop", "render_key": "book", "tags": ["storytelling", "learning"], "age_min": 5, "age_max": None},
    {"slug": "butterfly", "name": "Butterfly", "description": "A pink butterfly with wings.", "kind": "prop", "render_key": "butterfly", "tags": ["nature", "food-chain", "environment"], "age_min": 5, "age_max": None},
    {"slug": "waterdrop", "name": "Water Drop", "description": "A sparkling blue water drop.", "kind": "prop", "render_key": "waterdrop", "tags": ["water-cycle", "environment"], "age_min": 5, "age_max": None},
    {"slug": "rainbow", "name": "Rainbow", "description": "A colourful rainbow arc.", "kind": "prop", "render_key": "rainbow", "tags": ["water-cycle", "environment", "storytelling"], "age_min": 5, "age_max": None},
]

BACKGROUNDS: list[SeedAsset] = [
    {"slug": "bg-sky", "name": "Sky", "description": "A bright blue sky with clouds.", "kind": "background", "render_key": "sky", "tags": ["nature", "water-cycle", "environment", "storytelling"], "age_min": 5, "age_max": None},
    {"slug": "bg-forest", "name": "Forest", "description": "A green forest with tall trees.", "kind": "background", "render_key": "forest", "tags": ["nature", "environment", "storytelling", "food-chain"], "age_min": 5, "age_max": None},
    {"slug": "bg-beach", "name": "Beach", "description": "A sandy beach by the sea.", "kind": "background", "render_key": "beach", "tags": ["nature", "environment", "water-cycle", "storytelling"], "age_min": 5, "age_max": None},
    {"slug": "bg-space", "name": "Space", "description": "Outer space with stars and a planet.", "kind": "background", "render_key": "space", "tags": ["solar-system", "space"], "age_min": 5, "age_max": None},
    {"slug": "bg-meadow", "name": "Meadow", "description": "A sunny meadow full of flowers.", "kind": "background", "render_key": "meadow", "tags": ["nature", "environment", "storytelling", "food-chain"], "age_min": 5, "age_max": None},
    {"slug": "bg-underwater", "name": "Underwater", "description": "An underwater scene with bubbles and seaweed.", "kind": "background", "render_key": "underwater", "tags": ["water-cycle", "environment"], "age_min": 5, "age_max": None},
    {"slug": "bg-castle", "name": "Castle", "description": "A fairytale castle in a purple sky.", "kind": "background", "render_key": "castle", "tags": ["storytelling", "fantasy"], "age_min": 5, "age_max": None},
]

ALL: list[SeedAsset] = CHARACTERS + PROPS + BACKGROUNDS