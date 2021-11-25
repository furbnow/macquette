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

Current architecture
--------------------

.. graphviz::

    digraph G {
        State [shape=box];

        Frontend -> State
        State -> Frontend

        Model -> State
        State -> Model
    }

Future architecture
-------------------

This is horrendously rendered, but hopefully you get the idea...

\...which is that we still use the global blob to maintain state, we save it to the
server etc, but we develop the code into a series of well-architected and discrete
islands.  Eventually we can dispense of the global blog - we end up with a global
piece of app state which is only written by the UI, and a global results state which
is only written by the model.

We start modelling the app as a series of data transformations: the global app state
is transformed into the input required for the model.  The output from the model is
used directly.  Each individual UI module is responsible for both its own state and
syncing its state out into a global application state.

This suggests one approach to reworking the UI modules is to do them as and when the
calculations that feed into them are refactored in the model, as then they can skip
over reading from the legacy global blob entirely and instead read directly from
results, i.e. have a unidirectional data flow.

.. graphviz::

    digraph G {
        rankdir = LR;

        subgraph cluster_0 {

            subgraph cluster_1 {
                InternalState1 [shape=box];
                style=filled;
                color=lightgrey;
                node [style=filled,color=white];
                init1 -> InternalState1 -> update1 -> InternalState1;
                InternalState1 -> sync1;
                label = "UI module";
            }

            subgraph cluster_2 {
                label = "UI module";
                InternalState2 [shape=box];
                style=filled;
                color=lightgrey;
                node [style=filled,color=white];
                init2 -> InternalState2 -> update2 -> InternalState2;
                InternalState2 -> sync2;
            }
        }

        sync1 -> GlobalState;
        sync2 -> GlobalState;
        GlobalState -> sync1;
        GlobalState -> sync2;

        GlobalState [shape=box];

        GlobalState -> shim_in;
        old_calculator -> GlobalState;

        subgraph cluster_3 {
            label = "Model"
            style=filled;
            color=lightgrey;
            node [style=filled,color=white];
            shim_in -> new_calculator;
            new_calculator -> shim_out;
            shim_out -> old_calculator;

            {rank=same; shim_in; new_calculator; shim_out; old_calculator; }
        }
    }

Stuff to figure out in future
-----------------------------

* How to do undo/redo better
* How to base scenarios on one another
