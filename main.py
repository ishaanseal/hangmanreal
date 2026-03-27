from __future__ import annotations

import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Serve the Rope & Resolve Hangman game locally."
    )
    parser.add_argument("--host", default="127.0.0.1", help="Host to bind to.")
    parser.add_argument("--port", type=int, default=8000, help="Port to listen on.")
    args = parser.parse_args()

    project_root = Path(__file__).resolve().parent
    handler = partial(SimpleHTTPRequestHandler, directory=str(project_root))
    server = ThreadingHTTPServer((args.host, args.port), handler)

    print(f"Serving {project_root} at http://{args.host}:{args.port}")
    print("Open that URL in your browser to play. Press Ctrl+C to stop.")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
