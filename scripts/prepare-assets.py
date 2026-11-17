#!/usr/bin/env python3
"""Extract prototype artwork and geometry from the designer-supplied PDFs.

Requires PyMuPDF and Pillow. Original files remain outside the repository.
Usage: python scripts/prepare-assets.py --source-dir /path/to/supplied/pdfs
"""
from __future__ import annotations

import argparse
import csv
import io
import json
import re
from pathlib import Path

import fitz
from PIL import Image, ImageDraw


TECH_TEXT = {
    'assembly-line': 'During Reinforce, you may add 4 Ships instead of 3.',
    'rapid-advance': 'After MOVE INTO, you may convert 1 of your Ships in the active system into a Settlement. This is a direct conversion, not a SETTLE action.',
    'frontier-pioneer': 'Before SETTLE, add 1 Ship from your Reserve into the active system.',
    'genesis': 'Immediately when acquired, add 1 Settlement from your Reserve onto any empty planet on the board. If no planet is empty, there is no effect.',
    'population-explosion': 'After PRODUCE, do a free SETTLE action in the active system.',
    'soylent-green': 'During SETTLE, if all planets in the active system are full, you may replace opponents’ Settlements with your own. Removed Settlements become their owners’ Credits.',
    'planet-killer': 'Immediately, if the additional black-hole token is not on the board, you may place it over a non-home planet. Return its Settlements as Credits and block that planet.',
    'artificial-warp': 'Immediately, if the additional warp token is not on the board, you may place it in any face-up system.',
    'arcologies': 'You may SETTLE one extra space above a planet’s printed capacity. The extra space is shared across Arcologies owners. The planet is full at printed capacity or one above it.',
    'kessler-syndrome': 'Immediately, if the additional asteroid-belt token is not on the board, you may place it along an edge of a face-up system, keeping the board connected including warp links.',
    'planet-nine': 'Immediately, if the additional planet token is not on the board, you may place it in any face-up system.',
    'mercenaries': 'After MOVE INTO, convert up to 3 Credits into Ships in the active system.',
    'banking': 'Whenever you do an action, you may also Invest it.',
    'spice': 'After PRODUCE, do a free PRODUCE action in the active system. That bonus activates other applicable Techs but does not trigger Spice again.',
    'agility': 'Your Ships can move through asteroid belts.',
    'gravity-drive': 'During MOVE INTO, each of your Ships can carry an opponent Ship. A carried Ship may be destroyed instead of your own Ship when entering a black hole.',
    'foresight': 'You may always privately peek at the top 2 face-down Event cards.',
    'patents': 'Other players cannot acquire a Tech you already own.',
    'research-lab': 'You may buy Techs at half price, rounded down, or voluntarily pay full price.',
    'death-sun': 'During ATTACK, each sacrificed Ship removes up to 3 opposing Ships OR 2 opposing Settlements. A single sacrifice cannot mix the two target types.',
    'cloaking': 'Before ATTACK, add 1 Ship from your Reserve into the active system.',
    'strategic-stall': 'Once per round during PLAN, you may pass instead of placing an action token.',
    'filibuster': 'At the end of PLAN, in player order, you may move 1 of your action tokens to the top of its current stack.',
    'patrol': 'Opponents cannot ATTACK your Settlements until they have eliminated your Ships in that system.',
    'insurance': 'During the ACTIONS phase, while you still have action tokens on the board, each time your turn is skipped because none of your action tokens are on top of a stack, gain 1 Credit or 1 Ship. Place a gained Ship anywhere you have a Settlement, or in your home system.',
    'eminent-domain': 'Before normal endgame scoring, you may do a free SETTLE action in your home system.',
    'disruptor': 'Immediately choose a system. Opponents cannot place action tokens there next round. Multiple buyers in the same round choose distinct systems in player order.',
    'sabotage': 'Choose a Credit value X and remove another player’s non-Sabotage Tech worth up to X. You must pay at least the target’s full printed price (cannot be discounted by Research lab). Return its ownership rocket to its owner’s Reserve. Sabotage cannot be bought in the last round.',
    'flexible-economy': 'You may always move Credits back to your Reserve.',
    'government-incentives': 'Before SETTLE, do a free MOVE INTO action in the active system.',
}

