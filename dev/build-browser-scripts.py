#!/usr/bin/env python3
"""Generate scripts for terminal-browser from theme.css and theme.js.

Writes two scripts into dev/generated/: preview.js applies the theme temporarily
to the current page; save-account-theme.js saves it to the signed-in NewsBlur
account. Both generated scripts run in the NewsBlur page context.
"""

import json
from pathlib import Path


def main():
    root = Path(__file__).resolve().parent.parent
    output = root / "dev" / "generated"
    output.mkdir(parents=True, exist_ok=True)
    css = json.dumps((root / "theme.css").read_text())
    js_source = (root / "theme.js").read_text()
    js = json.dumps(js_source)

    preview = (
        'if (!document.getElementById("NB-custom-css")) '
        'throw new Error("Open a signed-in NewsBlur reader tab first");\n'
        f'document.getElementById("NB-custom-css").textContent = {css};\n'
        + js_source
        + '\n({theme: "Metro Theme", version: window.__newsblurMetroTheme.version});\n'
    )
    save = f"""(() => {{
  const css = {css};
  const js = {js};
  if (!NEWSBLUR.Globals.is_authenticated || !NEWSBLUR.Globals.email) {{
    throw new Error("Open a signed-in NewsBlur reader tab first");
  }}
  return new Promise((resolve, reject) => {{
    NEWSBLUR.assets.save_account_settings({{
      email: NEWSBLUR.Globals.email, custom_css: css, custom_js: js
    }}, result => {{
      if (result.code !== 1) return reject(new Error(result.message || "Save failed"));
      resolve({{saved: true, theme: "Metro Theme"}});
    }});
  }});
}})()
"""
    for name, content in [("preview.js", preview), ("save-account-theme.js", save)]:
        path = output / name
        path.write_text(content)
        print(f"Generated {path.relative_to(root)}")


if __name__ == "__main__":
    main()
