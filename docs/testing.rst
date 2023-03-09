Testing strategy
================

This document outlines the strategies we're using or want to use for testing the different parts of the app. It's a semi-aspirational document at the time of writing (Mar 2023).

Server-side
-----------

The server tests generally (but not exclusively) test at the level of HTTP requests. They often set up test data beforehand using the Django ORM, but a request is simulated the response JSON is tested.

The Django-based server has high test coverage. When changes are made this should be maintained. All new modules on the server should have a high level of test coverage and fixed bugs should always come with a testcase.


Client-side model testing
-------------------------

We care a lot about model testing "the model" (our implementation of modified SAP). We do our best to ensure that the output for any given input will not change over time.

Currently we enforce this using fast-check tests and a reference model to test against, plus some offline tests which are run against production data from PPR's running instance of Macquette. However, we want to move away from a system which relies on a reference model or pulling down customer data.

We want to move towards:

* Module by module testing for TypeScript code using fixed data - using the class interface in the TypeScript code rather than via the legacy interface

* Property based testing of the shims/translation layer between model & data format – they are messy and sometimes have typechecking partially turned off so they need some testing

* Some (not many) tests of the combination of shims+model

  * These are tests of the TS-side model, accessible through CombinedModules – not the legacy model

  * Write scenario struct, run through combined modules instantiation (with top-level extractor), run top-level mutator, make expectations on mutated struct

* Storing git id & a few key metrics in the scenario - for drift testing on page load, log to Sentry/warn users


Client-side interface testing
-----------------------------

We use a combination of manual testing and automated testing for the client side. We think there's limited value in writing tests that would exercise the UI thoroughly, whether testing at the DOM level, the React level or using e.g. Playwright.

The automated testing we do is around the reducer logic for the views; the idea is that we write our views in a way that keeps the logic in the reducers - and since they should be pure, they're very testable.

We also make good use of feedback from users in production.

.. image:: testing.jpg
  :width: 400
  :alt: I don't always test my code - but when I do, I do it in production.


Smoke testing
-------------

We currently have a simple smoke test which runs against built containers, which checks that the server comes up, talks to the database, and can create an assessment. This just uses the HTTP API and is a sanity test to make sure that we're not shipping something that is extremely obviously broken.

We want to expand our smoke testing to a select portion of the UI: for example, checking that we can navigate to every page in the application using a headless browser. We will use Playwright for this.

We don't want to invest heavily in tests here - we're going for tests of obviously broken stuff rather than trying to do something exhaustive.