EVENT_TEXT = {
    'cyber-attack': 'During ACTIONS this round, players may resolve any player’s action token on top of a stack, placing it on their own board and acting or Investing as their own.',
    'ceasefire': 'This round, all players must Invest their ATTACK action.',
    'communist-decree': 'Immediately, all players return Credits to Reserve, then gain up to 3 Credits from Reserve.',
    'ragnarok': 'Immediately repeat the Event step: discard the Events, draw 2 more, and hold another auction. If the Event deck is empty, there is no effect.',
    'stealth-invasion': 'Immediately, the selecting player may add up to 3 Ships from Reserve into any face-up system or systems.',
    'scrambler': 'At the end of PLAN this round, the selecting player may turn one entire action-token stack upside down.',
    'economic-boom': 'This round, Investments receive 2 rockets instead of 1.',
    'luddite-decree': 'All Techs have no effect while this Event is active.',
    'all-your-base': 'Immediately, the selecting player may do a free MOVE INTO action in a system of their choice.',
    'technological-singularity': 'Immediately add 4 more Techs to the display.',
    'flexibility': 'This round, the selecting player may perform any one of the four actions regardless of the action-board slot used.',
    'multicultural-tension': 'Immediately, the selecting player may add 1 Settlement from Reserve onto the home planet of the player to their left, if there is capacity.',
    'consolidation': 'Immediately, the selecting player may do a free SETTLE action in a system of their choice.',
    'spacetime-rip': 'This round, all systems are adjacent for the selecting player’s MOVE INTO actions.',
    'politics': 'Immediately, in player order, every player chooses an action they will not use this round and places an action token in that slot.',
    'vorsprung': 'Immediately, the selecting player may claim an available Tech of printed value up to 6 for free, using a Reserve rocket. Cannot claim Sabotage.',
    'turtling': 'Immediately, all players return Credits to Reserve, then add up to 3 Ships from Reserve into their home system.',
    'gravitational-lensing': 'This round, all players can MOVE INTO through asteroid belts and cannot use warps.',
    'migration': 'Immediately, the selecting player may redistribute all Settlements within one chosen system.',
    'recession': 'This round, all players must Invest their PRODUCE action.',
    'hive-mind': 'Immediately, the selecting player may produce 1 Ship from every planet across the board where they and another player both have Settlements.',
    'ammo-shortage': 'This round, each sacrificed attacking Ship destroys only 1 opponent Ship instead of 2.',
    'famine': 'Immediately, each player returns half their Settlements in their home system, rounded up, to Reserve, choosing which planets lose them.',
    'el-mayarah': 'This round, the selecting player produces double from shared planets: 2 Ships/Credits, or 4 if full.',
    'capital-injection': 'Immediately, the selecting player may gain up to 10 Credits from Reserve.',
    'galactic-summit': 'Immediately, the selecting player chooses a non-home system. Move all Ships on the board to it.',
    'black-cloud': 'This round, only Settlements can be attacked, not Ships.',
    'earth-first': 'This round, every player’s first PLAN token must be placed in their home system.',
    'prophecy': 'Immediately, the selecting player may add up to 3 available Explore tokens to empty planets in distinct systems, then reveal all Explore tokens on the board.',
    'alliance': 'Immediately, the selecting player chooses another player who cannot ATTACK them while this Event is active.',
}


def source_file(directory: Path, name: str) -> Path:
    matches = list(directory.rglob(name))
    if len(matches) != 1:
        raise ValueError(f'Expected one {name} below {directory}; found {len(matches)}')
    return matches[0]


def page_image(page, clip, width):
    clip = fitz.Rect(clip)
    pix = page.get_pixmap(matrix=fitz.Matrix(width / clip.width, width / clip.width), clip=clip, alpha=False)
    return Image.frombytes('RGB', (pix.width, pix.height), pix.samples)


