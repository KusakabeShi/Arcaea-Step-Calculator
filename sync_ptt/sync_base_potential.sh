#/bin/sh
set -x
wget "https://arcwiki.mcd.blue/index.php?title=Template:ChartConstant.json&action=raw" -O download_ChartConstant.json
wget "https://arcwiki.mcd.blue/index.php?title=Template:Packlist.json&action=raw" -O download_Packlist.json
wget "https://arcwiki.mcd.blue/index.php?title=Template:Songlist.json&action=raw" -O download_Songlist.json
mv download_ChartConstant.json ChartConstant.json
mv download_Packlist.json Packlist.json
mv download_Songlist.json Songlist.json
python3 convert.py
cp -rp base_potential.json ../dist/base_potential.json
mv base_potential.json ../public/base_potential.json