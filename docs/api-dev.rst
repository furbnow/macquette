dev API endpoints
=================

All endpoints start with ``/dev/api`` e.g.
``http://localhost:9090/dev/api/assessments/``.

List assessments
----------------

::

   GET /assessments/

List all assessments the current user has access to.

ℹ️ porting notes: replaces previous ``assessment/list`` route.

Example
~~~~~~~

::

   GET /assessments/

Returns:

::

   HTTP 200 OK
   Content-Type: application/json
   [
       {
           "id": "1",
           "name": "Example assessment",
           "description": "Example description",
           "status": "In progress",
           "created_at": "2019-08-15T15:25:37.634182Z",
           "updated_at": "2019-08-21T10:40:58.830425Z",
           "user": {
               "id": "1",
               "name": "Local Admin",
               "email": "example@domain.net"
           },
       }
   ]

List assessments for organisation
---------------------------------

::

   GET /organisations/:id/assessments/

List all assessments that belong to an organisation.

ℹ️ porting notes: replaces previous ``assessment/list`` with ``orgid``
param.

.. _example-1:

Example
~~~~~~~

::

   GET /organisations/1/assessments/

Returns:

::

   HTTP 200 OK
   Content-Type: application/json
   [
       {
           "id": "1",
           "name": "Example assessment",
           "description": "Example description",
           "status": "In progress",
           "created_at": "2019-08-15T15:25:37.634182Z",
           "updated_at": "2019-08-21T10:40:58.830425Z",
           "user": {
               "id": "1",
               "name": "Local Admin",
               "email": "example@domain.net"
           },
       }
   ]

Get assessment
--------------

::

   GET /assessments/:id/

ℹ️ porting notes: replaces previous route ``assessment/get``

.. _example-2:

Example
~~~~~~~

::

   > curl http://localhost:9090/v1/api/assessments/1

Returns:

::

   HTTP 200 OK
   Content-Type: application/json

   {
       "id": "1",
       "name": "Example assessment",
       "description": "Example description",
       "status": "In progress",
       "created_at": "2019-08-15T15:25:37.634182Z",
       "updated_at": "2019-08-21T10:40:58.830425Z",
       "user": {
           "id": "1",
           "name": "Local Admin",
           "email": "example@domain.net"
       },
       "images": [
           {
               "id": 7,
               "url": "https://gallery.img/6.jpg",
               "width": 400,
               "height": 300,
               "thumbnail_url": "https://gallery.img/6_thumb.jpg",
               "thumbnail_width": 200,
               "thumbnail_height": 150,
               "note": "",
               "is_featured": true
           }
       ],
       "data": {
           "master": {
               "scenario_name": "Master",
               "household": {
                   "3a_heatinghours_weekday_on1_hours": 6,
                   "3a_heatinghours_weekday_on1_mins": 45,
                   ...
               },
               ...
           }
       }
   }

Create assessment
-----------------

::

   POST /assessments/

ℹ️ porting notes: replaces previous ``assessment/create`` route.

.. _example-3:

Example
~~~~~~~

::

   > curl -v \
       -H "Content-Type: application/json" \
       http://localhost:9090/v1/api/assessments/ \
       --data @- << EOF
   {
       "name": "Example assessment",
       "description": "Example description",
   }
   EOF

Returns:

::

   HTTP 201 Created
   Content-Type: application/json

   {
       "id": 6,
       "name": "Example assesment",
       "description": "Example description",
       "status": "In progress",
       "created_at": "2019-06-01T16:35:34Z",
       "updated_at": "2019-06-01T16:35:34Z",
       "user": {
           "id": "1",
           "name": "Local Admin",
           "email": "example@domain.net"
       }
   }

Create assessment for organisation
----------------------------------

::

   POST /organisations/:id/assessments/

ℹ️ porting notes: replaces previous ``assessment/create`` with ``org``
param.

.. _example-4:

Example
~~~~~~~

::

   > curl -v \
       -H "Content-Type: application/json" \
       http://localhost:9090/v1/api/organisations/1/assessments/ \
       --data @- << EOF
   {
       "name": "Example assessment",
       "description": "Example description",
   }
   EOF