def page_without_image_layers(page, excluded_xrefs):
    """Clone a source page and omit selected image paint operations.

    Removing only the named XObject's Do operator exposes the actual layers
    beneath it. The original PDF, transforms, clips and all other paint
    operations remain unchanged; no raster repair or background synthesis is
    involved. Return the clone so its lifetime covers the eventual render.
    """
    names = {image[7] for image in page.get_images(full=True) if image[0] in excluded_xrefs}
    assert len(names) == len(excluded_xrefs), (excluded_xrefs, names)
    document = fitz.open()
    document.insert_pdf(page.parent, from_page=page.number, to_page=page.number)
    cloned_page = document[0]
    removed = {name: 0 for name in names}
    for xref in cloned_page.get_contents():
        stream = document.xref_stream(xref)
        for name in names:
            # Source resource names contain no PDF name escapes. Retain the
            # surrounding graphics-state operators so subsequent layers keep
            # their exact original transforms and clipping paths.
            pattern = rb'/' + re.escape(name.encode('ascii')) + rb'\s+Do\b'
            stream, count = re.subn(pattern, b'', stream)
            removed[name] += count
        document.update_stream(xref, stream)
    assert all(removed.values()), removed
    return document


def save_webp(image, target, quality=78):
    target.parent.mkdir(parents=True, exist_ok=True)
    image.save(target, 'WEBP', quality=quality, method=6)
    return {'image': '/' + target.relative_to(OUTPUT / 'public').as_posix(), 'width': image.width, 'height': image.height, 'bytes': target.stat().st_size}


def anchor(rect, tile_rect):
    return {'x': round((rect.x0 + rect.x1 - 2 * tile_rect.x0) / (2 * tile_rect.width), 6),
            'y': round((rect.y0 + rect.y1 - 2 * tile_rect.y0) / (2 * tile_rect.height), 6),
            'radiusX': round(rect.width / (2 * tile_rect.width), 6),
            'radiusY': round(rect.height / (2 * tile_rect.height), 6)}


def settlement_slots(page, planet_rect, reference_rect):
    """Measure the centres of the printed grey indicator circles.

    These circles are vector paths over the planet raster. Each circle consists
    of four cubic Beziers; the longer arms of the indicator are separate paths.
    Coordinates are fractions of the reference image, usually the whole hex.
    """
    circles = []
    for drawing in page.get_drawings():
        rect = drawing['rect']
        fill = drawing['fill']
        if not (fill and all(abs(channel - .647) < .002 for channel in fill)):
            continue
        if not (10 < rect.width < 20 and 10 < rect.height < 20):
            continue
        if len(drawing['items']) != 4 or any(item[0] != 'c' for item in drawing['items']):
            continue
        centre = (rect.tl + rect.br) / 2
        if planet_rect.contains(centre):
            circles.append(centre)
    circles.sort(key=lambda point: (point.y, point.x))
    return [{'x': round((point.x-reference_rect.x0)/reference_rect.width, 6),
             'y': round((point.y-reference_rect.y0)/reference_rect.height, 6)} for point in circles]


def extract_first_player(cards):
    """Extract the newer marker on Cards page 33 without the exterior labels."""
    page = cards[32]
    silhouette = page.get_drawings()[0]
    assert len(silhouette['items']) == 11 and all(item[0] == 'c' for item in silhouette['items'])
    # Reuse the source outline as an alpha mask. Its Bezier control points lie
    # outside the visible outline, so a plain bounding-box crop is insufficient.
    mask_document = fitz.open()
    mask_page = mask_document.new_page(width=page.rect.width, height=page.rect.height)
    shape = mask_page.new_shape()
    for item in silhouette['items']:
        shape.draw_bezier(*item[1:])
    shape.finish(fill=(1, 1, 1), color=None, closePath=True)
    shape.commit()
    scale = 4
    pixmap = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
    image = Image.frombytes('RGB', (pixmap.width, pixmap.height), pixmap.samples).convert('RGBA')
    mask_pixmap = mask_page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=True)
    mask = Image.frombytes('RGBA', (mask_pixmap.width, mask_pixmap.height), mask_pixmap.samples).getchannel('A')
    image.putalpha(mask)
    crop = mask.getbbox()
    image = image.crop(crop).transpose(Image.Transpose.ROTATE_90)
    image = image.resize((600, round(image.height * 600 / image.width)), Image.Resampling.LANCZOS)
    # Padded source-object bounds surround each printed Economy icon. After the
    # counter-clockwise rotation, the five stages read from left to right.
    stage_bounds = [
        ('investments', 'Investments', (65, 66, 105, 97)),
        ('event', 'Event', (60, 107, 110, 143)),
        ('tech', 'Tech', (63, 150, 106, 180)),
        ('reinforce', 'Reinforce', (64, 197, 107, 214)),
        ('pass', 'Pass first player', (71.5, 218.5, 99, 247.5)),
    ]
    crop_rect = fitz.Rect([coordinate / scale for coordinate in crop])
    stages = []
    for stage_id, label, bounds in stage_bounds:
        rect = fitz.Rect(bounds)
        stages.append({'id': stage_id, 'label': label, 'region': {
            'x': round((rect.y0-crop_rect.y0)/crop_rect.height, 6),
            'y': round((crop_rect.x1-rect.x1)/crop_rect.width, 6),
            'width': round(rect.height/crop_rect.height, 6),
            'height': round(rect.width/crop_rect.width, 6),
        }})
    return {**save_webp(image, OUTPUT/'public/art/first-player.webp', quality=86),
            'stages': stages,
            'source': {'filename': 'SpaceForce Cards v1.80.pdf', 'page': 33,
                       'crop': list(crop_rect), 'rotation': '90 degrees counter-clockwise',
                       'description': 'Original rocket silhouette with Economy icons; exterior page labels excluded. Highlight regions are padded around the source icon bounds.'}}


