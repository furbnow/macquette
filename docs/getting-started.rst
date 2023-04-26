Getting started
===============

Macquette uses Django with a PostgreSQL backend on the server side, with
a large client-side JavaScript/TypeScript layer.

The standard development environment is to use Docker Compose to provide
a PostgreSQL database, with a local (non-containerised) Django
development server. Legacy JavaScript, HTML and CSS files are served
directly as static assets by Django, and new client-side code in
TypeScript is bundled by ESBuild and output into the Django static
assets path.

Installing system dependencies
------------------------------

You will need:

-  Docker and Docker Compose <https://docs.docker.com/compose/install/>
-  Python 3.9+ and pip <https://pip.pypa.io/en/stable/installing/>
-  GNU make
-  Node.js (version 16+) and NPM

The best way of installing these tools will vary depending on your system.

Setting up your Python environment
----------------------------------

You will probably want to use some sort of virtual Python environment,
either by using the native ``venv`` module, or ``virtualenv``,
optionally with ``virtualenvwrapper``. RealPython has a `solid article
about Python virtual environments
<https://realpython.com/python-virtual-environments-a-primer/>`_.

Common workflow tasks
---------------------

First run
~~~~~~~~~

.. code:: bash

   pip install pip-tools             # Install pip-tools to manage dependencies
   make sync                         # Install our Python and NPM dependencies
   cp .example.env .env              # Set up env vars for local dev
   make docker-local-up              # Start postgres docker container
   python manage.py migrate          # Migrate the database
   python manage.py createsuperuser  # Create a user account
   make dev                          # Bring up Macquette and watch local files for changes

What is happening here?
"""""""""""""""""""""""

-  Many common tasks are kept in our Makefile so you don't have to
   remember CLI incantations. It's also a self-documenting Makefile -so
   to see what commands are available, just type ``make`` and you will
   see a list of available tasks.
-  Package freezing is done using ``pip-tools`` and ``npm`` for Python
   and NPM packages respectively.
-  In local development, Macquette looks for settings in a ``.env`` file
   in the project root. Without one of these, it doesn't know where to
   find the database.
-  For the first run, we must run the migrations on the database before
   bringing up the development Django server, so we run ``make
   docker-local-up`` first; this is usually a dependency of running
   ``make dev``, so is not necessary after the first run.
-  The Django framework gives us for database migrations. ``manage.py``
   is the standard CLI interface to Django tools, and its migrate
   command runs all migrations that aren't already run (which in this
   case is all of them). The database is ready after this.
-  ``make dev`` starts the local Django server, which watches for
   changes; it also starts ESBuild in watch mode to transpile and bundle
   the client-side TypeScript code.

Subsequent runs
~~~~~~~~~~~~~~~

Make sure that you are working in your Python virtual environment, then
run ``make dev`` to bring up the PostgreSQL container and the local
development server.

Resetting the database
~~~~~~~~~~~~~~~~~~~~~~

Run ``make docker-local-clean``.

Issuing reports
~~~~~~~~~~~~~~~

In order to enable report issuing, you must create an organisation with an
associated report template through the Django admin interface. At present there
is no generic IP-unencumbered report template, so you must copy one from the
production instance.

Once an organisation with an associated report template is created, assessments
made under that organisation will have the "Reports" page enabled.
