---
title: Simple Bipolar Supply
summary: One or two sentences for the card and the page intro.
status: ongoing             # planned | ongoing | complete ("across the line")
featured: true              # optional: one of the three on the home page
tools: [KiCad, LTspice]     # optional: chips on the card
image: images/board.jpg     # optional: card photo, path in this repo
# thumb: wave.svg           # or one of the site's illustrations instead

specs:                      # optional: table on the project page
  Input: 12 V AC
  Output: ±15 V, 500 mA

gallery:                    # optional; paths in this repo. Images in updates
  - src: images/board.jpg     # are added to the gallery automatically.
    caption: Assembled board
    description: Rev A, first power-up. # optional: shown in the gallery viewer
---

The overview goes here in Markdown. Everything above "# Updates" becomes the
Overview section.

# Updates

## Boards arrived

Each `##` heading under "# Updates" starts a new box on the timeline. With no
date in the heading, the box is dated with the date and time of the commit
that added the heading. Order doesn't matter; the site sorts them newest first.

![Bare board](images/board.jpg)

Images and links can use paths relative to this repo.

## 2026-10-12 — Schematic done

A date in the heading (`## 2026-10-12 — Title` or `## 2026-10-12 14:30 — Title`)
is used instead of the commit date. Text, lists, code and images all work.
