import sys,json,subprocess
from pathlib import Path
sys.path.insert(0,'.tools')
import imageio_ffmpeg
from PIL import Image,ImageChops,ImageStat,ImageDraw
p=Path('reference-analysis'); p.mkdir(exist_ok=True)
import sys
video=sys.argv[1] if len(sys.argv)>1 else 'reference.mp4'
g=imageio_ffmpeg.read_frames(video,pix_fmt='rgb24',output_params=['-vf','scale=108:240'])
m=next(g); prev=None; changes=[]; count=0
for i,data in enumerate(g):
 im=Image.frombytes('RGB',(108,240),data)
 if prev is not None:
  delta=sum(ImageStat.Stat(ImageChops.difference(im,prev)).mean)/3
  if delta>7: changes.append({'frame':i,'time':round(i/m['fps'],3),'change':round(delta,2)})
 prev=im; count=i+1
print('Decoded frames:',count)
(p/'video-analysis.json').write_text(json.dumps({'metadata':m,'decoded_frames':count,'changes':changes},ensure_ascii=False,indent=2),encoding='utf8')
subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-hide_banner','-loglevel','error','-i',video,'-vf','fps=1','-q:v','2',str(p/'second-%03d.jpg')],check=True)
frames=sorted(p.glob('second-*.jpg'))
for start in range(0,len(frames),75):
 selected=frames[start:start+75:3]
 sheet=Image.new('RGB',(5*180,5*425),'#ddd'); draw=ImageDraw.Draw(sheet)
 for j,f in enumerate(selected):
  im=Image.open(f); im.thumbnail((176,392)); x=(j%5)*180;y=(j//5)*425
  sheet.paste(im,(x,y+24)); draw.text((x+4,y+4),str(int(f.stem.split('-')[1])-1)+' sec',fill='black')
 sheet.save(p/f'contact-{start//75+1}.jpg')
print('Saved seconds:',len(frames),'Scene changes:',len(changes))
