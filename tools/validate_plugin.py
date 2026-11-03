#!/usr/bin/env python3
"""Consistency checks for the tester-squad plugin.

- plugin.json / marketplace.json are valid and agree on name and version
- every agent has frontmatter with name (matching the file name), description and a known model
- every command has a description; every skill has name (matching its folder) and description
- every `tester-squad:<x>` reference in agents/commands/skills points to an existing agent or command
- every agent ends with the shared squad protocol (Handoff block)
Exit code 1 on any problem.
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
errors = []


def frontmatter(path):
    text = path.read_text(encoding="utf-8")
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    if not m:
        errors.append(f"{path.relative_to(ROOT)}: missing frontmatter")
        return {}, text
    data = {}
    for line in m.group(1).splitlines():
        if ":" in line and not line.startswith(" "):
            k, _, v = line.partition(":")
            data[k.strip()] = v.strip()
    return data, text


plugin = json.loads((ROOT / ".claude-plugin/plugin.json").read_text())
market = json.loads((ROOT / ".claude-plugin/marketplace.json").read_text())
name = plugin["name"]
entry = next((p for p in market["plugins"] if p["name"] == name), None)
if not entry:
    errors.append("marketplace.json does not list the plugin")
elif entry.get("version") != plugin.get("version"):
    errors.append(f"version mismatch: plugin.json {plugin.get('version')} vs marketplace.json {entry.get('version')}")

agents = {p.stem: p for p in sorted((ROOT / "agents").glob("*.md"))}
commands = {p.stem: p for p in sorted((ROOT / "commands").glob("*.md"))}
skills = {p.parent.name: p for p in sorted((ROOT / "skills").glob("*/SKILL.md"))}

for stem, path in agents.items():
    fm, text = frontmatter(path)
    if fm.get("name") != stem:
        errors.append(f"agents/{stem}.md: name {fm.get('name')!r} != file name")
    if len(fm.get("description", "")) < 40:
        errors.append(f"agents/{stem}.md: description missing or too short")
    if fm.get("model") not in {"inherit", "sonnet", "opus", "haiku"}:
        errors.append(f"agents/{stem}.md: unexpected model {fm.get('model')!r}")
    if "### Handoff" not in text or "## Squad protocol" not in text:
        errors.append(f"agents/{stem}.md: missing squad protocol / Handoff block")

for stem, path in commands.items():
    fm, _ = frontmatter(path)
    if not fm.get("description"):
        errors.append(f"commands/{stem}.md: missing description")

for folder, path in skills.items():
    fm, _ = frontmatter(path)
    if fm.get("name") != folder:
        errors.append(f"skills/{folder}/SKILL.md: name {fm.get('name')!r} != folder")
    if len(fm.get("description", "")) < 40:
        errors.append(f"skills/{folder}/SKILL.md: description missing or too short")

ref = re.compile(rf"(?<![\w-]){re.escape(name)}:([a-z0-9-]+)")
files = list(agents.values()) + list(commands.values()) + list(skills.values()) + [ROOT / "README.md"]
for path in files:
    for m in ref.finditer(path.read_text(encoding="utf-8")):
        target = m.group(1)
        if target not in agents and target not in commands:
            errors.append(f"{path.relative_to(ROOT)}: unknown reference {name}:{target}")

print(f"{len(agents)} agents, {len(commands)} commands, {len(skills)} skills")
if errors:
    print("\n".join(f"ERROR: {e}" for e in errors))
    sys.exit(1)
print("OK")
