# AI-assisted: Claude Code
"""Build the 3D assets for the field view in Blender and export them as GLB.

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" -b -P scripts/blender/build_field_assets.py

Writes frontend/public/models/{harvester,farmer,surroundings}.glb. Everything is original low-poly
geometry with flat colours (no textures, no brands), so the files stay small and work offline.

Axes: models are built Z-up with +X forward; the glTF exporter turns Blender (x, y, z) into
three.js (x, z, -y), so +X stays forward and Blender +Y becomes three.js -Z.
"""
import math
import random
from pathlib import Path

import bmesh
import bpy
from mathutils import Euler, Matrix, Vector

OUT = Path(__file__).resolve().parents[2] / "frontend" / "public" / "models"
OUT.mkdir(parents=True, exist_ok=True)
import os
PREVIEW = Path(os.environ.get("PREVIEW_DIR", str(OUT)))
rng = random.Random(7)


# ---------- helpers ----------

MATS = {}


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear()  # the reset deletes every material, so the cache must go too


def mat(name, hexcol, rough=0.85, metal=0.0):
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    h = hexcol.lstrip("#")
    srgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb]
    b.inputs["Base Color"].default_value = (*lin, 1)
    m.diffuse_color = (*lin, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    MATS[name] = m
    return m


def empty(name, loc=(0, 0, 0), parent=None, rot=(0, 0, 0)):
    o = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = rot
    if parent:
        o.parent = parent
    return o


def mesh(name, kind, dims, loc=(0, 0, 0), material=None, parent=None, rot=(0, 0, 0), pivot=(0, 0, 0), segs=10):
    """kind: box (dx,dy,dz) | cyl (r_bottom, r_top, height) | sphere (rx, ry, rz).
    pivot: the point of the shape (in its own centred frame) that becomes the object origin."""
    bm = bmesh.new()
    if kind == "box":
        bmesh.ops.create_cube(bm, size=1)
        bmesh.ops.scale(bm, vec=Vector(dims), verts=bm.verts)
    elif kind == "cyl":
        r1, r2, h = dims
        bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=segs, radius1=r1, radius2=r2, depth=h)
    elif kind == "sphere":
        bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=max(4, segs // 2), radius=1)
        bmesh.ops.scale(bm, vec=Vector(dims), verts=bm.verts)
    bmesh.ops.translate(bm, vec=-Vector(pivot), verts=bm.verts)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = rot
    if material:
        me.materials.append(material)
    if parent:
        o.parent = parent
    return o


def merge_static(root):
    """Join every mesh under root into one object (world positions kept). For scenery that never moves:
    one node instead of thousands makes the file much smaller and faster to draw."""
    meshes = []
    stack = list(root.children)
    while stack:
        o = stack.pop()
        stack.extend(o.children)
        if o.type == "MESH":
            meshes.append(o)
    bpy.ops.object.select_all(action="DESELECT")
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
    bpy.ops.object.join()
    merged = bpy.context.view_layer.objects.active
    merged.name = "scenery"
    merged.parent = root
    for o in [o for o in bpy.context.scene.objects if o.type == "EMPTY" and o is not root]:
        bpy.data.objects.remove(o)
    return merged


def preview(filename, cam_loc, target, lens=35):
    """Quick workbench render for checking the model by eye (not shipped)."""
    scene = bpy.context.scene
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    scene.collection.objects.link(cam)
    cam.location = cam_loc
    cam.data.lens = lens
    d = Vector(target) - Vector(cam_loc)
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    scene.camera = cam
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "MATERIAL"
    scene.display.shading.show_shadows = True
    scene.render.resolution_x, scene.render.resolution_y = 900, 600
    scene.render.filepath = str(PREVIEW / filename)
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam)


