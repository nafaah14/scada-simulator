"""Turn the Wartsila hardware IO-list PDFs into one CSV.

Each channel is a main row (address, tag, description, sensor, range, unit,
scale) optionally followed by sub-rows for the signals derived from that
same channel -- sensor fault, alarm, load reduction, shutdown -- each with
its own tag, limit and event class.
"""
import csv, json, re, sys

# column boundaries, from the x positions the layout actually uses
COLS = [
    ('ch',      0,   62),
    ('plc',     62,  100),
    ('addr',    100, 182),
    ('tag',     182, 246),
    ('desc',    246, 394),
    ('sensor',  394, 420),
    ('stype',   420, 450),
    ('range',   450, 484),
    ('unit',    484, 508),
    ('scale',   508, 535),
    ('deadb',   535, 560),
    ('limit',   560, 584),
    ('event',   584, 608),
    ('tested',  608, 640),
    ('note',    640, 9999),
]

EVENTS = ['MEAS', 'ALM', 'SHD', 'TRP', 'IND', 'CONT', 'COUNT', 'SETP', 'EMG',
          'STB', 'DER', 'CNW', 'OPW', 'SF', 'AH', 'AL', 'AHH', 'ALL',
          'SDH', 'SDL', 'LRH', 'LRL', 'TRH', 'TRL']
TAG_RE = re.compile(r'^[A-Z]{3}\d_\d[A-Za-z0-9_]+$')
ADDR_RE = re.compile(r'^(M[\d.]+|MW\d+)?(DB\d+,[A-Z]*[\d.]+)?$')


def split_row(cells):
    row = {k: [] for k, _, _ in COLS}
    for c in cells:
        x, t = c['x'], c['t'].strip()
        for k, lo, hi in COLS:
            if lo <= x < hi:
                row[k].append(t)
                break
    return {k: ' '.join(v).strip() for k, v in row.items()}


def clean_unit(u):
    """The degree sign comes through the font encoding as a stray byte."""
    return re.sub(r'[^\x20-\x7e]+', '°', u).strip()


def _rest(row):
    return _tail(row)


def unmerge(row):
    """Undo the column merges the PDF layout produces."""
    # "MEASok" / "CONTok..." -> event + tested
    ev = row['event']
    if ev in EVENTS:
        return _rest(row)
    for e in sorted(EVENTS, key=len, reverse=True):
        if ev.startswith(e) and ev != e:
            row['event'], rest = e, ev[len(e):]
            if rest.startswith('ok'):
                row['tested'] = 'ok'
                rest = rest[2:]
            if rest:
                row['note'] = (rest + ' ' + row['note']).strip()
            break
    return _tail(row)


def _tail(row):
    # "2.5+5sSDL" -> limit + event
    lim = row['limit']
    for e in sorted(EVENTS, key=len, reverse=True):
        if lim.endswith(e) and lim != e:
            row['limit'] = lim[:-len(e)].strip()
            if not row['event']:
                row['event'] = e
            break
    # "M148.0DB300,X53.0" -> keep whole; split for readability
    a = row['addr']
    m = re.match(r'^(M[W]?[\d.]+)(DB\d+.*)$', a)
    if m:
        row['addr'] = m.group(1) + ' ' + m.group(2)
    # a digital's delay text lands in the analog columns; move it to limit
    for k in ('unit', 'scale', 'deadb', 'range'):
        v = row[k]
        if v and re.search(r'(?i)delay|second|min', v):
            row['limit'] = (row['limit'] + ' ' + v).strip()
            row[k] = ''
    # "TE5011ANiCrNi" -> sensor code + sensor type
    s = row['sensor']
    if not row['stype']:
        m = re.match(r'^([A-Z]{2,3}\d{3,4}[AB]?)(NiCrNi|Pt100|NC|NO|4-20 ?mA|PT100)$', s)
        if m:
            row['sensor'], row['stype'] = m.group(1), m.group(2)
    return row


def parse(path, cabinet, out):
    rows = json.load(open(path, encoding='utf8'))
    rack = slot = module = ''
    parent = None
    for r in rows:
        joined = ' '.join(c['t'] for c in r['cells']).strip()
        m = re.match(r'^Rack (\w+), Slot (\d+)', joined)
        if m:
            rack, slot = m.group(1), m.group(2)
            module = ''
            parent = None
            continue
        if joined.startswith('Siemens ') or joined.startswith('Profibus'):
            module = joined
            continue
        if not r['cells']:
            continue

        row = unmerge(split_row(r['cells']))
        tag = row['tag'].replace(' ', '')
        if not TAG_RE.match(tag):
            continue

        is_main = bool(row['ch'] and row['plc'])
        if is_main:
            parent = tag
        rec = {
            'cabinet': cabinet, 'rack': rack, 'slot': slot, 'module': module,
            'channel': row['ch'], 'plc_address': row['plc'],
            'wois_address': row['addr'], 'tag': tag,
            'description': row['desc'] or (parent and '' or ''),
            'sensor_code': row['sensor'], 'sensor_type': row['stype'],
            'range': row['range'], 'unit': clean_unit(row['unit']),
            'scale': row['scale'], 'deadband': row['deadb'],
            'limit': row['limit'], 'event': row['event'],
            'tested': row['tested'], 'note': row['note'],
            'derived_from': '' if is_main else (parent or '')
        }
        out.append(rec)


if __name__ == '__main__':
    out = []
    for spec in sys.argv[1:-1]:
        path, cabinet = spec.split('=')
        parse(path, cabinet, out)
    with open(sys.argv[-1], 'w', newline='', encoding='utf8') as f:
        w = csv.DictWriter(f, fieldnames=list(out[0].keys()))
        w.writeheader()
        w.writerows(out)
    print('records:', len(out), file=sys.stderr)
