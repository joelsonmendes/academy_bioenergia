#!/usr/bin/env python3
"""Prepare pinned official Node.js binaries for offline distribution (build machine only).

Uses inherited proxy/CA settings. Does not install or execute downloaded binaries.
"""
import argparse
import concurrent.futures
import hashlib
import json
from pathlib import Path
import shutil
import tarfile
import urllib.request
import zipfile

VERSION = "v24.22.2"
BASE = "https://nodejs.org/dist/" + VERSION + "/"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(BASE + "SHASUMS256.txt", timeout=30) as response:
        sums = response.read()
    (output / "SHASUMS256.txt").write_bytes(sums)
    checks = {row.split()[1].lstrip("*"): row.split()[0] for row in sums.decode().splitlines()}

    def prepare(platform):
        name = "node-" + VERSION + "-" + platform + (".zip" if platform == "win-x64" else ".tar.xz")
        archive = output / name
        if not archive.exists() or hashlib.sha256(archive.read_bytes()).hexdigest() != checks[name]:
            temporary = archive.with_suffix(archive.suffix + ".download")
            with urllib.request.urlopen(BASE + name, timeout=60) as response, temporary.open("wb") as target:
                shutil.copyfileobj(response, target)
            if hashlib.sha256(temporary.read_bytes()).hexdigest() != checks[name]:
                raise RuntimeError("SHA-256 mismatch: " + name)
            temporary.replace(archive)
        destination = output / platform
        destination.mkdir(exist_ok=True)
        prefix = "node-" + VERSION + "-" + platform + "/"
        if platform == "win-x64":
            with zipfile.ZipFile(archive) as package:
                binary = package.read(prefix + "node.exe")
                license_text = package.read(prefix + "LICENSE")
            if not binary.startswith(b"MZ"):
                raise RuntimeError("Invalid Windows executable")
            executable = destination / "node.exe"
        else:
            with tarfile.open(archive) as package:
                binary = package.extractfile(prefix + "bin/node").read()
                license_text = package.extractfile(prefix + "LICENSE").read()
            if not binary.startswith(b"\x7fELF"):
                raise RuntimeError("Invalid Linux executable")
            executable = destination / "node"
        executable.write_bytes(binary)
        if platform == "linux-x64":
            executable.chmod(0o755)
        (destination / "LICENSE").write_bytes(license_text)
        return {"name": name, "sha256": checks[name], "bytes": archive.stat().st_size,
                "url": BASE + name, "binarySha256": hashlib.sha256(binary).hexdigest()}

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        files = list(executor.map(prepare, ["win-x64", "linux-x64"]))
    report = {"version": VERSION, "source": "https://nodejs.org",
              "verified": "SHA-256 against official HTTPS SHASUMS256.txt (signature not independently verified)",
              "files": files}
    (output / "runtime-provenance.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({"version": VERSION, "files": len(files), "output": str(output)}))


if __name__ == "__main__":
    main()
