import { NextResponse } from "next/server"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { spawnSync } from "node:child_process"

function resolvePythonCommand() {
  const cwd = process.cwd()
  const venvPython = join(cwd, ".venv", "Scripts", "python.exe")
  if (existsSync(venvPython)) return venvPython
  return "python"
}

export async function GET() {
  const cwd = process.cwd()
  const python = resolvePythonCommand()

  const script = `
import sqlite3, json, os

db_paths = [
    ('root', os.path.join(${JSON.stringify(cwd)}, 'yako.db')),
    ('backend', os.path.join(${JSON.stringify(cwd)}, 'backend', 'yako.db')),
]

users = []
seen = set()

for source, path in db_paths:
    if not os.path.exists(path):
        continue
    try:
        conn = sqlite3.connect(path)
        cur = conn.cursor()
        cur.execute('SELECT id, nome, email, is_pro, cidade, modalidade, academia FROM users ORDER BY nome COLLATE NOCASE ASC')
        rows = cur.fetchall()
        conn.close()
    except Exception:
        continue

    for r in rows:
        user_id, nome, email, is_pro, cidade, modalidade, academia = r
        email_key = (email or '').strip().lower()
        dedupe_key = email_key if email_key else f"{source}:{user_id}:{(nome or '').strip().lower()}"
        if dedupe_key in seen:
            continue
        seen.add(dedupe_key)
        users.append({
            'id': user_id,
            'unique_key': f"{source}-{user_id}",
            'nome': nome or '',
            'email': email or '',
            'is_pro': bool(is_pro),
            'cidade': cidade or '',
            'modalidade': (modalidade or '').lower(),
            'academia': academia or 'Sem academia',
        })

print(json.dumps({'users': users}, ensure_ascii=False))
`.trim()

  const result = spawnSync(python, ["-c", script], {
    cwd,
    encoding: "utf8",
    timeout: 5000,
  })

  if (result.error || result.status !== 0) {
    return NextResponse.json(
      {
        users: [],
        error: "Falha ao carregar usuarios do ranking",
        details: result.error?.message || result.stderr,
      },
      { status: 500 }
    )
  }

  const output = result.stdout?.trim() || "{}"
  try {
    const parsed = JSON.parse(output)
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ users: [] })
  }
}
