#!/usr/bin/env python3
import json
import sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit('usage: parse-mcp-response.py INPUT OUTPUT')

raw = Path(sys.argv[1]).read_text(encoding='utf-8').strip()
if not raw:
    raise SystemExit('empty MCP response')

try:
    payload = json.loads(raw)
except json.JSONDecodeError:
    payload = None
    for line in raw.splitlines():
        line = line.strip()
        if not line.startswith('data:'):
            continue
        candidate = line[5:].strip()
        if not candidate or candidate == '[DONE]':
            continue
        try:
            decoded = json.loads(candidate)
        except json.JSONDecodeError:
            continue
        if isinstance(decoded, dict) and decoded.get('jsonrpc') == '2.0':
            payload = decoded
    if payload is None:
        raise SystemExit(f'could not parse MCP JSON/SSE response:\n{raw[:2000]}')

if not isinstance(payload, dict):
    raise SystemExit('MCP response is not a JSON object')
if 'error' in payload:
    raise SystemExit(f'MCP returned JSON-RPC error: {json.dumps(payload["error"], ensure_ascii=False)}')

Path(sys.argv[2]).write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
