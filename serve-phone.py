"""Serve only the six public prototype assets; no directory listing or project access."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
import argparse,mimetypes
root=Path(__file__).resolve().parent/'replica'
allowed={'/':'index.html','/index.html':'index.html','/style.css':'style.css','/app.js':'app.js','/icon.svg':'icon.svg','/manifest.webmanifest':'manifest.webmanifest','/sw.js':'sw.js'}
class Handler(BaseHTTPRequestHandler):
 def do_GET(self):
  name=allowed.get(urlsplit(self.path).path)
  if name is None:self.send_error(404);return
  file=root/name
  if not file.is_file():self.send_error(404);return
  content=file.read_bytes();self.send_response(200)
  self.send_header('Content-Type', {'webmanifest':'application/manifest+json','js':'text/javascript'}.get(file.suffix[1:],mimetypes.guess_type(str(file))[0] or 'application/octet-stream'))
  self.send_header('Content-Length',str(len(content)));self.send_header('Cache-Control','no-cache');self.send_header('X-Content-Type-Options','nosniff');self.end_headers();self.wfile.write(content)
 def do_POST(self):self.send_error(405)
p=argparse.ArgumentParser();p.add_argument('--bind',default='127.0.0.1');p.add_argument('--port',type=int,default=8766);args=p.parse_args()
print(f'Phone preview: http://{args.bind}:{args.port}/',flush=True)
ThreadingHTTPServer((args.bind,args.port),Handler).serve_forever()
