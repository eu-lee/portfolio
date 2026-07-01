---
order: 3
title: TokenStream
subtitle: Tiny LLM inference engine
board: layers
featured: false
cover: null
summary: A tiny, readable LLM inference engine.
links:
  - label: Source
    href: "#"
---

TokenStream is a compact inference pipeline built to be read. It focuses on the
parts that matter for throughput - token flow, batching, and KV-cache behavior -
without the layers of abstraction that hide them.

The internals are deliberately small and annotated, so you can trace a request
from prompt to generated token and see exactly where time and memory go.
