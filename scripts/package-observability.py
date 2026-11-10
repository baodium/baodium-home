"""Build a deterministic, source-only lab download. Never include local reports or caches."""
from pathlib import Path
import hashlib
import zipfile
import sys

root = Path(__file__).resolve().parents[1]
source = root / 'labs' / 'observability'
output = root / 'public' / 'downloads' / 'baodium-observability-lab.zip'
output.parent.mkdir(parents=True, exist_ok=True)
blocked = {'node_modules', 'reports', '__pycache__', '.git', '.venv'}
files = [path for path in sorted(source.rglob('*')) if path.is_file() and not any(part in blocked for part in path.relative_to(source).parts) and not path.name.startswith('.env')]
if '--check' in sys.argv:
    with zipfile.ZipFile(output) as archive:
        expected = {'baodium-observability/' + path.relative_to(source).as_posix(): path.read_bytes() for path in files}
        assert set(archive.namelist()) == set(expected), 'The download archive file list is stale.'
        assert all(archive.read(name) == content for name, content in expected.items()), 'The download archive content is stale.'
        assert archive.testzip() is None
    print('Observability download matches every source file; no reports or caches bundled.')
    raise SystemExit(0)
with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for path in sorted(source.rglob('*')):
        relative = path.relative_to(source)
        if not path.is_file() or any(part in blocked for part in relative.parts) or path.name.startswith('.env'):
            continue
        entry = zipfile.ZipInfo('baodium-observability/' + relative.as_posix(), (2026, 11, 10, 0, 0, 0))
        entry.compress_type = zipfile.ZIP_DEFLATED
        entry.external_attr = 0o644 << 16
        archive.writestr(entry, path.read_bytes())
with zipfile.ZipFile(output) as archive:
    assert archive.testzip() is None
print(f'{output.name}: {output.stat().st_size} bytes; SHA256 {hashlib.sha256(output.read_bytes()).hexdigest()}')
