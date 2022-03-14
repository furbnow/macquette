============================
Validating user-entered data
============================

================= ================
**Number**        6
**Status**        Draft
**Creation date** 2021-04-07
**Last updated**  2021-04-07
================= ================

There are a few different kinds of validation:

 1. Sanity checking
 2. Rejecting inputs that the model will be unable to compute -- ideally this could be done at the type level through e.g. discriminated unions, but some enforcements have to be in code (e.g. numbers in a certain range, or non-negative numbers)
 3. Rejecting inputs that don't make sense for the view (I can't think of any right now, but hypothetically if somebody put 2.5 in the number of floors override and we wanted to show a table row for each floor or something)

Sanity checking could be its own 'checker' module or something.  Marianne noted that ideally this just provides warnings rather than making things impossible – because people do sometimes know better than the computer.

Validation shouldn't be done in React components except to the extent that it gets a TS type into the right field.

The model should have some way of flagging up nonsensical inputs to the frontend, which then needs to display them well.

As an example of each kind of validation:

* If someone enters 'hello' as the angle of the solar panel, that's a React-level error.
* If someone enters '360' as the angle of the solar panel, that's a model-level error.
* If someone specifies no hot water storage but does specify a heat pump, that's a checker-level error.
