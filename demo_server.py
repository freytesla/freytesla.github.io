# Frey local demo server
# - no-store (always latest files)
# - auto-pick a free port when busy (8123 -> 8124 -> ...)
# - opens the browser automatically (disable with FREY_NO_OPEN=1)
#
# usage: python demo_server.py [port] [page]
import http.server
import mimetypes
import os
import socket
import socketserver
import sys
import threading
import webbrowser

mimetypes.add_type('model/gltf-binary', '.glb')
mimetypes.add_type('image/webp', '.webp')
mimetypes.add_type('font/woff2', '.woff2')
mimetypes.add_type('text/javascript', '.js')


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stdout.write('  %s\n' % (fmt % args))
        sys.stdout.flush()


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


def find_free_port(start, tries=20):
    for port in range(start, start + tries):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(('127.0.0.1', port))
                return port
            except OSError:
                continue
    return start


def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    want_port = int(sys.argv[1]) if len(sys.argv) > 1 else 8123
    page = sys.argv[2] if len(sys.argv) > 2 else 'index.html'
    port = find_free_port(want_port)
    url = 'http://localhost:%d/%s' % (port, page)

    with Server(('127.0.0.1', port), Handler) as httpd:
        print('')
        print('  Frey local server running')
        print('  %s' % url)
        print('  (no-cache; close this window to stop)')
        print('')
        if os.environ.get('FREY_NO_OPEN') != '1':
            threading.Timer(0.5, lambda: webbrowser.open(url)).start()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\n  stopped')


if __name__ == '__main__':
    main()
