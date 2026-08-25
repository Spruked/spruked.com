# Orb Motion Snapshot - 2026-03-27

Source file snapshot:

Purpose:

Current motion constants and mechanics (do not alter unless intentional):
  - ax = dx * 0.012
  - ay = dy * 0.012
  - velocity = (velocity + acceleration) * 0.88
  - driftX = sin(time * 1.5) * 0.25
  - driftY = cos(time * 1.2) * 0.25
  - driftX = sin(time) * 0.6
  - driftY = cos(time * 0.8) * 0.6
  - 2500ms
  - translate3d(currentPos.x, currentPos.y, 0)

Snapshot policy:

Related operational docs:
[Footer Navigation]
See the site footer (components/layout/Footer.tsx) for canonical navigation links and the current site map.
