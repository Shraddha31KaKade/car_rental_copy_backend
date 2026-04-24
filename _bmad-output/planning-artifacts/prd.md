---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-02b-vision
  - step-02c-executive-summary
inputDocuments: []
workflowType: 'prd'
---

# Product Requirements Document - car-rental-backend

**Author:** Shraddha
**Date:** 2026-04-23

## Executive Summary

The Car Rental AI Concierge is a premium, multi-role hybrid chatbot designed to handle seamless text and voice interactions for Renters, Owners, and Admins. By refactoring the existing fragmented AI services into a singular AI Orchestrator, the system achieves strict intent and entity extraction (via Gemini 1.5 Flash) while enforcing hardcoded role-based security middleware. To ensure accurate, hallucination-free recommendations, the orchestrator implements lightweight Context Injection (RAG), querying the Prisma database in real-time to provide factual availability and booking statuses directly within the conversational flow.

### What Makes This Special

This product uniquely delivers a high-end, multimodal user experience using a 100% free-tier architectural stack. By leveraging the browser-native Web Speech API for zero-latency Speech-to-Text and Text-to-Speech, users can interact hands-free—e.g., asking for an SUV under $100 while walking—and receive spoken, accurate responses. The strict separation of hardcoded security middleware and LLM natural language generation ensures the bot remains conversational without ever compromising administrative data or breaking API security.

## Project Classification

- **Project Type:** Web Application / AI Backend Service
- **Domain:** Mobility / Car Rental
- **Complexity:** High (Multi-role Access Control + LLM Orchestration)
- **Project Context:** Brownfield (Architectural overhaul of existing hybrid chatbot)
