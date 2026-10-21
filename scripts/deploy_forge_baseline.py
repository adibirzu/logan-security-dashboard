#!/usr/bin/env python3
"""Deploy a reviewed Next build through owned, checksum-verified ConfigMaps.

Uses the current deployment's image and environment. Canary has no Service or
Ingress. Existing volumes and mounts are preserved with resourceVersion checks.
"""
import argparse
import base64
import copy
import gzip
import hashlib
import io
import json
from pathlib import Path
import subprocess
import struct
import tarfile

INSTALL = '''const fs = require('fs'), cp = require('child_process'), crypto = require('crypto');
const root = '/tmp/forge-baseline';
const manifest = JSON.parse(fs.readFileSync(root + '/manifest.json'));
const data = Buffer.concat(manifest.parts.map(p => fs.readFileSync(root + '/' + p)));
if (crypto.createHash('sha256').update(data).digest('hex') !== manifest.sha256) throw Error('Forge overlay checksum mismatch');
const result = cp.spawnSync('tar', ['xzf', '-', '-C', '/app'], {input: data, encoding: null});
if (result.status !== 0) throw Error('Forge overlay extraction failed');
console.log('Forge baseline overlay installed: ' + manifest.sha256.slice(0,12));
'''


def package(build):
    for name in ('.next/BUILD_ID', '.next/server/app/api/forge/artifacts/route.js', '.next/server/app/api/forge/baseline/route.js', '.next/routes-manifest.json'):
        if not (build / name).is_file():
            raise RuntimeError('Incomplete Next build: ' + name)
    stream = io.BytesIO()
    with tarfile.open(fileobj=stream, mode='w') as archive:
        paths = list((build / '.next').rglob('*'))
        for folder in ('queries', 'config', 'schemas', 'scripts'):
            paths += [p for p in (build.parent / folder).rglob('*') if p.suffix in ('.json', '.py')]
        for path in sorted(paths):
            if not path.is_file() or path.is_symlink() or path.name.startswith("._"):
                continue
            if path.is_relative_to(build / '.next'):
                rel = path.relative_to(build)
                if rel.parts[1] in ('cache', 'standalone', 'diagnostics') or path.suffix in ('.map', '.ts'):
                    continue
            else:
                rel = Path('oci-log-analytics-detections') / path.relative_to(build.parent)
            info = archive.gettarinfo(str(path), str(rel))
            info.mtime = info.uid = info.gid = 0
            info.uname = info.gname = ''
            with path.open('rb') as source:
                archive.addfile(info, source)
    return gzip.compress(stream.getvalue(), mtime=0)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--context', required=True)
    parser.add_argument('--build', type=Path, required=True)
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--receipt-dir', type=Path, required=True)
    args = parser.parse_args()
    blob = package(args.build)
    digest = hashlib.sha256(blob).hexdigest()
    prefix = 'forge-baseline-' + digest[:12]
    parts, cms = [], []
    for i, offset in enumerate(range(0, len(blob), 600000)):
        key = f'part-{i:03d}'
        parts.append(key)
        cms.append({'apiVersion':'v1','kind':'ConfigMap','metadata':{'namespace':'logan-forge','name':f'{prefix}-{i}'},'immutable':True,'binaryData':{key:base64.b64encode(blob[offset:offset+600000]).decode()}})
    png = (args.build / 'public/octo-icon.png').read_bytes()
    width, height = struct.unpack('>II', png[16:24])
    if not 0 < width <= 256 or not 0 < height <= 256:
        raise RuntimeError('Unsupported favicon source dimensions')
    icon = struct.pack('<HHH', 0, 1, 1) + struct.pack('<BBBBHHII', width % 256, height % 256, 0, 0, 1, 32, len(png), 22) + png
    cms.append({'apiVersion':'v1','kind':'ConfigMap','metadata':{'namespace':'logan-forge','name':prefix+'-icons'},'immutable':True,'binaryData':{'favicon.ico':base64.b64encode(icon).decode()}})
    cms.append({'apiVersion':'v1','kind':'ConfigMap','metadata':{'namespace':'logan-forge','name':prefix+'-install'},'immutable':True,'data':{'install.cjs':INSTALL,'manifest.json':json.dumps({'parts':parts,'sha256':digest})}})
    print(json.dumps({'payload_bytes':len(blob),'sha256':digest,'configmaps':[c['metadata']['name'] for c in cms],'apply':args.apply}),flush=True)
    if not args.apply:
        return
    args.receipt_dir.mkdir(parents=True, exist_ok=True)
    kube = ['kubectl','--context',args.context,'-n','logan-forge']
    def run(command, data=None):
        return subprocess.check_output(kube+command, input=json.dumps(data).encode() if data is not None else None)
    owned_command = ['sh','-c','node /tmp/forge-baseline/install.cjs && exec node server.js']
    current = json.loads(run(['get','deploy','logan-forge','-o','json']))
    (args.receipt_dir/('deployment-before-' + current['metadata']['resourceVersion'] + '.json')).write_text(json.dumps(current))
    service = json.loads(run(['get','service','logan-forge','-o','json']))
    ports = service['spec'].get('ports', [])
    if len(ports) != 1 or ports[0].get('targetPort') not in (3000, 'http'):
        raise RuntimeError('Reconcile the Service target with the image server port before deployment')
    spec = current['spec']['template']['spec']
    if len(spec['containers']) != 1 or spec['containers'][0]['name'] != 'frontend':
        raise RuntimeError('Unexpected Forge container ownership')
    if spec['containers'][0].get('command') not in (None, owned_command):
        raise RuntimeError('Existing process wrapper requires explicit integration')
    for cm in cms:
        run(['apply','--server-side','--field-manager=forge-baseline','-f','-'],cm)
    volume = {'name':'forge-baseline','projected':{'sources':[{'configMap':{'name':c['metadata']['name']}} for c in cms]}}
    mount = {'name':'forge-baseline','mountPath':'/tmp/forge-baseline','readOnly':True}
    icon_mount = {'name':'forge-baseline','mountPath':'/app/public/favicon.ico','subPath':'favicon.ico','readOnly':True}
    command = ['sh','-c','node /tmp/forge-baseline/install.cjs && exec node server.js']
    canary_spec = copy.deepcopy(spec)
    canary_spec['volumes'] = [v for v in canary_spec.get('volumes',[]) if v['name'] != 'forge-baseline'] + [volume]
    canary_spec['containers'][0]['volumeMounts'] = [m for m in canary_spec['containers'][0].get('volumeMounts',[]) if m['name'] != 'forge-baseline'] + [mount, icon_mount]
    canary_spec['containers'][0]['command'] = command
    canary_spec['restartPolicy'] = 'Never'
    canary_name = prefix+'-canary'
    canary = {'apiVersion':'v1','kind':'Pod','metadata':{'name':canary_name,'namespace':'logan-forge','labels':{'app':'forge-baseline-canary'}},'spec':canary_spec}
    run(['create','-f','-'], canary)
    run(['wait','--for=condition=Ready','pod/'+canary_name,'--timeout=120s'])
    probe = '''(async()=>{for(const path of ['/api/health','/api/forge/artifacts','/api/forge/baseline','/api/forge/hunts','/baseline','/forge','/favicon.ico']) {const r=await fetch('http://127.0.0.1:3000'+path); if(r.status!==200) throw Error(path+' '+r.status); if(path==='/api/forge/baseline'){const d=await r.json();if(d.rules.length!==200 || d.stats.unique_rule_queries!==5)throw Error('Catalog contract failed');} console.log(path+' 200');}})().catch(e=>{console.error(e.message);process.exit(1)})'''
    print(run(['exec',canary_name,'--','node','-e',probe]).decode(),flush=True)
    # Re-read immediately before the live JSON patch and preserve peer mounts.
    current = json.loads(run(['get','deploy','logan-forge','-o','json']))
    spec = current['spec']['template']['spec']; container = spec['containers'][0]
    if container.get('command') not in (None, owned_command):
        raise RuntimeError('Process wrapper changed during canary validation')
    patch = [{'op':'test','path':'/metadata/resourceVersion','value':current['metadata']['resourceVersion']}]
    if 'volumes' not in spec:
        patch.append({'op':'add','path':'/spec/template/spec/volumes','value':[]})
    if 'volumeMounts' not in container:
        patch.append({'op':'add','path':'/spec/template/spec/containers/0/volumeMounts','value':[]})
    own_index = next((i for i,v in enumerate(spec.get('volumes',[])) if v['name'] == 'forge-baseline'), None)
    patch.append({'op':'replace' if own_index is not None else 'add','path':f'/spec/template/spec/volumes/{own_index}' if own_index is not None else '/spec/template/spec/volumes/-','value':volume})
    if not any(m['name']=='forge-baseline' for m in container.get('volumeMounts',[])):
        patch.append({'op':'add','path':'/spec/template/spec/containers/0/volumeMounts/-','value':mount})
    if not any(m.get('mountPath') == icon_mount['mountPath'] for m in container.get('volumeMounts',[])):
        patch.append({'op':'add','path':'/spec/template/spec/containers/0/volumeMounts/-','value':icon_mount})
    patch.append({'op':'add','path':'/spec/template/spec/containers/0/command','value':command})
    run(['patch','deploy','logan-forge','--type=json','--patch-file=/dev/stdin'],patch)
    (args.receipt_dir/'applied.json').write_text(json.dumps({'sha256':digest,'configmaps':[c['metadata']['name'] for c in cms],'canary':canary_name}))
    run(['delete','pod',canary_name,'--wait=false'])
    print('Canary passed; owned overlay applied. Verify rollout and browser separately.')


if __name__ == '__main__':
    main()
