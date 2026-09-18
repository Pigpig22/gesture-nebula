"""Local-only static server. No uploads, analytics, or external connections."""
import argparse
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import webbrowser

parser = argparse.ArgumentParser()
parser.add_argument('--port', type=int, default=8765)
parser.add_argument('--no-browser', action='store_true')
args = parser.parse_args()
root = Path(__file__).resolve().parent / 'dist'

class Handler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, '.mjs': 'text/javascript', '.wasm': 'application/wasm'}
    def end_headers(self):
        self.send_header('Permissions-Policy', 'camera=(self), microphone=()')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()

try:
    server = ThreadingHTTPServer(('127.0.0.1', args.port), functools.partial(Handler, directory=str(root)))
except OSError as error:
    raise SystemExit(f'端口 {args.port} 不可用：{error}。可用 --port 8766 更换端口。')
url = f'http://localhost:{args.port}'
print(f'掌间星云已启动：{url}\n按 Ctrl+C 停止。', flush=True)
if not args.no_browser:
    webbrowser.open(url)
try:
    server.serve_forever()
except KeyboardInterrupt:
    print('\n已停止。')
finally:
    server.server_close()
