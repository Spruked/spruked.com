# Orb Motion Snapshot - 2026-03-27

Source file snapshot:
- components/ui/GlobalOrb.motion.snapshot.2026-03-27.tsx

Purpose:
- Preserve the exact smooth motion behavior before accessibility/control changes.
- If movement ever regresses, restore from the snapshot file above.

Current motion constants and mechanics (do not alter unless intentional):
- Spring attraction:
  - ax = dx * 0.012
  - ay = dy * 0.012
- Damping:
  - velocity = (velocity + acceleration) * 0.88
- Active wobble drift:
  - driftX = sin(time * 1.5) * 0.25
  - driftY = cos(time * 1.2) * 0.25
- Idle drift:
  - driftX = sin(time) * 0.6
  - driftY = cos(time * 0.8) * 0.6
- Idle timeout:
  - 2500ms
- Render transform:
  - translate3d(currentPos.x, currentPos.y, 0)

Snapshot policy:
- Accessibility updates can add alternate open/voice controls.
- Movement/physics block should remain unchanged unless explicitly requested.

Related operational docs:
- `doc/admin-crm.md` for ORB admin routing and CRM assistant behavior.
