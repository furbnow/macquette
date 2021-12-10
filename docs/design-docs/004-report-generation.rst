Report generation
=================

================= ================
**Number**        4
**Author**        Anna Sidwell
**Status**        Draft
**Creation date** 2021-12-10
**Last updated**  2021-12-10
================= ================

Background
----------

A report in Macquette is an output PDF given to a householder at the end of the surveying process.  It presents data from the tool (a combination of input & calculated data) in a user-accessible way using a report template.

The process looks like so:

* Each organsiation has its own report template, which is on the relevant versioned app's Organisation model.

  - It's an HTML template
  - Each organisation's report template is itself generated from a template that customises the report template template per organisation
  - This uses a custom mini macro system and lives in a separate reports repo
  - There is no UI to edit the template; it's just a field edited using the Django admin site

* When the user tries to generate a report, the report template is fetched from the server by the client
* Some data is extracted from the model output and added to various inputs from the questionnaire page, and this forms the input to the template (see reports.js).  This input is 'simple data' i.e. serializable as JSON
* The report template is processed with this context data using Nunjucks, a Jinja2 clone in the browser.
* Supplementary images are kept in public S3 buckets and are included by URL.  This includes organisation-specific things like logos and assessment-specific things like photographs (e.g. a photograph of the dwelling is included on the front page of the report).
* Graphs are rendered using HTML5 canvas and inserted in after the HTML is generated using DOM manipulation.
* The generated report is then converted to PDF client side using the browser's print function, resulting in shonky output (no page numbers, bad control over layout, lack of rendering of background colours)

.. code-block::

    +------------+                        +------------+
    |   Server   |  <-------------------- |   Client   |
    |            |    asks for template   |            |
    |            |                        |            |
    |            |  --------------------> |            |
    |            |    sends HTML tempate  |            |
    +------------+                        +------------+
                                                \/
                                          creates context
                                                \/
                                          fetches images by URL
                                                \/
                                          renders HTML with Nunjucks
                                                \/
                                          creates graphs


An (incomplete) example of the report context:

.. code:: json

    {
      "front": {
        "image_url": "https://xxxxxxx.s3.amazonaws.com/4fe3dcb8-4349-468c-b3f9-a6sdefe1ac40.JPG",
        "name": "Eric Morecombe",
        "address": "Newline\nSeparated\nAddress",
        "local_authority": "Manchester",
        "survey_date": "15/01/2020",
        "report_date": "15/01/2020",
        "mhep_version": "v2",
        "assessor_name": "Phillip Proudfoot"
      },
      "aims": {
        "future": {
          "occupancy_actual": "",
          "occupancy_planned": "",
          "occupancy_notes": "",
          "lifestyle_change": false,
          "lifestyle_change_notes": "",
          "other_works": true,
          "other_works_notes": "",
          "works_start": "",
          "works_start_notes": ""
        },
        "priorities": [],
        "qual_criteria": "",
      },
      "now": {
        "home_type": "Detached",
        "num_bedrooms": 2,
        "floor_area": 82,
        "construction": {
          "floors": "Suspended timer floors throughout",
          "walls": "Brick with insulation in parts",
          "roof": "Slate roof",
        },
        "structural": {
          "you_said": "None",
          "we_noted": "The roof is falling in"
        },
      },
      "used_fuels": [
        {
          "name": "Standard Tariff",
          "co2factor": 0.136,
          "standingcharge": 0.72,
          "fuelcost": 0.17
        },
      ],
    }


Problems
--------

* Using two different templating languages, one of which is custom, is ridiculous
* PDF generation is shonky
* The charts need redesigning as they make inefficient use of space on the page, often taking up half a side of A4 in a way that makes the associated text look terrible

The key problem here (i.e. the one that affects the downstream user, the householder) is the shonky PDF rendering.  The two templating languages problem will be attacked separately to this design document.

It's worth noting for context that inside CC/PPR we are reworking our report template and want different graphs from the ones we already have.  So it makes sense to attack everything together.

Browsers are not good at generating high quality PDFs.  So, starting there, how can we do something better?  We need to try something on the server side:

* https://github.com/danfickle/openhtmltopdf (Java, free)
* PrinceXML (proprietary, expensive)
* Weasyprint (Python, free)
* wkhtmltopdf (CLI tool, free, barely maintained, uses browser backend)

Weasyprint seems like the best bet.  It's free, maintained, and can be sponsored if we want features.  openhtmltopdf is also a good bet if we want something free but since it's in Java it's a load of extra complications getting it running.

Switching to server-side report generation
------------------------------------------

PDF generation can use significant CPU resources and can take a few seconds.  This quite different to the rest of Macquette's API which is mostly an access control layer between the client and the database.  The temptation here is to spin it off as a separate service to isolate the potentially poor-performing element into its own microservice, but since we haven't seen the performance characteristics of a system that includes Weasyprint it makes sense initially to use it directly from within Django and deal with optimisation later.  Report generation is also not a particularly frequent activity.

.. code-block::

    +------------+                               +------------+
    |   Server   |  <--------------------------  |   Client   |
    |            |    sends context for report   |            |
    +------------+                               |            |
          \/                                     |            |
    fetches images by URL                        |            |
          \/                                     |            |
    renders HTML with Jinja2                     |            |
          \/                                     |            |
    creates graphs                               |            |
          \/                                     |            |
    +------------+                               |            |
    |   Server   |  -------------------------->  |   Client   |
    |            |                PDF            |            |
    +------------+                               +------------+

There is currently a client-side rendering of the report in an iframe which is used as a preview before the PDF is generated.  Moving to server-side generation we would lose that.  If we wanted to retain it, we could send back a PDF as preview and render it using PDFjs.

When rendering on the server side, we'll supplement the context from the client with our own context.  This would include, for example, the front page image, which the server already knows.

The Jinja2 templating language is not quite the same as Nunjucks, but it's close enough.

Graph rendering
---------------

It doesn't make much sense to generate the charts on the client side and then send them to the server as raster images (especially given that the current graphing library isn't very good anyway).  Which means replacing the graph rendering function.

- Our graphs are not complex but do have elements that are a little unusual (regions shaded for comparison purposes, data both sides of the 0 on the axis)
- chart generation has to happen before HTML generation
- generation as inline SVG if possible and weasyprint works with that, otherwise as in-memory PNG given to weasyprint using a custom url fetcher
- how do we specify where the graph goes?

in the context I guess we have:

.. code:: json

    {
        "graphs": {
            "cumulative_co2_emissions": {
                "type": "line",
                "xAxis": { "unit": "year" },
                "yAxis": { "unit": "kgCO2" },
                "buckets": [
                    { "label": "As modelled", "data": [ [0,0], [1, 10], [2, 20] ]},
                    { "label": "Scenario 1", "data": [ [0,0], [1, 5], [2, 10] ]},
                    { "label": "Scenario 2", "data": [ [0,0], [1, 2], [2, 4] ]}
                ]
            }
        },
        "content": {}
    }

And then in the HTML output:

.. code:: django

    {{ graphs.cumulative_co2_emissions }}


Risks
-----

* A custom graphing API seems like a fool's errand.  I've written utilities that create graphs before though - it's a few days of uninterrupted time to get something working nicely.  Note 'uninterrupted'/

* Testing this is going to be a pain in the ass.

* Performance issues coming from spending 3-5 seconds per report request.  Might need to rate limit?


Approach
--------

* Start off by creating an API endpoint to generate a PDF within 'v2'.  Take the context, render it using the existing server-side template, send the result back.  Add a (hidden except to selected users?) button to use this API.  Get into production.

  - Requires adding a bit of extra logic to the UI so that things can be hidden and unhidden depending on user.  Use django-waffle for this?  We'll need this for other stuff in the future so it's worth sorting this out here.

* Add a new field to orgs, 'new_report' or similar, so that we have the currently-in-use template and also the new template to work with server-side rendering.

* Get the client sends over graph data, as shown above.  Probably send over the data for the graphs we want to produce in the new PPR report template rather than the data for the graphs we already have (but this depends which is easier).  Get these graphs rendering server-side.

* (Not strictly related to this) Refine the new templates so they look good rather than passable, then switch over so that report generation only uses the new feature.
