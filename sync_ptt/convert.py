import json
ChartConstant = json.load(open("ChartConstant.json"))
Packlist = json.load(open("Packlist.json"))
Packlist["packs"] += [{'id': 'single', 'name_localized': {'en': 'Memory Archive'}, "section": "arcaea"}]
Songlist = json.load(open("Songlist.json"))

diff_names = ["PST","PRS","FTR","BYD","ETR"]
output_result = {}

def lookup_pack(packid):
    for packidx,pack in enumerate(Packlist["packs"]):
        if packid == pack["id"]:
            return pack
    raise Exception("Song " + songid + " Not Found")
def lookup_song(songid):
    for songidx,song in enumerate(Songlist["songs"]):
        if song["id"] == songid:
            return song
    raise Exception("Song " + songid + " Not Found")
def get_pack_name(packid):
    pack_info = lookup_pack(packid)
    if "pack_parent" in pack_info:
        parent_id = pack_info["pack_parent"]
        return get_pack_name(parent_id) + " " + pack_info["name_localized"]["en"]
    return pack_info["name_localized"]["en"]

## Init
for pack in Packlist["packs"]:
    pack_id = pack["id"]
    pack_name = get_pack_name(pack_id)
    section_id = pack["section"]
    output_result.setdefault(section_id, {})
    output_result[section_id].setdefault(pack_name, {})

for songid, diffs in ChartConstant.items():
    song_info = lookup_song(songid)
    song_name = song_info["title_localized"]["en"]
    pack_id = song_info["set"]
    pack_info = lookup_pack(pack_id)
    pack_name = get_pack_name(pack_id)
    section_id = pack_info["section"]
    for diffidx, diff in enumerate(diffs):
        if diff == None:
            continue
        output_result[section_id][pack_name].setdefault(song_name, [])
        output_result[section_id][pack_name][song_name] += [ {diff_names[diffidx]: diff["constant"]} ]
json.dump(output_result,open("base_potential.json","w"))



def score_potential(score, base_potential):
    if score >=  10000000:
        return base_potential+2
    elif score >= 9800000:
        return base_potential+1+(score  - 9800000)/200000
    return max( base_potential+(score   - 9500000)/300000 , 0)
def reverse_score_potential(target_score_potential, base_potential):
    if target_score_potential > base_potential + 2 or target_score_potential < 0:
        return -1  # impossible
    if target_score_potential <= base_potential + 2 and target_score_potential > base_potential + 1:
        return 9800000 + (target_score_potential - (base_potential + 1)) * 200000
    return 9500000 + (target_score_potential - base_potential) * 300000