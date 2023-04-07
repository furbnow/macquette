Style guide
===========

SAFETY comments
---------------

SAFETY comments should be reserved for comments that justify why the code is really type safe even if the checker thinks it's not. If a block of code isn't type safe, don't use a SAFETY comment.

This convention is copied from Rust, where SAFETY is used when you humanly justify that an `unsafe { }` block does actually end up with everything in a memory-safe state.


Unit conventions
----------------

Use Unicode characters when possible instead of HTML elements.

For example, not this:

.. code::

    kgCO<sub>2</sub>/m<sup>2</sup>

do this instead:

.. code::

    kgCO₂/m²


CSS colours
-----------

We are slowly moving to using CSS variables for colours.  All colours should be defined on the root element using the :root selector in project.css and referenced elsewhere.  If you see a colour somewhere else, move it to a CSS variable!


Atomic CSS
----------

The project uses Bootstrap 2 but on top of this we have added our own utility classes.  It's preferred that we use these utility classes over inline style="" attributes where possible.  These are:

* fill-<colour>
* stroke-<colour>
* text-nowrap
* text-right
* text-center
* text-left
* text-normal
* text-bold
* text-italic
* d-i (display: inline)
* d-ib (display: inline-block)
* d-flex (display: flex)
* d-b (display: block)
* align-items-start
* align-items-center
* justify-content-between
* justify-content-around

Margin and padding utils take the form XY-[0|7|15|30].  X is 'm' for margin or 'p' for padding.  Y is 't'op, 'l'eft, 'b'ottom, 'r'ight, 'x' for horizontal, 'y' for vertical, 'a'all.  e.g. mb-15 or mb-0.