Returns:

::

   HTTP 201 Created
   Content-Type: application/json

   {
       "id": 6,
       "name": "Example assesment",
       "description": "Example description",
       "status": "In progress",
       "created_at": "2019-06-01T16:35:34Z",
       "updated_at": "2019-06-01T16:35:34Z",
       "user": {
           "id": "1",
           "name": "Local Admin",
           "email": "example@domain.net"
       },
   }

Update a field on assessment
----------------------------

::

   PATCH /assessments/:id/
   Content-Type: application/json

ℹ️ porting notes: replaces previous routes:

-  ``assessment/setdata``
-  ``assessment/setnameanddescription``
-  ``assessment/setopenBEMversion``
-  ``assessment/setstatus``

Example: update the model data
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

::

   > curl -v \
       -X PATCH \
       -H "Content-Type: application/json" \
       http://localhost:9090/v1/api/assessments/1/ \
       --data @- << EOF

   {
       "data": {
           "master": {
               "scenario_name": "Master",
               "household": {
                   "3a_heatinghours_weekday_on1_hours": 6,
                   "3a_heatinghours_weekday_on1_mins": 45,
           ...
       }
   }

Returns:

::

   HTTP 204 No content

Example: update the status
~~~~~~~~~~~~~~~~~~~~~~~~~~

::

   > curl -v \
       -X PATCH \
       -H "Content-Type: application/json" \
       http://localhost:9090/v1/api/assessments/1/ \
       --data @- << EOF
   {
       "status": "Complete",
   }
   EOF

Delete assessment
-----------------

::

   DELETE /assessments/:id/

ℹ️ porting notes: replaces previous ``assessment/delete`` route.

.. _example-5:

Example
~~~~~~~

::

   > curl -v \
       -X DELETE \
       http://localhost:9090/v1/api/assessments/1/

Returns:

::

   HTTP 204 No content

Upload an image to the image gallery
------------------------------------

::

   POST /assessments/:id/images/

.. _example-6:

Example
~~~~~~~

::

   curl -v \
       -F 'file=@image.png' \
       http://localhost:9090/dev/api/assessments/1/images/

Returns:

::

   HTTP/1.1 200 OK
   Content-Type: application/json
   {
       "id": 3,
       "url": "/media/images/342e8902-b709-4fff-b6da-73acc0c9488d.png",
       "width": 800,
       "height": 127,
       "thumbnail_url": "/media/images/342e8902-b709-4fff-b6da-73acc0c9488d_thumb.jpg",
       "thumbnail_width": 600,
       "thumbnail_height": 95,
       "note": "image",
       "is_featured": false
   }

Changing the featured image
---------------------------

::

   POST /assessments/:id/images/featured/

.. _example-7:

Example
~~~~~~~

::

   > curl -v \
       -X POST \
       -H "Content-Type: application/json" \
       http://localhost:9090/dev/api/assessments/1/images/featured/ \
       --data @- << EOF
   {
       "id": 6
   }
   EOF

Returns:

::

   HTTP/1.1 204 No Content

Edit an image’s note
--------------------

::

   PATCH /images/:id/

.. _example-8:

Example
~~~~~~~

::

   > curl -v \
       -X PATCH \
       -H "Content-Type: application/json" \
       http://localhost:9090/dev/api/images/10/ \
       --data @- << EOF
   {
       "note": "Corbyn's greenhouse"
   }
   EOF

Returns:

::

   HTTP/1.1 200 OK
   Content-Type: application/json
   {
       "id": 10,
       "note": "Corbyn's greenhouse",
       ...                     # All other fields the same
   }

Delete an image
---------------

::

   DELETE /images/:id/

.. _example-9:

Example
~~~~~~~

::

   curl -v \
       -X DELETE \
       http://localhost:9090/dev/api/images/6/

Returns:

::

   HTTP/1.1 204 No Content

List users
----------

::

   GET /users/

List all the users.

.. _example-10:

Example
~~~~~~~

::

   GET /users/

Returns:

::

   HTTP 200 OK
   Content-Type: application/json
   [
        {
           "id": "1",
           "name": "admin"
       },
       {
           "id": "2",
           "name": "janedoe"
       },
       {
           "id": "3",
           "name": "michael2"
       }
   ]

List organisations
------------------

::

   GET /organisations/

List all organisations the current user is a member of. Each
organisation also returns ``permissions``, which shows what the current
user can and can not do.

ℹ️ porting notes: replaces previous ``assessment/getorganisations``
route.

.. _example-11:

Example
~~~~~~~

::

   GET /organisations/

Returns:

::

   HTTP 200 OK
   Content-Type: application/json
   [
       {
           "id": "1",
           "name": "Chigley Community Energy",
           "assessments": 0,
           "members": [
               {
                   "userid": "2",
                   "name": "janedoe",
                   "last_active": "2019-06-03T16:35:00+00:00",
                   "is_admin": true,
                   "is_librarian": true
               }
           ],
           "permissions": {
               "can_add_remove_members": true,
               "can_promote_demote_librarians": true,
           }
       },
       {
           "id": "2",
           "name": "Sandford Assessment CIC",
           "assessments": 1,
           "members": [
               {
                   "userid": "2",
                   "name": "janedoe",
                   "last_login": "2019-06-03T16:35:00+00:00",
                   "is_admin": true,
                   "is_librarian": false
               },
               {
                   "userid": "3",
                   "name": "michael2",
                   "last_login": "2019-06-03T16:35:00+00:00"
                   "is_admin": false,
                   "is_librarian": true
               }
           ],
           "permissions": {
               "can_add_remove_members": true,
               "can_promote_demote_librarians": true,
           }
       }
   ]

Add member to organisation (by email)
-------------------------------------

::

   POST /organisations/:orgid/members/

This endpoint adds members by email.  If the user doesn't already exist,
they will be invited to the app.  Differs to the below endpoint because it
doesn't require a pre-existing user.

Example
~~~~~~~

::

   > curl -v \
       -X POST \
       -H "Content-Type: application/json" \
       http://localhost:9090/v2/api/organisations/1/members/ \
       --data @- << EOF
   [
       {"name": "name", "email": "email@email.com"}
   ]
   EOF

Returns:

::

   HTTP 204 No content

Add member to organisation (by userid)
--------------------------------------

::

   POST /organisations/:orgid/members/:userid/

Example
~~~~~~~

::

   > curl -X POST http://localhost:9090/dev/api/organisations/1/members/3/

Returns:

::

   HTTP 204 No content

Remove member from organisation
-------------------------------

::

   DELETE /organisations/:orgid/members/:userid/

.. _example-13:

Example
~~~~~~~

::

   > curl -X DELETE http://localhost:9090/dev/api/organisations/1/members/3/

Returns:

::

   HTTP 204 No content

Set organisation user as librarian
----------------------------------

::

   POST /organisations/:orgid/librarians/:userid/

.. _example-14:

Example
~~~~~~~

::

   > curl -X POST http://localhost:9090/dev/api/organisation/1/librarians/5/

Returns:

::

   HTTP 204 No content

Unset organisation user as librarian
------------------------------------

::

   DELETE /organisations/:orgid/librarians/:userid/

.. _example-15:

Example
~~~~~~~

::

   > curl -X DELETE http://localhost:9090/dev/api/organisation/1/librarians/5/

Returns:

::

   HTTP 204 No content

List libraries
--------------

::

   GET /libraries/

List a collection of libraries (and their library items) that is either:

a) a global library
b) a library that belongs to me,
c) a library belonging to an organisation I’m a member of
d) a library that has been shared with an organisation I’m a member of

