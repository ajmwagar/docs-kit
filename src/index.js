//! Reusable Mintlify-style static documentation app.
//!
//! `docs-kit` is intentionally a runtime, not a docs framework. The consumer
//! supplies `docs.json` plus Markdown and the Vite plugin supplies the bundle.
export { mountDocs } from "./runtime.js";
import "./style.css";
