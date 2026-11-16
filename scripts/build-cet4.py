"""Build the additional CET4 pack from an ECDICT CSV supplied as an argument."""
from pathlib import Path
import csv, hashlib, json, re, sys, unicodedata
root = Path(__file__).resolve().parent.parent
source = Path(sys.argv[1])
def key(word):
    return re.sub(r'\s+', ' ', unicodedata.normalize('NFKC', word).lower().strip().replace('’', "'").replace('‘', "'"))
def senses(text):
    result = []
    for line in text.replace('\\n', '\n').splitlines():
        line = line.strip()
        if not line:
            continue
        match = re.match(r'^((?:(?:n|v|vt|vi|a|adj|adv|pron|prep|conj|num|art|aux|interj|pl|abbr)\.?\s*(?:[/&,]\s*)?){1,3})\s+(.+)$', line, re.I)
        result.append({'pos': match.group(1).strip() if match else '', 'text': match.group(2).strip() if match else line})
    return result
entries = {}
with source.open(newline='', encoding='utf-8-sig') as stream:
    for row in csv.DictReader(stream):
        if 'cet4' in row['tag'].split() and row['word'].strip() and row['translation'].strip():
            entries.setdefault(key(row['word']), row)
def rank(row):
    values = [int(row[f]) for f in ['bnc', 'frq'] if row[f].isdigit() and int(row[f]) > 0]
    return (min(values) if values else 1000000, key(row['word']))
units, words = [], []
for index, row in enumerate(sorted(entries.values(), key=rank)):
    if index % 100 == 0:
        number = index // 100 + 1
        units.append({'id': f'set-{number:03}', 'label': f'Unit {number:02}', 'type': 'word'})
    words.append({'id': key(row['word']), 'unit': units[-1]['id'], 'word': row['word'].strip(), 'type': 'word', 'senses': senses(row['translation']), 'phonetic': row['phonetic']})
pack = {'meta': {'source': 'https://github.com/skywind3000/ECDICT', 'tag': 'cet4', 'count': len(words), 'grouping': '按词频顺序，每组100词；末组为剩余词条。', 'edition': '考试标签整理版，不等同于官方全量考试大纲。'}, 'units': units, 'words': words}
(root / 'docs/cet4.js').write_text('window.CIJIAN_CET4=' + json.dumps(pack, ensure_ascii=False, separators=(',', ':')) + ';\n')
metadata = root / 'docs/licenses/EXAM-BOOKS-SOURCE.json'
report = json.loads(metadata.read_text())
assert report['sha256'] == hashlib.sha256(source.read_bytes()).hexdigest(), 'Different dictionary source; review provenance before replacing.'
report['selection']['cet4'] = 'tag contains cet4'
report['counts']['cet4'] = {'words': len(words), 'units': len(units)}
report['note'] = '四级、考研词库分别依据公开词典 cet4、ky 标签整理，不宣称为官方全量大纲；六级词书另见 XIAOYAN-CET6-SOURCE.json。'
metadata.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(report['counts']['cet4'], ensure_ascii=False))
