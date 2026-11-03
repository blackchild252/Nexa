# NEXA Home Design V1.2 — Root Canonical

Status: CANONICAL / SEALED DESIGN CONTRACT
Release: 4.92.0 / Batch B27

## Purpose

Version 1.2 makes the approved Home command-center design a root-level architectural contract. Future Home work must extend this contract deliberately rather than reintroducing retired destination tiles or competing navigation surfaces.

## Home composition

1. NEXA header with the top-right collapsible directory button.
2. Thin animated Market Watch horizontal rail.
3. Thin NEXA Updates horizontal rail for missed calls, Inbox activity and notifications.
4. Dami is the single visual centerpiece and primary AI interaction.
5. Zeeza Friends is the lower-left Home control.
6. Calls is the lower-right Home control.
7. All remaining NEXA destinations are accessed from the vertical sidebar directory.

## Explicitly excluded from Home

Sky Money, Dream Marketplace, Yaayz, L.A., Ball House, Kitchen, Game House, Fitness, Notifications, Search, Profile, Extensions and Developer Console are not Home tiles or feature-grid blocks. They remain discoverable through the sidebar.

## Calling rule

Home only exposes the Calls entry point. Audio/video selection happens inside the calling flow, not as a Home interswitch.

## Canonical naming

- Dami = NEXA AI.
- Zeeza = People/Social.
- Inbox = user-facing messaging.

## Motion

The shared NEXA motion architecture remains authoritative. Home uses the `live-update`, `dami`, and `navigation` motion intents. Motion is subject to the existing subscription-tier and reduced-motion rules.

## Theme

Royal Gold Dark remains authoritative: `#000000` / graphite foundations, `#D4AF37` Royal Gold, `#FFD700` Bright Gold, warm ivory typography, restrained luminous accents, premium rounded surfaces and accessible contrast.

## Versioning rule

Any structural Home change must create a new Home Design version entry and update `src/homeDesign.ts`, `assets/design/`, and the three canonical roadmap files together.

## Visual reference

`NEXA_HOME_DESIGN_V1_2_3D_REFERENCE.png` is the approved 3D conceptual reference for this version. It is a visual north star, not a pixel-perfect screenshot of runtime output.
