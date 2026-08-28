"""Extract a PDF table as rows of columns.

The IO-list PDFs are laid out with absolute text positioning, so the only
reliable way to recover columns is to track the text matrix while walking
the content stream and group the fragments by their y coordinate.
"""
import re, sys, zlib, json


def page_streams(data):
    """Content streams in page order (best effort: document order)."""
    out = []
    for m in re.finditer(rb'stream\r?\n', data):
        start = m.end()
        end = data.find(b'endstream', start)
        if end < 0:
            continue
        try:
            s = zlib.decompress(data[start:end])
        except Exception:
            continue
        if b'Tj' in s or b'TJ' in s:
            out.append(s)
    return out


TOKEN = re.compile(rb"""
      (?P<num>-?\d*\.?\d+)
    | (?P<str>\((?:[^()\\]|\\.)*\))
    | (?P<arr>\[(?:[^\[\]\\]|\\.)*\])
    | (?P<op>[A-Za-z'"*]+)
""", re.X | re.S)


def unescape(b):
    b = re.sub(rb'\\([nrtbf])', lambda m: {b'n': b'\n', b'r': b'\r', b't': b'\t',
                                          b'b': b'', b'f': b''}[m.group(1)], b)
    b = re.sub(rb'\\(\d{1,3})', lambda m: bytes([int(m.group(1), 8) & 0xFF]), b)
    b = b.replace(rb'\(', b'(').replace(rb'\)', b')').replace(rb'\\', b'\\')
    return b.decode('latin-1')


def parse(stream):
    """Yield (x, y, text) for every text-showing operation."""
    stack = []
    tm = [1, 0, 0, 1, 0, 0]
    tlm = list(tm)
    leading = 0.0
    operands = []

    def mul(a, b):
        return [a[0]*b[0]+a[1]*b[2], a[0]*b[1]+a[1]*b[3],
                a[2]*b[0]+a[3]*b[2], a[2]*b[1]+a[3]*b[3],
                a[4]*b[0]+a[5]*b[2]+b[4], a[4]*b[1]+a[5]*b[3]+b[5]]

    for m in TOKEN.finditer(stream):
        if m.group('num') is not None:
            operands.append(float(m.group('num')))
            continue
        if m.group('str') is not None:
            operands.append(('s', m.group('str')[1:-1]))
            continue
        if m.group('arr') is not None:
            operands.append(('a', m.group('arr')[1:-1]))
            continue

        op = m.group('op').decode('latin-1')
        if op == 'BT':
            tm = [1, 0, 0, 1, 0, 0]; tlm = list(tm)
        elif op == 'Tm' and len(operands) >= 6:
            tm = [float(v) for v in operands[-6:]]; tlm = list(tm)
        elif op in ('Td', 'TD') and len(operands) >= 2:
            if op == 'TD':
                leading = -float(operands[-1])
            tlm = mul([1, 0, 0, 1, float(operands[-2]), float(operands[-1])], tlm)
            tm = list(tlm)
        elif op == 'TL' and operands:
            leading = float(operands[-1])
        elif op == "T*":
            tlm = mul([1, 0, 0, 1, 0, -leading], tlm); tm = list(tlm)
        elif op in ('Tj', 'TJ', "'", '"'):
            if op in ("'", '"'):
                tlm = mul([1, 0, 0, 1, 0, -leading], tlm); tm = list(tlm)
            txt = ''
            if operands and isinstance(operands[-1], tuple):
                kind, raw = operands[-1]
                if kind == 's':
                    txt = unescape(raw)
                else:
                    txt = ''.join(unescape(p[1:-1]) for p in
                                  re.findall(rb'\((?:[^()\\]|\\.)*\)', raw))
            if txt.strip():
                yield (round(tm[4], 1), round(tm[5], 1), txt)
        elif op == 'q':
            stack.append(list(tm))
        elif op == 'Q' and stack:
            tm = stack.pop()
        if op:
            operands = []


def rows_for(stream, ytol=2.0):
    frags = sorted(parse(stream), key=lambda f: (-f[1], f[0]))
    rows, cur, cy = [], [], None
    for x, y, t in frags:
        if cy is None or abs(y - cy) <= ytol:
            cur.append((x, t)); cy = y if cy is None else cy
        else:
            rows.append(sorted(cur)); cur = [(x, t)]; cy = y
    if cur:
        rows.append(sorted(cur))
    return rows


if __name__ == '__main__':
    data = open(sys.argv[1], 'rb').read()
    out = []
    for pi, s in enumerate(page_streams(data)):
        for r in rows_for(s):
            out.append({'page': pi + 1, 'cells': [{'x': x, 't': t} for x, t in r]})
    json.dump(out, open(sys.argv[2], 'w', encoding='utf8'), ensure_ascii=False)
    print('rows:', len(out), file=sys.stderr)
