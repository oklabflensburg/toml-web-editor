import * as TOML from "@iarna/toml";
import CodeMirror from "codemirror";
import "codemirror/mode/toml/toml.js";
import "codemirror/addon/edit/matchbrackets.js";
import "codemirror/addon/selection/active-line.js";

const editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
  mode: "toml",
  lineNumbers: true,
  theme: "material",
  styleActiveLine: true,
  matchBrackets: true,
  tabSize: 2,
});

const status = document.getElementById("status");
const preview = document.getElementById("preview");
const errors = document.getElementById("errors");

function setStatus(msg, isError) {
  status.textContent = msg;
  status.className = isError
    ? "text-sm text-red-600 ml-auto"
    : "text-sm text-gray-500 ml-auto";
}

function validateAndPreview() {
  const txt = editor.getValue();
  try {
    const obj = TOML.parse(txt);
    preview.textContent = JSON.stringify(obj, null, 2);
    errors.textContent = "(no errors)";
    setStatus("Valid TOML", false);
    return { ok: true, obj };
  } catch (e) {
    errors.textContent = e.message || String(e);
    preview.textContent = "";
    setStatus("Syntax error", true);
    return { ok: false, error: e };
  }
}

editor.on("change", () => {
  clearTimeout(window.__timer__);
  window.__timer__ = setTimeout(validateAndPreview, 400);
});

document.getElementById("btn-validate").addEventListener("click", () => {
  const r = validateAndPreview();
  if (!r.ok) editor.focus();
});

document.getElementById("btn-format").addEventListener("click", () => {
  const r = validateAndPreview();
  if (!r.ok) return;
  try {
    const tomlText = TOML.stringify(r.obj);
    editor.setValue(tomlText);
    setStatus("Formatted", false);
  } catch (e) {
    setStatus("Formatting failed", true);
    errors.textContent = e.message || String(e);
  }
});

document.getElementById("btn-upload").addEventListener("click", async () => {
  const tomlContent = editor.getValue();
  try {
    const formData = new FormData();
    formData.append("toml", tomlContent);

    const response = await fetch("https://api.renderer.oklabflensburg.de/toml/upload", {
      method: "POST",
      body: formData,
    });

    const contentType = response.headers.get("content-type");

    if (!response.ok) {
      let errorMsg = `Server error: ${response.status}`;
      if (contentType && contentType.includes("application/json")) {
        const errJson = await response.json();
        errorMsg = errJson.message || JSON.stringify(errJson);
      }
      throw new Error(errorMsg);
    }

    if (contentType && contentType.includes("image/png")) {
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setStatus("Upload successful → PNG opened", false);
    } else {
      console.warn("Unexpected response type:", contentType);
      const text = await response.text();
      console.log("Response body:", text);
    }
  } catch (err) {
    console.error("Upload failed:", err);
    setStatus("Upload failed", true);
    errors.textContent = err.message;
  }
});

document.getElementById("btn-copy-json").addEventListener("click", () => {
  const r = validateAndPreview();
  if (!r.ok) return;
  navigator.clipboard
    .writeText(JSON.stringify(r.obj, null, 2))
    .then(() => setStatus("JSON copied to clipboard", false))
    .catch(() => setStatus("Copy failed", true));
});

let dark = true;
document.getElementById("btn-toggle-theme").addEventListener("click", () => {
  dark = !dark;
  editor.setOption("theme", dark ? "material" : "default");
});

validateAndPreview();