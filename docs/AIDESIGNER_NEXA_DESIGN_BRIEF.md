# NEXA — AIDesigner Design Handoff

## Purpose
Use this brief when connecting the current cumulative NEXA repository to AIDesigner. The goal is to improve visual fidelity without replacing the working application architecture.

## Source of truth
- Current cumulative release: **V5.32.0 / B69**.
- Continue forward from the repository. Do not generate a replacement app.
- Preserve existing navigation, authentication, ownership, server authorization, ticket/payment authorities, Dami identity, Yaayz boundaries, and existing functionality.

## Typography contract
- Primary family: bundled **NEXA Inter** (Inter-derived, six weights).
- Body text baseline: **16px / 23px**.
- Caption: **13px / 18px** minimum role.
- Label: **14px / 19px**.
- Section: **18px / 24px**.
- Heading: **23px / 29px**.
- Title: **28px / 34px**.
- Do not introduce decorative condensed fonts for normal UI copy.
- Do not use tiny text to fit a layout. Reflow, wrap, scroll, or simplify instead.
- Respect the in-app text-size preference and the device accessibility font scale.

## Responsive contract
- Design for the actual device width first, not a fixed desktop canvas.
- Preserve the device-width viewport contract.
- Avoid fixed-width screens and horizontal overflow.
- Use adaptive gutters and content widths.
- Touch targets remain at least 44px; 48px is preferred.
- Do not disable browser/device zoom.

## Visual direction
NEXA should feel like a premium, contemporary mobile product rather than a generic template:
- real environmental/background imagery where the existing scene system calls for it;
- cinematic depth, controlled glass/material surfaces, subtle 3D depth and purposeful animation;
- strong hierarchy and generous readable spacing;
- modern sans-serif typography;
- visual differences between Royal Dark and Earth Light must remain intentional;
- motion must respect the existing reduced-motion controls.

## AIDesigner instruction
Use the highest-fidelity mobile workflow available. Inspect the existing repository context before proposing new UI. Improve individual surfaces in place and produce designs that can be adopted into the current React Native / Expo architecture. Do not invent new navigation systems, backend authorities, fake data, or unsupported product capabilities.

## First visual audit targets
1. Home Command Center
2. Yaayz Home discovery feed
3. Dami / NEXA AI surface
4. Zeeza / Inbox
5. Dream Marketplace
6. Sky Money
7. Notifications
8. Search
9. Profile / Settings
10. Primary navigation

For each target, check: readable type, responsive width, hierarchy, image/background treatment, depth/material quality, animation intent, touch targets, empty/error states, and preservation of existing actions.

## Important AIDesigner workflow note
AIDesigner's documented MCP workflow is repo-aware: the coding assistant connects the AIDesigner MCP server and it analyzes the repository context. Do not assume that uploading the cumulative ZIP to AIDesigner is required. If using the web editor instead, use this brief as the design handoff context and keep the cumulative NEXA source as the implementation source of truth.
