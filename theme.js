(() => {
  "use strict";
  const version = "0.0.0";
  const key = "__newsblurMetroTheme";
  window[key]?.destroy();
  const root = document.documentElement;
  root.classList.add("nb-metro-theme");
  const palette = document.createElement("style");
  palette.id = "NB-metro-palette";
  // Insert before custom CSS: deliberately authored component styles win.
  const custom = document.getElementById("NB-custom-css");
  if (custom) custom.parentNode.insertBefore(palette, custom);
  else document.head.appendChild(palette);
  const names = { white: "#ffffff", black: "#000000", gray: "#808080", grey: "#808080", silver: "#c0c0c0" };
  function convert(token, property) {
    let hex = names[token.toLowerCase()] || token;
    if (/^rgba?\(/i.test(token)) {
      const parts = token.match(/[\d.]+/g)?.map(Number);
      if (!parts || parts.length < 3) return token;
      hex = "#" + parts.slice(0,3).map(n => Math.round(n).toString(16).padStart(2,"0")).join("");
      if (parts.length === 4) hex += Math.round(parts[3]*255).toString(16).padStart(2,"0");
    }
    if (!hex.startsWith("#")) return token;
    hex = hex.slice(1);
    if (hex.length === 3 || hex.length === 4) hex = [...hex].map(c => c + c).join("");
    if (hex.length !== 6 && hex.length !== 8) return token;
    const r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16);
    const alpha = hex.length === 8 ? parseInt(hex.slice(6,8),16) / 255 : 1;
    if (alpha === 0) return token;
    const high = Math.max(r,g,b), low = Math.min(r,g,b);
    const light = (r*.2126 + g*.7152 + b*.0722) / 255;
    const surface = property.startsWith("background");
    const border = property.startsWith("border") || property === "outline-color";
    let target;
    if (high - low < 45) {
      target = surface ? (light < .15 ? "#1e1e1e" : light < .22 ? "#252526" : light < .30 ? "#2d2d2d" : "#3c3c3c")
        : border ? "#454545" : light > .85 ? "#f0f0f0" : light > .6 ? "#cccccc" : light > .35 ? "#a0a0a0" : "#858585";
    } else if (b > r * 1.15 && b > g * 1.05) {
      target = surface ? "#094771" : "#4fc1ff";
    } else if (g > r * 1.12 && g > b * 1.08) {
      target = surface ? "#264f38" : "#b5cea8";
    } else if (r > g * 1.25 && r > b * 1.2) {
      target = surface ? "#5a1d1d" : "#f48771";
    } else if (r > b * 1.1 && g > b * 1.1) {
      target = surface ? "#4d4520" : "#dcdcaa";
    } else {
      target = surface ? "#37373d" : "#c586c0";
    }
    if (alpha < 1) {
      const bytes = target.slice(1).match(/../g).map(c => parseInt(c,16));
      return `rgba(${bytes.join(",")},${alpha.toFixed(3)})`;
    }
    return target;
  }
  // Avoid recoloring image URLs; only rewrite literal CSS colors.
  function colors(value, property) {
    return value.replace(/url\([^)]*\)|rgba?\([^)]*\)|#[\da-f]{3,8}\b|\b(?:white|black|gray|grey|silver)\b/gi,
      token => token.startsWith("url(") ? token : convert(token, property));
  }
  function rules(list) {
    let result = "";
    for (const rule of list) {
      if (rule.selectorText?.includes(".NB-dark") && rule.style) {
        const declarations = [];
        for (const property of rule.style) {
          if (!/^(color|background(?:-color|-image)?|border(?:-(?:top|right|bottom|left))?-color|outline-color|fill|stroke)$/.test(property)) continue;
          const value = rule.style.getPropertyValue(property);
          const mapped = colors(value, property);
          if (mapped !== value) declarations.push(`${property}:${mapped}!important`);
        }
        if (declarations.length) {
          const selectors = rule.selectorText.split(",").map(s => `:where(html.nb-metro-theme ${s.trim()})`).join(",");
          result += `${selectors}{${declarations.join(";")}}\n`;
        }
      } else if (rule.cssRules) {
        const inner = rules(rule.cssRules);
        if (!inner) continue;
        if (rule.constructor.name === "CSSMediaRule") result += `@media ${rule.conditionText}{${inner}}`;
        else if (rule.constructor.name === "CSSSupportsRule") result += `@supports ${rule.conditionText}{${inner}}`;
        else result += inner;
      }
    }
    return result;
  }
  function refreshPalette() {
    let output = "";
    for (const sheet of document.styleSheets) {
      if (!sheet.href || new URL(sheet.href, location.href).origin !== location.origin) continue;
      try { output += rules(sheet.cssRules); } catch (_) { /* inaccessible third-party sheet */ }
    }
    palette.textContent = output;
  }
  const frameCSS = `:root{color-scheme:dark}html,body{background:#1e1e1e!important;color:#cccccc!important}
    body :is(p,div,span,section,article,li,td,th){background-color:transparent!important;color:#cccccc!important}
    h1,h2,h3,h4,h5,h6,strong,b{color:#f0f0f0!important}a{color:#4fc1ff!important}
    pre,code,kbd{background:#252526!important;color:#d4d4d4!important;font-family:Consolas,monospace!important}
    blockquote{border-left:3px solid #007acc!important;background:#252526!important;padding:8px 16px}
    td,th,hr{border-color:#454545!important}::selection{background:#264f78!important}
    .hljs-keyword,.token.keyword{color:#569cd6!important}.hljs-string,.token.string{color:#ce9178!important}
    .hljs-comment,.token.comment{color:#6a9955!important}.hljs-number,.token.number{color:#b5cea8!important}`;
  const frames = new Set();
  function themeFrame(frame) {
    try {
      const doc = frame.contentDocument;
      if (!doc?.head || doc.getElementById("NB-metro-frame")) return;
      const style = doc.createElement("style");
      style.id = "NB-metro-frame";
      style.textContent = frameCSS;
      doc.head.appendChild(style);
    } catch (_) { /* cross-origin publisher pages remain owned by their publisher */ }
  }
  function findFrames(node) {
    if (node.nodeType !== 1 && node.nodeType !== 9) return;
    const found = node.matches?.("iframe") ? [node] : node.querySelectorAll("iframe");
    for (const frame of found) {
      if (frames.has(frame)) continue;
      frames.add(frame);
      frame.addEventListener("load", onFrameLoad);
      themeFrame(frame);
    }
  }
  function onFrameLoad(event) { themeFrame(event.target); }
  function placeFooter() {
    const sidebar = document.querySelector(".NB-feed-taskbar");
    root.style.setProperty("--metro-footer-left", `${sidebar?.getBoundingClientRect().right || 0}px`);
  }
  const footerResize = new ResizeObserver(placeFooter);
  let timer;
  const observer = new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        findFrames(node);
        if (node.nodeType === 1 && node.matches("link[rel=stylesheet]")) node.addEventListener("load", refreshPalette, {once:true});
      }
      for (const node of record.removedNodes) {
        for (const frame of frames) if (node === frame || node.contains?.(frame)) {
          frame.removeEventListener("load", onFrameLoad); frames.delete(frame);
        }
      }
    }
    if (document.body && !document.body.classList.contains("NB-dark")) {
      clearTimeout(timer);
      timer = setTimeout(() => document.body.classList.add("NB-dark"), 0);
    }
  });
  function start() {
    document.body.classList.add("NB-dark");
    document.body.classList.remove("NB-light");
    refreshPalette();
    findFrames(document);
    placeFooter();
    const sidebar = document.querySelector(".NB-feed-taskbar");
    if (sidebar) footerResize.observe(sidebar);
    window.addEventListener("resize", placeFooter);
    observer.observe(document.documentElement, {childList:true,subtree:true});
    observer.observe(document.body, {attributes:true,attributeFilter:["class"]});
  }
  window[key] = {
    version,
    refresh: refreshPalette,
    destroy() {
      observer.disconnect(); clearTimeout(timer);
      footerResize.disconnect();
      window.removeEventListener("resize", placeFooter);
      root.style.removeProperty("--metro-footer-left");
      document.removeEventListener("DOMContentLoaded", start);
      for (const frame of frames) {
        frame.removeEventListener("load", onFrameLoad);
        try { frame.contentDocument?.getElementById("NB-metro-frame")?.remove(); } catch (_) {}
      }
      palette.remove(); root.classList.remove("nb-metro-theme"); delete window[key];
    }
  };
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, {once:true});
})();