def extract_planet_nine(cardboard):
    page = cardboard[6]
    images = [fitz.Rect(info['bbox']) for info in page.get_image_info(xrefs=True)]
    planets = [rect for rect in images if 53 < rect.width < 58 and 53 < rect.height < 58]
    assert len(planets) == 1
    rect = planets[0]
    slots = settlement_slots(page, rect, rect)
    assert len(slots) == 1
    image = page_image(page, rect, 320).convert('RGBA')
    mask = Image.new('L', image.size, 0)
    ImageDraw.Draw(mask).ellipse((0, 0, image.width-1, image.height-1), fill=255)
    image.putalpha(mask)
    image = image.resize((160, round(image.height/2)), Image.Resampling.LANCZOS)
    return {**save_webp(image, OUTPUT/'public/art/planet-nine.webp', quality=84),
            'capacity': 1, 'center': {'x': .5, 'y': .5}, 'settlementSlots': slots,
            'source': {'filename': 'Space Force A4 Cardboard 1.40.pdf', 'page': 7,
                       'crop': [round(coordinate, 3) for coordinate in rect]}}


def extract_black_hole(cardboard):
    """Use the original circular Explore token, including its blue rim."""
    page = cardboard[6]
    images = [fitz.Rect(info['bbox']) for info in page.get_image_info(xrefs=True)]
    overlays = [rect for rect in images if 80 < rect.width < 84 and 78 < rect.height < 82
                and rect.x0 < 300 and rect.y0 > 390]
    assert len(overlays) == 1
    centre = (overlays[0].tl + overlays[0].br) / 2
    discs = [rect for rect in images if 84 < rect.width < 88 and 84 < rect.height < 88
             and rect.contains(centre)]
    assert len(discs) == 1
    rect = discs[0]
    # Keep the source XObjects' own circular soft masks. Rendering against a
    # white paper matte and then applying an ellipse would leave a white fringe.
    scale = 384 / rect.width
    pixmap = page.get_pixmap(matrix=fitz.Matrix(scale, scale), clip=rect, alpha=True)
    image = Image.open(io.BytesIO(pixmap.tobytes('png'))).convert('RGBA')
    image = image.resize((192, 192), Image.Resampling.LANCZOS)
    return {**save_webp(image, OUTPUT/'public/art/black-hole.webp', quality=84),
            'center': {'x': .5, 'y': .5},
            'source': {'filename': 'Space Force A4 Cardboard 1.40.pdf', 'page': 7,
                       'crop': [round(coordinate, 3) for coordinate in rect],
                       'description': 'Left circular black-hole Explore token, including its original blue rim. The print sheet slightly compresses its height; normalized to a circular 192-pixel image.'}}