ℹ️ porting notes: replaces previous route
``assessment/loaduserlibraries``

.. _example-16:

Example
~~~~~~~

::

   > curl http://localhost:9090/v1/api/libraries/

Returns:

::

   HTTP 200 OK
   Content-Type: application/json

   [
       {
           "id": 1,
           "name": "Jane's fabric elements",
           "type": "elements",
           "data": {
               "SWU_01": {
                   "tags": ["Wall"],
                   "name": "225mm uninsulated brick wall",
                   "description": "225mm uninslated solid brick wall, plaster internally",
                   "location": "",
                   "source": "Salford University on site monitoring\/ SAP table 1e, p.195",
                   "uvalue": 1.9,
                   "kvalue": 135,
                   "g": 0,
                   "gL": 0,
                   "ff": 0
               },
               "SWU_02": {
                   "tags": ["Wall"],
                   "name": "some other type of wall",
                   "description": "with another description",
                   "location": "",
                   "source": "Salford University on site monitoring\/ SAP table 1e, p.195",
                   "uvalue": 1.9,
                   "kvalue": 135,
                   "g": 0,
                   "gL": 0,
                   "ff": 0
               }
           },
           "created_at": "2019-11-25T17:34:05.766267Z",
           "updated_at": "2019-11-25T17:34:05.766267Z",
           "permissions": {
               "can_write": true,
               "can_share": false
           },
           "owner": {
               "type": "personal",
               "id": "1",
               "name": "janedoe"
           }
       },
       {
           "name": "Jane's fabric element measures",
           "type": "draught_proofing_measures",
           "items": {
               "DP_01": {
                   "name": "Basic Draught-proofing Measures",
                   "q50": 12,
                   "description": "This may include DIY draught-proofing measures to doors...",
                   "performance": "Dependent on existing. 8-12 ...",
                   "maintenance": "Minimal. Ensure any draught-proofing strips are replaced..."
               },
               "DP_02": {
                   "name": "Another draught proofing measure",
                   "q50": 12,
                   "description": "This may include DIY draught-proofing measures to doors...",
                   "performance": "Dependent on existing. 8-12 ...",
                   "maintenance": "Minimal. Ensure any draught-proofing strips are replaced..."
               }
           },
           "created_at": "2019-11-25T17:34:05.766267Z",
           "updated_at": "2019-11-25T17:34:05.766267Z",
           "permissions": {
               "can_write": true,
               "can_share": false
           },
           "owner": {
               "type": "personal",
               "id": "1",
               "name": "janedoe"
           }
       }
   ]

