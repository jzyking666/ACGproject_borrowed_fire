"""Compose the fixed commissioning catalogue. Runtime reads the checked-in drawings."""
import json
import random
from pathlib import Path

R = random.Random(417203)
PORTS = [(0,y,1,0) for y in range(2,7)] + [(12,y,-1,0) for y in range(2,7)] + [(x,0,0,1) for x in range(2,11)] + [(x,8,0,-1) for x in range(2,11)]

def follow(port, phase, mirrors, glass, wells):
    x,y,dx,dy = port
    hits, features, seen = set(), set(), set()
    while True:
        x += dx
        y += dy
        if x in (0,12) or y in (0,8):
            return (x,y,phase), hits, features
        key = (x,y,dx,dy,phase)
        if key in seen: return None, hits, features
        seen.add(key)
        cell = (x,y)
        if cell in wells:
            x,y = wells[cell]
            features.add('well')
            continue
        if cell in glass:
            phase ^= 1
            features.add('glass')
        if cell in mirrors:
            idx,slash,prism = mirrors[cell]
            hits.add(idx)
            if prism: features.add('prism')
            if slash ^ (prism and phase): dx,dy = -dy,-dx
            else: dx,dy = dy,dx

def compose(district, local):
    rows = [2,4,6] if district < 2 else [2,3,5,6]
    cols = [2,4,6,8,10] if district < 4 else [2,3,5,7,9,10]
    grid = [(x,y) for x in cols for y in rows]
    solvable = 3 + min(district,6) + local//3
    fixed = int(district >= 1) + int(district >= 6)
    count = solvable + fixed
    num = 1 + min(4, (local+1)//3 + (district+1)//2)
    for _ in range(20000):
        chosen = R.sample(grid, count)
        spare = [p for p in grid if p not in chosen]
        glass = R.sample(spare, 1 + int(district >= 6)) if district in (2,3,5,6,7) else []
        prism = set(R.sample(range(solvable), 2 if district >= 6 else 1)) if district >= 5 else set()
        available = [p for p in spare if p not in glass]
        pair = R.sample(available, 2) if district in (4,6,7) else []
        wells = dict(zip(pair, reversed(pair)))
        mirrors = {p:(i, R.randrange(2), i in prism) for i,p in enumerate(chosen)}
        candidates = []
        for port in PORTS:
            for phase in range(1 + int(district >= 5)):
                end,hits,features = follow(port,phase,mirrors,glass,wells)
                if end and len(hits) >= (2 if district else 1) and end[:2] != port[:2]:
                    candidates.append((port,phase,end,hits,features))
        R.shuffle(candidates)
        selected, covered, features, ends = [], set(), set(), set()
        for k in range(num):
            choices = [s for s in candidates if (k or s[1] == 0) and s[0][:2] not in ends and s[2][:2] not in ends
                       and s[3].difference(covered)]
            # Some cold prism routes can share one or more mirrors of a different run.
            if not choices: break
            best = max(choices, key=lambda s: len(s[3]-covered) + .45*len(s[4]-features))
            selected.append(best)
            covered |= best[3]
            features |= best[4]
            ends.update([best[0][:2],best[2][:2]])
        if len(selected)!=num or len(covered) != count: continue
        if glass and 'glass' not in features or pair and 'well' not in features or prism and 'prism' not in features: continue
        flipped = set(R.sample(range(solvable), min(solvable, 2 + district//2 + local%3)))
        start = {p:(i, s ^ (i in flipped), k) for p,(i,s,k) in mirrors.items()}
        if all(follow(a,b,start,glass,wells)[0] == c for a,b,c,_,_ in selected): continue
        return dict(m=[[x,y,s ^ (i in flipped),int(k),int(i>=solvable)] for (x,y),(i,s,k) in mirrors.items()],
                    flips=sorted(flipped), wells=pair, glass=glass, runs=[[list(a), b,list(c)] for a,b,c,_,_ in selected])
    raise RuntimeError((district, local))

if __name__ == '__main__':
    boards = [compose(d,l) for d in range(8) for l in range(6)]
    Path(__file__).resolve().parents[1].joinpath('src/field-layouts.json').write_text('[\n'+',\n'.join(json.dumps(b,separators=(',',':')) for b in boards)+'\n]\n')