def export(root, filename):
    bpy.ops.object.select_all(action="DESELECT")
    stack = [root]
    while stack:
        o = stack.pop()
        o.select_set(True)
        stack.extend(o.children)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(filepath=str(OUT / filename), export_format="GLB", use_selection=True,
                              export_yup=True, export_apply=True, export_materials="EXPORT")
    print("wrote", OUT / filename, (OUT / filename).stat().st_size // 1024, "KB")


# ---------- farmer (standing; named parts for animation) ----------

SKIN, SHIRT, LONGYI, HAT = "#a8744f", "#efe9da", "#7b2f3a", "#d9b86c"


def build_person(parent, seated=False, prefix=""):
    """Adult farmer in a longyi and kha mauk hat. Origins: legs at the hip, arms at the shoulder,
    'torso' at the waist, so three.js can swing them. Height about 1.85 units with the hat."""
    skin, shirt, longyi, hat = mat("skin", SKIN), mat("shirt", SHIRT), mat("longyi", LONGYI), mat("hat", HAT, 0.7)
    hip = 0.86
    if not seated:
        for side, y in (("L", 0.11), ("R", -0.11)):
            leg = mesh(f"{prefix}leg{side}", "box", (0.13, 0.14, 0.82), (0, y, hip), mat("legs", "#5a3b2a"), parent,
                       pivot=(0, 0, 0.41))
            mesh(f"{prefix}foot{side}", "box", (0.22, 0.11, 0.06), (0.04, 0, -0.80), skin, leg)
        mesh(f"{prefix}longyi", "cyl", (0.27, 0.21, 0.62), (0, 0, 0.62), longyi, parent, segs=10)
    else:
        mesh(f"{prefix}lap", "box", (0.5, 0.36, 0.2), (0.2, 0, 0.1), longyi, parent)
        for side, y in (("L", 0.1), ("R", -0.1)):
            mesh(f"{prefix}shin{side}", "box", (0.13, 0.13, 0.45), (0.44, y, -0.15), mat("legs", "#5a3b2a"), parent)
    torso = empty(f"{prefix}torso", (0, 0, 0.05 if seated else hip), parent)
    mesh(f"{prefix}chest", "box", (0.27, 0.46, 0.58), (0, 0, 0.33), shirt, torso)
    for side, y in (("L", 0.31), ("R", -0.31)):
        arm = mesh(f"{prefix}arm{side}", "box", (0.11, 0.11, 0.56), (0, y, 0.58), skin, torso, pivot=(0, 0, 0.28),
                   rot=((0, -0.9, 0) if seated else (0, 0, 0)))
        mesh(f"{prefix}sleeve{side}", "box", (0.14, 0.14, 0.2), (0, 0, -0.08), shirt, arm)
    mesh(f"{prefix}head", "sphere", (0.16, 0.15, 0.18), (0, 0, 0.82), skin, torso, segs=12)
    mesh(f"{prefix}hair", "sphere", (0.165, 0.155, 0.1), (-0.02, 0, 0.9), mat("hair", "#1d1714"), torso, segs=12)
    mesh(f"{prefix}hat", "cyl", (0.5, 0.02, 0.28), (0, 0, 1.06), hat, torso, segs=16)
    mesh(f"{prefix}hatband", "cyl", (0.2, 0.19, 0.04), (0, 0, 0.96), mat("band", "#7a5a2a"), torso, segs=16)
    return torso


def build_farmer():
    reset()
    root = empty("farmer")
    build_person(root)
    preview("farmer.png", (3.2, -2.2, 1.6), (0, 0, 1.0), 50)
    export(root, "farmer.glb")


# ---------- harvester: small crawler rice combine, the kind used across the Delta ----------

def build_harvester():
    reset()
    body, trim, dark = mat("body", "#2f6f8f", 0.55, 0.2), mat("trim", "#e0b23a", 0.6), mat("dark", "#2a2a28", 0.9)
    steel = mat("steel", "#9aa3a8", 0.4, 0.6)
    root = empty("harvester")
    # crawler tracks with road wheels
    for side, y in (("L", 0.62), ("R", -0.62)):
        mesh(f"track{side}", "box", (2.4, 0.38, 0.42), (-0.1, y, 0.24), dark, root)
        for i, x in enumerate((-1.05, -0.35, 0.35, 1.05)):
            mesh(f"wheel{side}{i}", "cyl", (0.17, 0.17, 0.4), (x - 0.1, y, 0.24), steel, root,
                 rot=(math.pi / 2, 0, 0), segs=10)
    mesh("chassis", "box", (2.3, 1.2, 0.22), (-0.1, 0, 0.55), body, root)
    # grain tank and engine bay behind the operator
    mesh("tank", "box", (0.9, 1.05, 0.85), (-0.75, -0.05, 1.08), body, root)
    mesh("tankLid", "box", (0.95, 1.1, 0.06), (-0.75, -0.05, 1.53), trim, root)
    mesh("engine", "box", (0.6, 0.5, 0.55), (-0.05, -0.32, 0.93), body, root)
    mesh("exhaust", "cyl", (0.04, 0.04, 0.7), (-0.25, -0.5, 1.45), dark, root, segs=8)
    mesh("unloader", "cyl", (0.06, 0.06, 1.3), (-1.0, 0.5, 1.55), trim, root, rot=(0, math.radians(80), 0.3), segs=8)
    # operator platform, seat, canopy
    mesh("deck", "box", (0.7, 0.62, 0.08), (0.45, 0.25, 0.7), dark, root)
    mesh("seat", "box", (0.36, 0.42, 0.12), (0.25, 0.25, 0.92), dark, root)
    mesh("seatBack", "box", (0.08, 0.42, 0.4), (0.06, 0.25, 1.1), dark, root)
    mesh("console", "box", (0.18, 0.4, 0.42), (0.78, 0.25, 0.95), body, root)
    mesh("steering", "cyl", (0.12, 0.12, 0.03), (0.68, 0.25, 1.22), dark, root, rot=(0, math.radians(-50), 0), segs=12)
    for x, y in ((0.0, 0.52), (0.0, -0.02), (0.82, 0.52), (0.82, -0.02)):
        mesh("post", "cyl", (0.025, 0.025, 1.55), (x, y, 1.55), steel, root, segs=6)
    mesh("canopy", "box", (1.1, 0.82, 0.06), (0.41, 0.25, 2.34), trim, root)
    # cutting header at the front: frame, crop dividers, spinning reel
    header = empty("header", (1.45, 0, 0.45), root)
    mesh("headerFloor", "box", (0.75, 1.75, 0.08), (0, 0, 0), steel, header)
    mesh("headerBack", "box", (0.08, 1.75, 0.55), (-0.33, 0, 0.27), trim, header)
    for side, y in (("L", 0.88), ("R", -0.88)):
        mesh(f"headerSide{side}", "box", (0.75, 0.06, 0.4), (0, y, 0.2), trim, header)
    for i in range(6):
        y = -0.8 + i * 0.32
        mesh(f"divider{i}", "cyl", (0.06, 0.0, 0.32), (0.48, y, 0.04), steel, header, rot=(0, math.pi / 2, 0), segs=6)
    mesh("feeder", "box", (0.6, 0.5, 0.25), (-0.55, 0.15, 0.25), body, header, rot=(0, math.radians(-25), 0))
    reel = empty("reel", (0.12, 0, 0.62), header)  # spins about its Y axis (three.js Z)
    mesh("reelShaft", "cyl", (0.03, 0.03, 1.7), (0, 0, 0), steel, reel, rot=(math.pi / 2, 0, 0), segs=8)
    for k in range(5):
        a = k * 2 * math.pi / 5
        mesh(f"bat{k}", "box", (0.03, 1.65, 0.05), (0.26 * math.cos(a), 0, 0.26 * math.sin(a)), trim, reel)
        mesh(f"spokeL{k}", "box", (0.02, 0.02, 0.26), (0.13 * math.cos(a), 0.8, 0.13 * math.sin(a)), steel, reel,
             rot=(0, -a + math.pi / 2, 0))
        mesh(f"spokeR{k}", "box", (0.02, 0.02, 0.26), (0.13 * math.cos(a), -0.8, 0.13 * math.sin(a)), steel, reel,
             rot=(0, -a + math.pi / 2, 0))
    # the farmer driving
    driver = empty("driver", (0.25, 0.25, 0.98), root)
    build_person(driver, seated=True, prefix="drv_")
    preview("harvester.png", (5.5, -4.5, 3.2), (0.2, 0, 0.9), 40)
    export(root, "harvester.glb")


# ---------- Myaungmya surroundings ----------

def P(x, z3, y=0.0):
    """three.js (x, y, z) -> Blender (x, -z, y)."""
    return (x, -z3, y)


def coconut(parent, x, z3, h, lean):
    trunk, frond, nut = mat("palmTrunk", "#7a5f43"), mat("palmFrond", "#3f7a35", 0.8), mat("nut", "#6a5a2a")
    g = empty("coconut", P(x, z3), parent, rot=(0, 0, rng.uniform(0, 6.28)))
    segs, top = 5, Vector((0, 0, 0))
    for i in range(segs):
        seg_h = h / segs
        dx = lean * (i / segs) ** 2 * 0.6
        mesh("trunk", "cyl", (0.17 - i * 0.015, 0.15 - i * 0.015, seg_h), (dx, 0, seg_h * (i + 0.5)), trunk, g, segs=7)
        top = Vector((dx, 0, h))
    crown = empty("crown", tuple(top), g)
    for k in range(9):
        a = k * 2 * math.pi / 9 + rng.uniform(-0.15, 0.15)
        f = empty("frondArm", (0, 0, 0), crown, rot=(0, 0, a))
        mesh("frond", "box", (1.8, 0.5, 0.04), (0, 0, 0), frond, f, rot=(0, math.radians(rng.uniform(28, 48)), 0),
             pivot=(-0.9, 0, 0))
    for k in range(4):
        a = k * math.pi / 2
        mesh("coconut", "sphere", (0.11, 0.11, 0.12), (0.16 * math.cos(a), 0.16 * math.sin(a), -0.12), nut, crown, segs=8)


def nipa(parent, x, z3, size=1.0):
    """Nipa palm: no trunk, long fronds straight from the creek bank."""
    leaf = mat("nipa", "#4d8a3c", 0.8)
    g = empty("nipa", P(x, z3), parent, rot=(0, 0, rng.uniform(0, 6.28)))
    for k in range(7):
        a = k * 2 * math.pi / 7 + rng.uniform(-0.2, 0.2)
        arm = empty("nipaArm", (0, 0, 0), g, rot=(0, 0, a))
        mesh("nipaFrond", "box", (2.8 * size, 0.6 * size, 0.04), (0, 0, 0.1), leaf, arm,
             rot=(0, math.radians(-rng.uniform(35, 55)), 0), pivot=(-1.4 * size, 0, 0))


def bamboo(parent, x, z3):
    stem, leaf = mat("bamboo", "#8fa04a", 0.6), mat("bambooLeaf", "#5f9a3a", 0.85)
    g = empty("bamboo", P(x, z3), parent)
    for k in range(9):
        a, r = rng.uniform(0, 6.28), rng.uniform(0, 0.5)
        h = rng.uniform(5, 7.5)
        tilt = (rng.uniform(-0.12, 0.12), rng.uniform(-0.12, 0.12), 0)
        s = mesh("cane", "cyl", (0.06, 0.04, h), (r * math.cos(a), r * math.sin(a), h / 2), stem, g, rot=tilt, segs=6)
        mesh("leaves", "sphere", (0.7, 0.7, 1.1), (0, 0, h / 2 - 0.4), leaf, s, segs=6)


def stilt_house(parent, x, z3, turn):
    wood, wall, thatch = mat("wood", "#6b5137"), mat("bambooWall", "#c9a46b"), mat("thatch", "#8c6b3b")
    g = empty("house", P(x, z3), parent, rot=(0, 0, turn))
    for px in (-1.4, 0, 1.4):
        for py in (-1.1, 1.1):
            mesh("stilt", "cyl", (0.08, 0.08, 1.3), (px, py, 0.65), wood, g, segs=6)
    mesh("floor", "box", (3.3, 2.7, 0.12), (0, 0, 1.32), wood, g)
    mesh("walls", "box", (3.0, 2.3, 1.4), (0.1, 0, 2.08), wall, g)
    mesh("door", "box", (0.04, 0.6, 1.0), (-1.42, 0.4, 1.9), wood, g)
    mesh("window", "box", (0.04, 0.7, 0.45), (-1.42, -0.55, 2.2), mat("shade", "#3a2c1e"), g)
    for side in (1, -1):
        mesh("roof", "box", (3.7, 1.75, 0.12), (0.1, side * 0.78, 3.15), thatch, g, rot=(side * math.radians(34), 0, 0))
    mesh("ridge", "box", (3.7, 0.18, 0.14), (0.1, 0, 3.66), wood, g)
    mesh("porch", "box", (0.9, 1.2, 0.08), (-2.05, 0.4, 1.3), wood, g)
    for i in range(4):
        mesh("step", "box", (0.25, 0.7, 0.06), (-2.6 - i * 0.18, 0.4, 1.05 - i * 0.28), wood, g)
    # water jar and a straw stack by the house
    mesh("jar", "sphere", (0.3, 0.3, 0.35), (-2.0, -1.2, 0.33), mat("clay", "#9b5a36"), g, segs=10)


def haystack(parent, x, z3):
    straw = mat("straw", "#d9bf6a", 0.95)
    g = empty("haystack", P(x, z3), parent)
    mesh("stack", "cyl", (0.95, 0.15, 1.8), (0, 0, 0.9), straw, g, segs=12)
    mesh("pole", "cyl", (0.04, 0.04, 0.6), (0, 0, 2.0), mat("wood", "#6b5137"), g, segs=6)


def pagoda(parent, x, z3):
    white, gold = mat("white", "#f2efe6", 0.6), mat("gold", "#d4a93a", 0.35, 0.7)
    g = empty("pagoda", P(x, z3), parent)
    for i, (w, h) in enumerate(((5.0, 0.6), (4.0, 0.5), (3.1, 0.5), (2.3, 0.45))):
        mesh("terrace", "box", (w, w, h), (0, 0, sum(t[1] for t in ((5.0, 0.6), (4.0, 0.5), (3.1, 0.5), (2.3, 0.45))[:i]) + h / 2), white, g)
    base = 2.05
    mesh("bell", "sphere", (1.05, 1.05, 1.2), (0, 0, base + 0.9), white, g, segs=16)
    mesh("rings", "cyl", (0.5, 0.25, 0.8), (0, 0, base + 2.2), white, g, segs=12)
    mesh("spire", "cyl", (0.25, 0.0, 2.2), (0, 0, base + 3.7), gold, g, segs=12)
    mesh("hti", "sphere", (0.12, 0.12, 0.12), (0, 0, base + 4.85), gold, g, segs=8)


def canoe(parent, x, z3, turn):
    wood = mat("canoeWood", "#5c4430")
    g = empty("canoe", P(x, z3, 0.02), parent, rot=(0, 0, turn))
    mesh("hull", "sphere", (1.6, 0.32, 0.22), (0, 0, 0.05), wood, g, segs=12)
    mesh("seatPlank", "box", (0.08, 0.5, 0.04), (0.3, 0, 0.2), mat("wood", "#6b5137"), g)


def paddy(parent, x, z3, w, d, kind):
    """A neighbouring paddy: crop surface + bunds. kind: golden | green | flooded | stubble."""
    g = empty("paddy", P(x, z3), parent)
    bund = mat("bund", "#8a6a3f")
    if kind == "flooded":
        mesh("water", "box", (w, d, 0.02), (0, 0, 0.03), mat("paddyWater", "#7fb0c8", 0.15), g)
        for i in range(int(w * d / 1.6)):  # young seedlings in the water
            mesh("seedling", "cyl", (0.05, 0.0, 0.3), (rng.uniform(-w / 2 + 0.3, w / 2 - 0.3), rng.uniform(-d / 2 + 0.3, d / 2 - 0.3), 0.18),
                 mat("seedlingGreen", "#7cc36a"), g, segs=4)
    else:
        col = {"golden": "#d4b24c", "green": "#6fa043", "stubble": "#b89a5a"}[kind]
        height = {"golden": 0.75, "green": 0.6, "stubble": 0.12}[kind]
        mesh("crop", "box", (w - 0.2, d - 0.2, height), (0, 0, height / 2), mat(f"crop_{kind}", col, 0.95), g)
    for (bx, by, sx, sy) in ((0, d / 2, w + 0.3, 0.3), (0, -d / 2, w + 0.3, 0.3), (w / 2, 0, 0.3, d), (-w / 2, 0, 0.3, d)):
        mesh("bund", "box", (sx, sy, 0.25), (bx, by, 0.12), bund, g)


def build_surroundings():
    reset()
    root = empty("surroundings")
    mesh("ground", "box", (220, 220, 0.04), (0, 0, -0.06), mat("ground", "#9cbc67", 1.0), root)
    # creek behind the field, with nipa palms and a canoe
    mesh("creek", "box", (160, 4.2, 0.02), P(0, -15.5, -0.02), mat("creekWater", "#5f8fa8", 0.12), root)
    for side in (-13.2, -17.8):
        mesh("bank", "box", (160, 0.7, 0.18), P(0, side, 0.0), mat("mud", "#7a5b3a"), root)
    for x in range(-46, 47, 7):
        nipa(root, x + rng.uniform(-2, 2), -12.4 + rng.uniform(-0.4, 0.3), rng.uniform(0.8, 1.15))
        if rng.random() < 0.6:
            nipa(root, x + rng.uniform(-2, 2), -18.7 + rng.uniform(-0.3, 0.4), rng.uniform(0.8, 1.1))
    canoe(root, 6, -15.4, 0.15)
    # patchwork of neighbouring paddies (dry-season mix: golden, harvested, flooded, green)
    kinds = ["golden", "golden", "stubble", "flooded", "green"]
    for gx in range(-5, 6):
        for gz in range(-6, 3):
            x, z3 = gx * 8.8, gz * 6.2 + 3.1
            if abs(x) < 11 and abs(z3) < 8.5:      # our field
                continue
            if -20.5 < z3 < -10.5:                  # creek band
                continue
            if -22 < x < -10 and -9 < z3 < 4:       # house yard
                continue
            if z3 > 7:                              # in front of the camera: keep the view open
                continue
            paddy(root, x + rng.uniform(-0.3, 0.3), z3, 8.2, 5.7, rng.choice(kinds))
    # homestead on the left, palms and bamboo around the field, haystacks on the right
    stilt_house(root, -15.5, -3.0, math.radians(18))
    bamboo(root, -19.5, 1.5)
    bamboo(root, 15.5, -8.5)
    for (x, z3, h, lean) in ((-12.0, -7.8, 6.5, 0.8), (-13.5, 3.5, 5.6, -0.6), (12.8, -5.5, 6.2, 1.0),
                             (14.2, -1.0, 7.0, 0.5), (11.5, 4.8, 5.4, -0.7), (-9.5, -10.5, 7.2, 0.4),
                             (9.0, -10.8, 6.0, -0.5), (-24, -9, 6.8, 0.6), (24, -7, 6.4, -0.4)):
        coconut(root, x, z3, h, lean)
    haystack(root, 12.5, 1.2)
    haystack(root, 13.9, 2.6)
    pagoda(root, 21, -29)
    merge_static(root)
    preview("surroundings.png", (0, -17, 9.5), (0, 0, 0.5), 28)
    export(root, "surroundings.glb")


if __name__ == "__main__":
    build_farmer()
    build_harvester()
    build_surroundings()
