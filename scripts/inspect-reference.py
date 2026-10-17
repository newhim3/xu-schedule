"""Decode all frames and produce a time-indexed contact sheet for motion review."""
import sys, json
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / '.tools'))
import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageChops, ImageStat

video=sys.argv[1]
dest=Path('reference-analysis/2026-10-17')
dest.mkdir(parents=True,exist_ok=True)
frames=imageio_ffmpeg.read_frames(video,pix_fmt='rgb24',output_params=['-vf','scale=216:-1'])
meta=next(frames)
width=216
height=round(meta['size'][1]*width/meta['size'][0])
if height % 2: height+=1
# ffmpeg's -1 scaling preserves integer dimensions; use the stream's source ratio.
height=int(round(meta['source_size'][1]*width/meta['source_size'][0]))
samples=[];changes=[];previous=None;count=0
for index, raw in enumerate(frames):
    actual_height=len(raw)//(216*3)
    im=Image.frombytes('RGB',(216,actual_height),raw)
    if previous is not None:
        changes.append(round(sum(ImageStat.Stat(ImageChops.difference(im,previous)).mean)/3,3))
    previous=im
    if index % max(1,round(meta['fps']/4)) == 0:
        t=index/meta['fps'];name=f'frame-{index:06d}.jpg';im.save(dest/name)
        samples.append((name,round(t,3)))
    count=index+1
for offset in range(0,len(samples),30):
    selected=samples[offset:offset+30]
    tile_h=round(216*meta['source_size'][1]/meta['source_size'][0])+25
    sheet=Image.new('RGB',(216*6,tile_h*5),'#222')
    draw=ImageDraw.Draw(sheet)
    for j,(name,t) in enumerate(selected):
        x=j%6*216;y=j//6*tile_h
        sheet.paste(Image.open(dest/name),(x,y+25));draw.text((x+6,y+5),f'{t:.2f}s',fill='white')
    sheet.save(dest/f'contact-{offset//30+1}.jpg')
(dest/'analysis.json').write_text(json.dumps({'metadata':meta,'frames':count,'samples':samples,'frame_changes':changes},indent=2),encoding='utf8')
print(json.dumps({'frames':count,'seconds':count/meta['fps'],'sheets':(len(samples)+29)//30,'fps':meta['fps']}))
