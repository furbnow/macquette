====================
JavaScript framework
====================

Macquette is undergoing a migration from a legacy DIY JS framework to
TypeScript + React. The way this is currently happening is a bottom-up
view-by-view migration, with both legacy and React views synchronising on the
shared state in the legacy global variables and ``update()`` function.

In the current navigation system, a view is a pair of HTML+JS files, with a
legacy view written directly in these files, and a React view consisting of a
shim pair of files which call into transpiled and bundled TSX code.

.. note::

   We plan to refactor the navigation/view orchestration system into the new
   TypeScript + React order at some point as well.


----------------
Global variables
----------------

The following global variables are present and available for use.

-  p: object that holds all the data for the assessment like author,
   name, status and scenarios data
-  project: object that has as properties all the scenarios in the
   assessment. And for each scenario, all its data
-  scenario: string, scenario currently displayed
-  page: current view loaded, if showing a view
-  datasets: available as part of openBEM, datasets from SAP2012 and
   more like monthly average temperature, fuel costs and emissions, etc
-  projectid
-  data: object that holds all the data for the current scenario. Using
   ``data`` is the same than using ``project[scenario]``. You will see
   it everywhere

.. note::

    We plan to phase out the use global variables where possible, so
    don't add to the above list.


-------------------------
The ``update()`` function
-------------------------

*  Runs the model
*  Maintains undo/redo state
*  Tells the view UI to update itself post-run
*  Saves the project input data to the server

It's called after the value of any input is changed, and in various
other places after data inserted into the assessment structure.


-----
Views
-----

Every view or view shim must have at least the 2 following functions:

*  ``[viewname]_initUI()``
*  ``[viewname]_UpdateUI()``
*  ``[viewname]_UnloadUI()``

``initUI`` is called when the view is loaded for the first time, and
``UpdateUI`` is called after user input when the model has run but before
the data is saved back to the server.

``UnloadUI`` is called when the view is unloaded in preparation for loading a
different view.

In many views, ``xxx_initUI`` also calls the ``xxx_UpdateUI`` function.


React Views
===========

React views are built in components called "modules" (after Elm), which
encapsulate the pure React view, an initial state, and a reducer.

The module consists of an object of type ``UiModule<StateT>``, where ``StateT``
is the internal state for the view. Each module's state should be added to the
``ModuleStates`` dictionary. Modules also expose a discriminated union type of
actions, which should be added to the ``ModuleActions`` type.

Interaction with the legacy framework
-------------------------------------

External updates to the ``data`` object, e.g. from the model, come into the
reducers with a special action of type ``ExternalDataUpdate``. This contains a
somewhat-validated form of the ``data`` object, which the reducer must
interpret and change the module state accordingly.

Modules expose a ``dataMutator`` function, which mutates the global ``data``
object based on the view state.

Calling ``update()`` is handled by the module management system and happens
after every internal state change.

View mounting, unmounting, and state reducing is handled by functions in files
in the ``module-management`` directory.

Shims
-----

The legacy view's ``initUI`` function should call the module management
``mount`` function, which takes the name of a module to mount and an element to
mount it at. It sets up plumbing to bridge the new and old frameworks, and
returns an object with hooks for ``update`` and ``unload``, which should be
called in the ``UpdateUI`` and ``UnloadUI`` functions respectively.


Legacy Views
============

The legacy framework uses the JS+HTML pair of files directly, and maps text
inputs to model inputs and vice versa using the nonstandard ``key`` HTML
attribute.


The ``key`` HTML attribute
--------------------------

The ``key`` attribute provides a way to map the contents of
HTML form controls to nested data in the model.  When a view is first
loaded, the value/contents of form controls  will be loaded from the
specified place, and when the value is changed, it will save it back
to the model and trigger and ``update()`` (see above).

For example, given the following HTML:

.. code:: html

    <input type="text" key="data.fabric.element.1.uvalue">

On page load, this equivalent JS is run:

.. code-block:: javascript

   if (data.fabric.element[1].uvalue) {
      input.value = data.fabric.element[1].uvalue;
   }
   input.addEventListener("change", (event) => {
      let val = isNaN(input.value) ? input.value : parseInt(input.value, 10);
      data.fabric.element[1].uvalue = val;
      update();
   });

(``data`` in this case means the current scenario -- see above for info
on global variables).


The ``dp`` HTML attribute
-------------------------

This attribute limits the output of a field that has ``key`` set to the
specified number of decimal places.


------------------
JS + HTML file map
------------------

Each version of Macquette has its own Django app, which is a directory inside
``mhep/``. There are three versions, ``v1``, ``v2``, and ``dev``, of which only
``v2`` is considered "live". This version structure is a historical artifact
and is deprecated in favour of a rolling-release incremental system. Most work
should only happen on ``v2``.

The ``client/`` top-level directory contains all non-legacy client-side
TypeScript and dependencies, which is transpiled and bundled by ``esbuild`` and
the resulting bundle and sourcemaps are placed in ``<django
app>/static/js_generated``. Different exports files are bundled for the
different Django apps which make up the versions of Macquette.

In the `client/` directory:

.. code::

  scripts/              # Various helpful dev scripts
  src/                  # All client-side JS
    dev/                # Code from the abandoned "dev" version
    v2/                 # Code for the rolling-release "v2" version
    exports-dev.tsx     # Entry point for "dev"
    exports-v2.tsx      # Entry point for "v2"
  test/                 # Tests
    dev/                #   for "dev"
    v2/                 #   for "v2"
    helpers/            # Helper functions used in tests

In the Django app:

.. code::

  templates/VERSION/
    js/                # Various JS that needs config loaded
    view.html          # Assessment view
    assessments.html   # List of assessments view
    mhep_base.html     # Base template

  static/VERSION/
    css/               # CSS for Bootstrap 2 and Macuqette-specific stuff
    img/               # Low-res icons we want to replace with SVG

    js_generated/      # Transpiled and bundled JS from the client/ directory
    js/
      vendor/           # Contains vendored (imported) JS libraries
      api.js            # API communication module
      extended-library-items.js   # A single "extended library item"; a hack
      graphics.js       # Draws the house and some bar graphs
      library-helper.js # UI functions related to using or editing libraries
      misc.js           # Some of the JS framework; other bits in templates/VERSION/view.html

    subviews/           # Pairs of files containing HTML + JS for each view
      [name].{js,html}
      [name].{js,html}
      _[name].html      # Partials that are reused in other views are prefixed with _


For info on why the HTML + JS is split between the static and templates
folders, see :ref:`design--static-files`.
