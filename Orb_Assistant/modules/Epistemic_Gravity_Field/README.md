# Epistemic Gravity Field

This ORB Assistant module owns the bounded 32³ tensor used for epistemic-density calculations.

`SpaceFieldCognition` provides the interface expected by the cognition controller:

- `broadcast_to_field(signal)` injects a four-channel tensor.
- `step()` applies deterministic decay and local diffusion.
- `get_field_stats()` reports density and intensity without controlling movement or rendering.

The module deliberately contains no cursor, movement, HLSF rendering, or behavior policy.