def extract_space_features(cardboard):
    """Extract the additional asteroid belt and warp with their source clips."""
    page = cardboard[6]
    images = page.get_image_info(xrefs=True)
    definitions = [
        ('asteroidBelt', 'asteroid-belt.webp', 64, 'y', 90,
         lambda rect: 35 < rect.width < 55 and 200 < rect.height < 245,
         'Original additional asteroid-belt token, preserving the printed vertical orientation. The long axis follows image y; rotate about center to match the chosen edge. Its native JPEG is horizontal, but the source PDF rotates and clips it to the printed vertical capsule.'),
        ('warp', 'warp.webp', 240, 'x', 0,
         lambda rect: 113 < rect.width < 123 and 86 < rect.height < 99,
         'Original additional warp token, preserving the printed landscape hexagon and original PDF clipping paths and image soft mask.'),
    ]
    result = {}
    for feature_id, filename, width, long_axis, angle, matches, description in definitions:
        candidates = [info for info in images if matches(fitz.Rect(info['bbox']))]
        assert len(candidates) == 1, (feature_id, candidates)
        info = candidates[0]
        rect = fitz.Rect(info['bbox'])
        height = round(width * rect.height / rect.width)
        # Render the whole PDF composition with alpha, rather than extracting
        # the JPEG alone: the capsule/hexagon cuts are source clipping paths.
        scale = width * 2 / rect.width
        pixmap = page.get_pixmap(matrix=fitz.Matrix(scale, scale), clip=rect, alpha=True)
        image = Image.open(io.BytesIO(pixmap.tobytes('png'))).convert('RGBA')
        image = image.resize((width, height), Image.Resampling.LANCZOS)
        result[feature_id] = {
            **save_webp(image, OUTPUT/'public/art'/filename, quality=82),
            'center': {'x': .5, 'y': .5},
            'orientation': {'longAxis': long_axis, 'angleDegrees': angle},
            'source': {
                'filename': 'Space Force A4 Cardboard 1.40.pdf', 'page': 7,
                'crop': [round(coordinate, 3) for coordinate in rect],
                'nativeImageDimensions': {'width': info['width'], 'height': info['height']},
                'description': description,
            },
        }
    return result


