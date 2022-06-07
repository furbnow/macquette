Reports
=======

How they work
-------------

Report templates are stored in the database as a text field on an
Organisation. It's a jinja2 template, rendered server-side to either
HTML or PDF (using Weasyprint). The server doesn't understand the
data itself; it trusts the client to send a big context object with
all the relevant info for rendering (including the data that is used
to generate the graphs, which uses matplotlib).


Liability issues
----------------

The reason reports are done this way is to avoid liabilty for people's
(mis-)use of the tool.  If a random member of the public used Macquette
to produce their own report that uses Carbon Co-op/URBED text and
surrounding info about assessment methodology, then Carbon Co-op/URBED
are potentially liable if that info is incorrect.