Create a library
----------------

::

   POST /libraries/

ℹ️ porting notes: replaces previous ``assessment/newlibrary`` route. It
can also add data in a single request, where the previous route required
the subsequent use of ``savelibrary``

::

   > curl -v \
       -H "Content-Type: application/json" \
       http://localhost:9090/v1/api/libraries/ \
       --data @- << EOF
   {
       "name": "StandardLibrary - user",
       "type": "draught_proofing_measures",
       "data": {
           "DP_01": {
               "name": "Basic Draught-proofing Measures",
               "q50": 12,
               "description": "This may include DIY draught-proofing measures to doors...",
               "performance": "Dependent on existing. 8-12 ...",
               "maintenance": "Minimal. Ensure any draught-proofing strips are replaced..."
           },
           "DP_02": {
               "name": "Another draught proofing measure",
               "q50": 12,
               "description": "This may include DIY draught-proofing measures to doors...",
               "performance": "Dependent on existing. 8-12 ...",
               "maintenance": "Minimal. Ensure any draught-proofing strips are replaced..."
           }
   }

Returns:

::

   HTTP 204 No content

Create a library for organisation
---------------------------------

::

   POST /organisations/:id/libraries/

.. _example-17:

Example
~~~~~~~

::

   > curl -v \
       -H "Content-Type: application/json" \
       http://localhost:9090/v2/api/organisations/1/libraries/ \
       --data @- << EOF
   {
       "name": "My organisation library",
       "type": "draught_proofing_measures",
       "data": {
           "DP_01": {
               "name": "Basic Draught-proofing Measures",
               "q50": 12,
               "description": "This may include DIY draught-proofing measures to doors...",
               "performance": "Dependent on existing. 8-12 ...",
               "maintenance": "Minimal. Ensure any draught-proofing strips are replaced..."
           },
           "DP_02": {
               "name": "Another draught proofing measure",
               "q50": 12,
               "description": "This may include DIY draught-proofing measures to doors...",
               "performance": "Dependent on existing. 8-12 ...",
               "maintenance": "Minimal. Ensure any draught-proofing strips are replaced..."
           }
   }

Returns:

::

   HTTP 204 No content

Update a library
----------------

::

   PATCH /libraries/:id/
   Content-Type: application/json

ℹ️ porting notes: replaces previous ``assessment/savelibrary`` route.

Example: update the ``data`` field
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

::

   > curl -v \
       -X PATCH \
       -H "Content-Type: application/json" \
       http://localhost:9090/v1/api/libraries/1/ \
       --data @- << EOF
   {
       "data": {},
   }
   EOF

Returns:

::

   HTTP 204 No content

Share an organisation library with another organisation
-------------------------------------------------------

::

   POST /organisations/:orgid/libraries/:libraryid/shares/:otherorgid/

.. _example-18:

Example
~~~~~~~

::

   > curl -v -X POST http://localhost:9090/dev/api/organisation/1/libraries/5/shares/2/ \

Unshare an organisation library with another organisation
---------------------------------------------------------

::

   DELETE /organisations/:orgid/libraries/:libraryid/shares/:otherorgid/

Returns:

::

   HTTP 204 No content

.. _example-19:

Example
~~~~~~~

::

   > curl -v -X DELETE http://localhost:9090/dev/api/organisation/1/libraries/5/shares/2/ \

List organisations a library is shared with
-------------------------------------------

For a given library that belongs to an organisation, list any
organisations the library is shared with.

::

   GET /organisations/:orgid/libraries/:libraryid/shares/

.. _example-20:

Example
~~~~~~~

::

   > curl http://localhost:9090/dev/api/organisation/1/libraries/5/shares/ \

Returns:

::

   HTTP 200 OK
   Content-Type: application/json
   [
       {
           "id": "1",
           "name": "Chigley Community Energy"
       },
       {
           "id": "2",
           "name": "Sandford Assessment CIC"
       }
   ]

Delete a library
----------------

::

   DELETE /librarys/:id/

ℹ️ porting notes: replaces previous ``assessment/deletelibrary`` route.

.. _example-21:

Example
~~~~~~~

::

   > curl -v \
       -X DELETE \
       http://localhost:9090/v1/api/libraries/1/

Returns:

::

   HTTP 204 No content

Create item in library
----------------------

::

   POST /libraries/:id/items/

ℹ️ porting notes: replaces previous ``assessment/additemtolibrary``
route.

.. _example-22:

Example
~~~~~~~

::

   > curl -v \
       -H "Content-Type: application/json" \
       http://localhost:9090/v1/api/libraries/1/items/ \
       --data @- << EOF
   {
       "tag": "SWIN_04",
       "item": {
           "name": "100-140mm External Wall Insulation EWI on filled cavity wall.",
           "source": "URBED/ SAP table 1e, p.195",
           "uvalue": 0.15,
           "kvalue": 110,
           "tags": ["Wall"]
       }
   }
   EOF

Returns:

::

   HTTP 204 No content

Update item in library
----------------------

::

   PUT /libraries/:id/items/:tag/

ℹ️ porting notes: replaces previous ``assessment/edititeminlibrary``
route.

.. _example-23:

Example
~~~~~~~

::

   > curl -v \
       -X PUT \
       -H "Content-Type: application/json" \
       http://localhost:9090/v1/api/libraries/1/item/SWIN_04/ \
       --data @- << EOF
   {
       "name": "100-140mm External Wall Insulation EWI on filled cavity wall.",
       "source": "URBED/ SAP table 1e, p.195",
       "uvalue": 0.15,
       "kvalue": 110,
       "tags": ["Wall"]
   }
   EOF

Returns:

::

   HTTP 204 No content

Delete item in library
----------------------

::

   DELETE /libraries/:id/items/:tag/

ℹ️ porting notes: replaces previous ``assessment/deletelibraryitem``
route.

.. _example-24:

Example
~~~~~~~

::

   > curl -v -X DELETE \
       http://localhost:9090/v1/api/libraries/1/item/SWIN_04/

Returns:

::

   HTTP 204 No content
