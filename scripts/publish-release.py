"""Publish only a verified signed APK; announce updates after download validation."""
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import zipfile


def run(*args, capture=False, check=True):
    return subprocess.run(args, check=check, text=True, stdout=subprocess.PIPE if capture else None)


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


meta = json.loads(Path("release-artifacts/version.json").read_text(encoding="utf-8"))
apk = Path("release-artifacts/xu-schedule.apk")
assert digest(apk) == meta["sha256"], "APK SHA-256 mismatch"
assert re.fullmatch(r"\d+\.\d+\.\d+", meta["versionName"]), "Invalid version"
assert isinstance(meta["versionCode"], int) and meta["versionCode"] > 0
repo = os.environ["GH_REPO"]
assert repo == "newhim3/xu-schedule", "Unexpected repository"
validation = json.loads(run("gh", "api", "repos/" + repo + "/actions/runs/" + str(meta["validationRunId"]), capture=True).stdout)
assert validation["conclusion"] == "success" and validation["head_sha"] == meta["sourceCommit"], "Source validation not successful"
paths = [Path("android-webview", name) for name in ("app/build.gradle", "build.gradle", "settings.gradle", "gradle.properties", "app/src/main/AndroidManifest.xml")]
paths += list(Path("android-webview/app/src/main/java").rglob("*.java")) + list(Path("android-webview/app/src/main/res").rglob("*.xml"))
paths += [Path("replica", name) for name in ("index.html", "style.css", "app.js", "icon.svg", "manifest.webmanifest", "sw.js")]
source_hash = hashlib.sha256()
for path in sorted(paths, key=lambda p: p.as_posix()):
    source_hash.update(path.as_posix().encode())
    source_hash.update(b"\0")
    source_hash.update(path.read_text(encoding="utf-8-sig").replace("\r\n", "\n").encode())
    source_hash.update(b"\0")
assert source_hash.hexdigest() == meta["sourceHash"], "Signed APK source changed; rebuild and validate before publishing"
sdk = Path(os.environ.get("ANDROID_HOME", os.environ.get("ANDROID_SDK_ROOT", "")))
versions = sorted((sdk / "build-tools").glob("*"), key=lambda p: tuple(int(n) for n in re.findall(r"\d+", p.name)))
assert versions, "Android build tools unavailable"
tools = versions[-1]
certs = run(str(tools / "apksigner"), "verify", "--print-certs", str(apk), capture=True).stdout
assert "Signer #1 certificate SHA-256 digest: " + meta["certificateSha256"] in certs, "Signing certificate mismatch"
package = run(str(tools / "aapt"), "dump", "badging", str(apk), capture=True).stdout
assert "package: name='com.newhim3.xuschedule'" in package
assert "versionCode='" + str(meta["versionCode"]) + "'" in package
assert "versionName='" + meta["versionName"] + "'" in package
# Ensure the published package contains the current reviewed mobile UI.
with zipfile.ZipFile(apk) as archive:
    for name in ("index.html", "style.css", "app.js", "icon.svg", "manifest.webmanifest", "sw.js"):
        assert archive.read("assets/" + name) == Path("replica", name).read_bytes(), "APK web source differs: " + name

tag = "v" + meta["versionName"]
with tempfile.TemporaryDirectory() as directory:
    notes = Path(directory, "notes.md")
    notes.write_text(meta["releaseNotes"] + "\n\n安装后请在设置中开启通知、精确闹钟及全屏提醒权限。更新安装需系统确认。", encoding="utf-8")
    existing = run("gh", "release", "view", tag, "--json", "assets", capture=True, check=False)
    if existing.returncode != 0:
        run("gh", "release", "create", tag, "--target", os.environ["RELEASE_COMMIT"], "--draft", "--title", "序 · 日程 " + meta["versionName"], "--notes-file", str(notes))
        assets = []
    else:
        assets = json.loads(existing.stdout)["assets"]
    if not any(asset["name"] == "xu-schedule.apk" for asset in assets):
        run("gh", "release", "upload", tag, str(apk))
    downloaded = Path(directory, "check")
    downloaded.mkdir()
    run("gh", "release", "download", tag, "--pattern", "xu-schedule.apk", "--dir", str(downloaded))
    assert digest(downloaded / "xu-schedule.apk") == meta["sha256"], "Release asset differs; refusing to overwrite"
    run("gh", "release", "edit", tag, "--draft=false", "--latest")
    url = "https://github.com/" + repo + "/releases/download/" + tag + "/xu-schedule.apk"
    public = Path(directory, "public.apk")
    run("curl", "--fail", "--location", "--retry", "5", "--retry-all-errors", "--retry-delay", "3", "--output", str(public), url)
    assert digest(public) == meta["sha256"], "Public download verification failed"

# A fresh checkout/pull preserves concurrent main-branch changes before the update commit.
run("git", "checkout", "main")
run("git", "pull", "--ff-only", "origin", "main")
current = json.loads(Path("update.json").read_text(encoding="utf-8"))
assert current["versionCode"] <= meta["versionCode"], "Refusing to downgrade update manifest"
manifest = {key: meta[key] for key in ("versionCode", "versionName", "sha256", "releaseNotes")}
manifest["apkUrl"] = url
Path("update.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
run("git", "config", "user.name", "github-actions[bot]")
run("git", "config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com")
run("git", "add", "update.json")
if run("git", "diff", "--cached", "--quiet", check=False).returncode:
    run("git", "commit", "-m", "chore: publish verified Android update " + tag)
    run("git", "push", "origin", "main")
print("Published:", url)