def extract_tile(row, document):
    page = document[int(row['source_pdf_page']) - 1]
    images = page.get_image_info(xrefs=True)
    backgrounds = sorted([fitz.Rect(i['bbox']) for i in images if 360 < fitz.Rect(i['bbox']).width < 367 and 414 < fitz.Rect(i['bbox']).height < 420], key=lambda r:r.x0)
    assert len(backgrounds) == 2, row['name']
    tile_rect = backgrounds[0 if row['sheet_position'] == 'left' else 1]
    candidates = [(fitz.Rect(i['bbox']), i['xref']) for i in images if tile_rect.contains(fitz.Rect(i['bbox']).tl + (fitz.Rect(i['bbox']).br - fitz.Rect(i['bbox']).tl) / 2)]
    planets, suns, holes, warps, blocked = [], [], [], [], []
    hole_xrefs = set()
    for rect, xref in candidates:
        w,h = rect.width,rect.height
        capacity = 6 if 138<w<142 and abs(w-h)<2 else 3 if 97<w<102 and abs(w-h)<2 else 2 if 84<w<88 and abs(w-h)<2 else 1 if 53<w<58 and abs(w-h)<2 else None
        if capacity:
            slots = settlement_slots(page, rect, tile_rect)
            assert len(slots) == capacity, (row['name'], capacity, len(slots))
            planets.append({'capacity':capacity, **anchor(rect,tile_rect), 'home':capacity==6, 'settlementSlots':slots})
        elif 112<w<116 and 112<h<116:
            suns.append(anchor(rect,tile_rect))
        elif 150<w<220 and 70<h<160:
            holes.append(anchor(rect,tile_rect))
            hole_xrefs.add(xref)
        elif 113<w<121 and 90<h<99:
            warps.append(anchor(rect,tile_rect))
        elif 40<w<51 and 200<h<240:
            blocked.append(0 if anchor(rect,tile_rect)['x'] > 0.5 else 3)
    planets.sort(key=lambda p:(-p['capacity'],p['y'],p['x']))
    for i,planet in enumerate(planets):
        planet['index']=i
        planet['id']=f"{row['system_id']}.planet.{i}"
    expected=sorted([int(c) for c in row['planet_capacities'].split(';') if c],reverse=True)
    assert [p['capacity'] for p in planets] == expected,(row['name'],planets,expected)
    assert len(suns)==1,(row['name'],suns)
    assert len(holes)==int(row['fixed_black_holes']),(row['name'],holes)
    assert len(warps)==int(row['fixed_warps']),(row['name'],warps)
    # Render oversized before masking/resampling to keep the hex outline clean.
    filtered_document = page_without_image_layers(page, hole_xrefs) if hole_xrefs else None
    image=page_image(filtered_document[0] if filtered_document else page,tile_rect,800).convert('RGBA')
    if filtered_document:
        filtered_document.close()
    mask=Image.new('L',image.size,0)
    w,h=image.size
    ImageDraw.Draw(mask).polygon([(w/2,0),(w,h/4),(w,3*h/4),(w/2,h),(0,3*h/4),(0,h/4)],fill=255)
    image.putalpha(mask)
    image=image.resize((400,462),Image.Resampling.LANCZOS)
    file=OUTPUT/'public/art/systems'/f"{row['system_id'].split('.',1)[1]}.webp"
    source={'filename':DOCUMENT_NAMES[row['source_id']],'page':int(row['source_pdf_page']),'position':row['sheet_position'],'crop':[round(x,3) for x in tile_rect]}
    if hole_xrefs:
        source['excludedLayers']=['printed-black-hole']
    return {
        'id':row['system_id'],'name':row['name'],**save_webp(image,file,quality=68),
        'sun':suns[0],'planets':planets,'homePlanetIndex':next((p['index'] for p in planets if p['home']),None),
        'fixedBlackHoles':holes,'fixedWarps':warps,'blockedEdges':sorted(set(blocked)),
        'source':source,
    }


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-dir',type=Path,default=Path('/workspace/attachments'))
    parser.add_argument('--output-root',type=Path,default=Path(__file__).resolve().parents[1])
    args=parser.parse_args()
    OUTPUT=args.output_root.resolve()
    DOCUMENT_NAMES={'pdf.cardboard':'Space Force A4 Cardboard 1.40.pdf','pdf.centre-hexes':'13th hex.pdf'}
    docs={key:fitz.open(source_file(args.source_dir,name)) for key,name in DOCUMENT_NAMES.items()}
    manifest={'schemaVersion':1,'coordinates':{'x':'fraction_of_image_width','y':'fraction_of_image_height','rotationOrigin':{'x':0.5,'y':0.5},'pointyHexAspectRatio':400/462},'systems':{},'cards':{},'aids':{},'backs':{},'notes':[]}
    with (OUTPUT/'catalog/systems.csv').open(newline='') as handle:
        for row in csv.DictReader(handle):
            manifest['systems'][row['system_id']]=extract_tile(row,docs[row['source_id']])
    cards=fitz.open(source_file(args.source_dir,'SpaceForce Cards v1.80.pdf'))
    manifest['firstPlayer']=extract_first_player(cards)
    manifest['features']={'planet':extract_planet_nine(docs['pdf.cardboard']),
                          'blackHole':extract_black_hole(docs['pdf.cardboard']),
                          **extract_space_features(docs['pdf.cardboard'])}
    with (OUTPUT/'catalog/cards.csv').open(newline='') as handle:
        for row in csv.DictReader(handle):
            slug=row['card_id'].split('.',1)[1]
            text=(TECH_TEXT if row['kind']=='tech' else EVENT_TEXT)[slug]
            page=cards[int(row['cards_pdf_page'])-1]
            target=OUTPUT/'public/art'/('tech' if row['kind']=='tech' else 'events')/(slug+'.webp')
            result={'id':row['card_id'],'name':row['name'],'kind':row['kind'],'cost':None if not row['cost'] else row['cost'] if row['cost']=='X' else int(row['cost']),'text':text,**save_webp(page_image(page,page.rect,240),target,quality=82),'source':{'filename':'SpaceForce Cards v1.80.pdf','page':int(row['cards_pdf_page'])}}
            if slug=='rapid-advance':result['rulesOverride']='Use the almanac/direct-conversion wording; the printed card uses SETTLE.'
            if slug in ('death-sun','sabotage','insurance'):result['rulesOverride']='Designer clarification, 17 November 2026; supersedes the original card wording.'
            manifest['cards'][row['card_id']]=result
    for name,page_number in [('tech',2),('event',34)]:
        page=cards[page_number-1]
        manifest['backs'][name]=save_webp(page_image(page,page.rect,240),OUTPUT/'public/art'/(name+'-back.webp'),quality=80)
    aid=fitz.open(source_file(args.source_dir,'SpaceForce Player aid v1.50.pdf'))
    for name,page_no,clip in [('actions',3,(20,0,285,405)),('sequence',4,(20,0,285,405))]:
        manifest['aids'][name]={**save_webp(page_image(aid[page_no-1],clip,530),OUTPUT/'public/art/aids'/(name+'.webp'),quality=85),'source':{'filename':'SpaceForce Player aid v1.50.pdf','page':page_no,'crop':list(clip)}}
    rules=fitz.open(source_file(args.source_dir,'Space Force rules v1.80.pdf'))
    cover_info=max(rules[0].get_image_info(xrefs=True),key=lambda i:i['width']*i['height'])
    cover_image=Image.open(io.BytesIO(rules.extract_image(cover_info['xref'])['image'])).convert('RGB')
    manifest['cover']={**save_webp(cover_image,OUTPUT/'public/art/cover.webp',quality=82),'source':{'filename':'Space Force rules v1.80.pdf','page':1,'description':'Embedded cover illustration; matching designer branding, includes by Charlie Fish credit.'}}
    # The print source has a starfield hex background useful as a neutral back.
    background=Image.open(io.BytesIO(docs['pdf.cardboard'].extract_image(28)['image'])).convert('RGBA').resize((800,924),Image.Resampling.LANCZOS)
    back_mask=Image.new('L',background.size,0)
    ImageDraw.Draw(back_mask).polygon([(400,0),(800,231),(800,693),(400,924),(0,693),(0,231)],fill=255)
    background.putalpha(back_mask)
    background=background.resize((400,462),Image.Resampling.LANCZOS)
    manifest['backs']['system']={**save_webp(background,OUTPUT/'public/art/system-back.webp',quality=68),'source':{'filename':DOCUMENT_NAMES['pdf.cardboard'],'page':1,'description':'Embedded starfield background, masked to remove print crop marks.'}}
    manifest['notes']=[
        'All centres/radii are derived from source PDF image bounding boxes, not inferred from the raster at runtime.',
        'Settlement slot centres are measured from the printed PDF vector indicator circles. Each planet has exactly its printed capacity of slots, in top-to-bottom then left-to-right order, normalized to the whole tile image. Any Arcologies overflow needs a separate UI anchor.',
        'The first-player marker uses the newer artwork on Cards page 33. Stage regions are normalized top-left rectangles padded around each printed icon; they are highlight guides, not gameplay hit regions.',
        'Suns are deliberately anchored at their printed positions, which differ from geometric hex centres.',
        'Clarke, Lem and Adams base artwork omits only the printed black-hole image XObject. Overlay features.blackHole at fixedBlackHoles centres; the unchanged source radii describe the former printed image bounds, not the new circular token diameter.',
        'Le Guin has no printed black hole. The hole on the same source sheet belongs to the separate Lem hex.',
        'Lem has TWO printed asteroid belts, at edges 0 and 3; the systems.csv transcription has been corrected to include both.',
        'Le Guin has FOUR planets, capacities 2;2;1;1. The catalogue transcription has been corrected to exclude the central sun.',
        'Card artwork remains the supplied original; semantic text applies designer clarifications, including Rapid Advance direct conversion and Spice non-recursion.',
        'Cover extracted from rulebook page 1; the separately supplied inline PNG binary was not available in the execution workspace.',
        'Source sheets include duplicated player aids; exactly two faces are extracted for one shared double-sided aid.',
    ]
    (OUTPUT/'src').mkdir(exist_ok=True)
    (OUTPUT/'src/art-data.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
    sizes={category:sum(v['bytes'] for v in manifest[category].values()) for category in ['systems','cards','aids','backs']}
    print(json.dumps({'systems':len(manifest['systems']),'cards':len(manifest['cards']),'aids':len(manifest['aids']),'sizes':sizes,'coverBytes':manifest['cover']['bytes']},indent=2))
