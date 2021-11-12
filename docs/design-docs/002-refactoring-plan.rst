002 Plan for refactoring
========================

================= ==========
**Creation date** 2021-11-02
**Last updated**  2021-11-12
================= ==========

Strategy
--------

- Fix abstraction boundaries as they currently are

  - UI <-> global blob <-> model
  - Build shims between the (blob+model) and (UI+blob) respectively to allow islands of well-factored code

- Do all the work on ``v2``, merge to main regularly

Plan for the UI
---------------

- Declare the dev pseudo-branch radioactive

  - Fold all existing work in there but know that it’s not a good replacement for the current setup

- Can bring stuff in from it and decontaminate it but need to check it’s OK first
- Implement a light Elm architecture style system with internal state for each view - design each view as standalone with a defined interface to change the global blob

- Test strategy:

  - Write integration tests with playwright before porting a view to React
  - Make the same test succeed against the new view
  - Unit tests for components, and for the state update/message handling bits

Plan for the model
------------------

- Create a new model calculator with an in shim and an out shim, giving us a nicely-factored island with the cruft pushed to the shims
- Test strategy:

  - Use existing live data, with a reference model to test against, but don’t expose to CI
  - Write unit tests as we go on the nicely-factored island
