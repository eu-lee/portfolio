---
order: 
title: EuGPT
date: 2026-02
featured: false
cover: https://www.youtube.com/watch?v=OPZbVnz5de8
summary: A ~36M parameter language model.
links:
  - label: Live Site
    href: "https://eugpt.chat"
  - label: Github
    href: "https://github.com/eu-lee/slm"
technologies:
  - PyTorch
  - Python
  - FastAPI
  - Next.js
  - Docker
  - PostgreSQL
---

EuGPT is a ~36M parameter GPT-style small language model I built and trained from scratch, then deployed as a full ChatGPT-style web app. The model is a 6-layer transformer with 8 attention heads, a 512 embedding dimension, and a custom 16,387-token BPE tokenizer, trained on the TinyChat dataset.

Behind the chat UI is a FastAPI backend running CPU PyTorch inference with SSE streaming, JWT auth, and PostgreSQL, all containerized with Docker Compose on EC2 behind Caddy for auto-HTTPS, with a Next.js frontend on Vercel and GitHub Actions handling CI/CD.
  