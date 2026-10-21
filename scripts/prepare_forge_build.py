#!/usr/bin/env python3
"""Prepare the workbench source with baseline patches and build it locally.

Pass a private artifact snapshot taken from the target deployment. The source
workbench's installed dependencies are reused; credentials and env files are
excluded. The work directory must be new to avoid reusing partial build output.
"""
import argparse
from pathlib import Path
import shutil
import subprocess

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source', type=Path, required=True)
parser.add_argument('--artifacts', type=Path, required=True)
parser.add_argument('--catalog', type=Path, required=True)
parser.add_argument('--work-dir', type=Path, required=True)
args = parser.parse_args()
if args.work_dir.exists():
    raise SystemExit('Use a new private work directory')
source = args.source.resolve()
build = args.work_dir / 'webapp'
shutil.copytree(source, build, ignore=shutil.ignore_patterns('node_modules', '.next', '.env*', '.git', '._*'))
(build / 'node_modules').symlink_to(source / 'node_modules', target_is_directory=True)
for name in ('queries', 'config', 'schemas', 'scripts'):
    shutil.copytree(args.artifacts / name, args.work_dir / name, ignore=shutil.ignore_patterns('._*'), dirs_exist_ok=True)
patches = Path(__file__).resolve().parents[1] / 'deploy/forge/source'
for path in patches.rglob('*'):
    if path.is_file():
        destination = build / path.relative_to(patches)
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(path, destination)
shutil.copyfile(args.catalog, args.work_dir / 'queries/logan_security_dashboard_rules.json')
subprocess.run(['npm', 'run', 'build'], cwd=build, check=True)
print('Completed Forge build:', build)
