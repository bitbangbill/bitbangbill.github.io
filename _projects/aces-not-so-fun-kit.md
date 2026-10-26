---
title: ACES Not So Fun Kit
date: 2026-07-04
summary: A USB-C drop-in replacement for the UCFK4 teaching board, with a custom on-board LED matrix, IR link and nav switch.
status: ongoing
featured: true
thumb: bits.svg
tools: [KiCad, AVR C, USB-C]

specs:
  Microcontroller: ATmega32U2
  Programming: USB-C (DFU)
  Display: Custom LED matrix
  Comms: IR transmit and receive (TSOP6136)
  Input: Nav switch, buttons
  Compatibility: Drop-in UCFK4 replacement

updates:
  - date: 2026-07-04
    title: Prototype bring-up
    text: |-
      Working on the first prototype: programming over USB-C using DFU, user LED control, IR transmit and receive, and the LED matrix and nav switch.

      Still to fix: the matrix columns are inverted, the nav switch is rotated 180°, and several traces were left unconnected (HWB, UGND and the CC resistors). Next up is finishing the ratsnest, tying every ground pour to USB ground, and a round of footprint and part changes.
---

The ACES Not So Fun Kit (ANSFK) is a drop-in replacement for the UCFK4, the University of Canterbury's ATmega32U2 teaching board, inspired by Thomas Hobson's NSFK. It adds USB-C and a custom on-board LED matrix, and runs the existing UCFK4 apps, built with avr-gcc and flashed over USB with `make program`.

Built for the Association of Computer Engineers (ACES), with thanks to the 2026 ACES executive, the University of Canterbury ECE Department, Phillip Hof (UCFK4 design) and Thomas Hobson (NSFK design).
