#!/usr/bin/env python3
"""Download the pinned MediaPipe runtime and hand model for local use."""

from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
VENDOR = ROOT / "dist" / "vendor"

FILES = {
    "vision_bundle.mjs": "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/vision_bundle.mjs",
    "wasm/vision_wasm_internal.js": "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm/vision_wasm_internal.js",
    "wasm/vision_wasm_internal.wasm": "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm/vision_wasm_internal.wasm",
    "wasm/vision_wasm_nosimd_internal.js": "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm/vision_wasm_nosimd_internal.js",
    "wasm/vision_wasm_nosimd_internal.wasm": "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm/vision_wasm_nosimd_internal.wasm",
    "hand_landmarker.task": "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
}


def download(relative_path: str, url: str) -> None:
    target = VENDOR / relative_path
    if target.exists() and target.stat().st_size > 1024:
        print(f"✓ 已存在  {relative_path}")
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    print(f"↓ 正在下载  {relative_path}")
    request = Request(url, headers={"User-Agent": "gesture-nebula-setup/1.0"})
    with urlopen(request, timeout=120) as response, target.open("wb") as output:
        while chunk := response.read(1024 * 1024):
            output.write(chunk)
    print(f"✓ 下载完成  {relative_path} ({target.stat().st_size / 1024 / 1024:.1f} MB)")


def main() -> None:
    print("掌间星云 · MediaPipe 资源准备\n")
    for relative_path, url in FILES.items():
        download(relative_path, url)
    print("\n全部资源已准备完成。运行 python3 server.py 启动项目。")


if __name__ == "__main__":
    main()

