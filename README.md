# My Home Energy Planner (MHEP) Django

[![Build Status](https://travis-ci.org/mhep-transition/mhep-django.svg?branch=master)](https://travis-ci.org/mhep-transition/mhep-django)
[![Coverage Status](https://coveralls.io/repos/github/mhep-transition/mhep-django/badge.svg?branch=master)](https://coveralls.io/github/mhep-transition/mhep-django?branch=master)

## Checkout the repo and submodules

```
git clone --recursive https://github.com/mhep-transition/mhep-django
```

Or, if you've already cloned `mhep-django`, run:

```
git submodule update --init --recursive
```

## Install Vagrant & Virtualbox

* Install [Vagrant 2.0.1+](https://www.vagrantup.com/downloads.html)

* Install [Virtualbox 5.2.18](https://www.virtualbox.org/wiki/Downloads)

## Run `vagrant up`

It should create a new Ubuntu 18.04 VM and configure everything.

## Start Django

With the vagrant box running, run:

`vagrant ssh`

Once connected to the box, simply run:

`make run`

This will start the Django server.

## Access MHEP

Browse to [localhost:9090](http://localhost:9090)

An administrative interface is available at [localhost:9090/admin](http://localhost:9090/admin), the username is `localadmin`, password `localadmin`


## Working with app versions

The app is fully versioned at the Django application level, with names like `v1`, `v2` etc.

Different app versions live under a URL prefix e.g. `/v1/`.

App versions are highly isolated, meaning each version has its own:

* templates & static assets
* URL schema (including API URLs)
* database models


### Starting a new app version

To start working on a new version of the app, cd into `./mhep` and run the script
[`upversion.sh`](https://github.com/mhep-transition/mhep-django/blob/master/mhep/upversion.sh)
and set the new version as `dev`.

The script copies an app version to a new version, for example, going from `v1` to `dev`:

* copy-pastes the whole directory `mhep/mhep/v1` to `/mhep/mhep/dev`
* renames the `static/v1` and `templates/v1` subdirectories
* adds the new `dev` app to Django's `LOCAL_APPS` setting and `urls.py`
* modifies the `dev/fixtures/*.json` files with the updated app label


### Finalising an app version

When the `dev` app is finished it should be renamed to e.g. `v2`.

Once an app is assigned a version number its code should never be modified again.


# v1 API endpoints

* [List assessments](#list-assessments)
* [List assessments for organisation](#list-assessments-for-organisation)
* [Get assessment](#get-assessment)
* [Create assessment](#create-assessment)
* [Create assessment for organisation](#create-assessment-for-organisation)
* [Update a field on assessment](#update-a-field-on-assessment)
* [Delete assessment](#delete-assessment)
* [List organisations](#list-organisations)
* [List libraries](#list-libraries)
* [Create a library](#create-a-library)
* [Create a library for organisation](#create-a-library-for-organisation)
* [Update a library](#update-a-library)
* [Delete a library](#delete-a-library)
* [Create item in library](#create-item-in-library)
* [Update item in library](#update-item-in-library)
* [Delete item in library](#delete-item-in-library)

All endpoints start with `/v1/api` e.g. `http://localhost:9090/v1/api/assessments/`.

## List assessments

```
GET /assessments/
```

List all assessments the current user has access to.

ℹ️ porting notes: replaces previous `assessment/list` route.

### Example

```
GET /assessments/
```

Returns:

```
HTTP 200 OK
Content-Type: application/json
[
    {
        "id": "1",
        "name": "Example assessment",
        "description": "Example description",
        "openbem_version": "10.1.1",
        "status": "In progress",
        "created_at": "2019-08-15T15:25:37.634182Z",
        "updated_at": "2019-08-21T10:40:58.830425Z",
        "author": "localadmin",
        "userid": "1",
        "mdate": "1566384058",
    }
]
```

## List assessments for organisation

```
GET /organisations/:id/assessments/
```

List all assessments that belong to an organisation.

ℹ️ porting notes: replaces previous `assessment/list` with `orgid` param.

### Example

```
GET /organisations/1/assessments/
```

Returns:

```
HTTP 200 OK
Content-Type: application/json
[
    {
        "id": "1",
        "name": "Example assessment",
        "description": "Example description",
        "openbem_version": "10.1.1",
        "status": "In progress",
        "created_at": "2019-08-15T15:25:37.634182Z",
        "updated_at": "2019-08-21T10:40:58.830425Z",
        "author": "localadmin",
        "userid": "1",
        "mdate": "1566384058",
    }
]
```

## Get assessment

```
GET /assessments/:id/
```

ℹ️ porting notes: replaces previous route `assessment/get`

### Example

```
> curl http://localhost:9090/v1/api/assessments/1
```

Returns:

```
HTTP 200 OK
Content-Type: application/json

{
    "id": "1",
    "name": "Example assessment",
    "description": "Example description",
    "openbem_version": "10.1.1",
    "status": "In progress",
    "created_at": "2019-08-15T15:25:37.634182Z",
    "updated_at": "2019-08-21T10:40:58.830425Z",
    "author": "localadmin",
    "userid": "1",
    "mdate": "1566384058",
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
```

## Create assessment

```
POST /assessments/
```

ℹ️ porting notes: replaces previous `assessment/create` route.

### Example

```
> curl -v \
    -H "Content-Type: application/json" \
    http://localhost:9090/v1/api/assessments/ \
    --data @- << EOF
{
    "name": "Example assessment",
    "description": "Example description",
    "openbem_version": "10.1.1"
}
EOF
```

Returns:

```
HTTP 201 Created
Content-Type: application/json

{
    "id": 6,
    "name": "Example assesment",
    "description": "Example description",
    "openbem_version": "10.1.1",
    "status": "In progress",
    "created_at": "2019-06-01T16:35:34Z",
    "updated_at": "2019-06-01T16:35:34Z",
    "mdate": "1559406934",
    "author": "janedoe",
    "userid": "2",
}
```

## Create assessment for organisation

```
POST /organisations/:id/assessments/
```

ℹ️ porting notes: replaces previous `assessment/create` with `org` param.

### Example

```
> curl -v \
    -H "Content-Type: application/json" \
    http://localhost:9090/v1/api/organisations/1/assessments/ \
    --data @- << EOF
{
    "name": "Example assessment",
    "description": "Example description",
    "openbem_version": "10.1.1"
}
EOF
```

Returns:

```
HTTP 201 Created
Content-Type: application/json

{
    "id": 6,
    "name": "Example assesment",
    "description": "Example description",
    "openbem_version": "10.1.1",
    "status": "In progress",
    "created_at": "2019-06-01T16:35:34Z",
    "updated_at": "2019-06-01T16:35:34Z",
    "mdate": "1559406934",
    "author": "janedoe",
    "userid": "2",
}
```

## Update a field on assessment

```
PATCH /assessments/:id/
Content-Type: application/json
```

ℹ️ porting notes: replaces previous routes:

* `assessment/setdata`
* `assessment/setnameanddescription`
* `assessment/setopenBEMversion`
* `assessment/setstatus`

### Example: update the model data

```
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
```

Returns:

```
HTTP 204 No content
```

### Example: update the status

```
> curl -v \
    -X PATCH \
    -H "Content-Type: application/json" \
    http://localhost:9090/v1/api/assessments/1/ \
    --data @- << EOF
{
    "status": "Complete",
}
EOF
```

## Delete assessment

```
DELETE /assessments/:id/
```

ℹ️ porting notes: replaces previous `assessment/delete` route.

### Example

```
> curl -v \
    -X DELETE \
    http://localhost:9090/v1/api/assessments/1/
```

Returns:

```
HTTP 204 No content
```

## List organisations

```
GET /organisations/
```

List all organisations the current user is a member of.

ℹ️ porting notes: replaces previous `assessment/getorganisations` route.

### Example

```
GET /organisations/
```

Returns:

```
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
                "last_active": "2019-06-03T16:35:00+00:00"
            }
        ]
    },
    {
        "id": "2",
        "name": "Sandford Assessment CIC",
        "assessments": 1,
        "members": [
            {
                "userid": "2",
                "name": "janedoe",
                "last_login": "2019-06-03T16:35:00+00:00"
            },
            {
                "userid": "3",
                "name": "michael2",
                "last_login": "2019-06-03T16:35:00+00:00"
            }
        ]
    }
]
```

## List libraries

```
GET /libraries/
```

List all libraries and their library items that belong to me.

ℹ️ porting notes: replaces previous route `assessment/loaduserlibraries`

⚠️ currently each library has `"writeable": True` hardcoded

### Example

```
> curl http://localhost:9090/v1/api/libraries/
```

Returns:

```
HTTP 200 OK
Content-Type: application/json

[
    {
        "id": 1,
        "name": "StandardLibrary - localadmin",
        "type": "elements",
        "items": {
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
        }
    },
    {
        "name": "StandardLibrary - localadmin",
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
        }
    }
]
```

## Create a library

```
POST /libraries/
```

ℹ️ porting notes: replaces previous `assessment/newlibrary` route. It can also add data in a
single request, where the previous route required the subsequent use of `savelibrary`

```
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
```

Returns:

```
HTTP 204 No content
```

## Create a library for organisation

```
POST /organisations/:id/libraries/
```

### Example

```
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
```

Returns:

```
HTTP 204 No content
```

## Update a library

```
PATCH /libraries/:id/
Content-Type: application/json
```

ℹ️ porting notes: replaces previous `assessment/savelibrary` route.

### Example: update the `data` field

```
> curl -v \
    -X PATCH \
    -H "Content-Type: application/json" \
    http://localhost:9090/v1/api/libraries/1/ \
    --data @- << EOF
{
    "data": {},
}
EOF
```

Returns:

```
HTTP 204 No content
```

## Delete a library

```
DELETE /librarys/:id/
```

ℹ️ porting notes: replaces previous `assessment/deletelibrary` route.

### Example

```
> curl -v \
    -X DELETE \
    http://localhost:9090/v1/api/libraries/1/
```

Returns:

```
HTTP 204 HTTP 204 No content
```

## Create item in library

```
POST /libraries/:id/items/
```

ℹ️ porting notes: replaces previous `assessment/additemtolibrary` route.

### Example

```
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
```

Returns:

```
HTTP 204 No content
```

## Update item in library

```
PUT /libraries/:id/items/:tag/
```

ℹ️ porting notes: replaces previous `assessment/edititeminlibrary` route.

### Example

```
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
```

Returns:

```
HTTP 204 No content
```

## Delete item in library

```
DELETE /libraries/:id/items/:tag/
```

ℹ️ porting notes: replaces previous `assessment/deletelibraryitem` route.

### Example

```
> curl -v -X DELETE \
    http://localhost:9090/v1/api/libraries/1/item/SWIN_04/
```

Returns:

```
HTTP 204 No content
```

# Dummy API endpoints

In this first release, where we have no concept of an organisation, the following endpoints have been hardcoded to return
certain values.

* [List my organisations](#list-my-organisations)
* [Create organisation](#create-organisations)
* [List organisation assessments](#list-organisation-assessments)

## List my organisations

```
GET /organisations/
```

List all organisations the logged in user is part of

ℹ️ porting notes: replaces previous `assessment/getorganisations` route.

### Example

```
> curl http://localhost:9090/v1/api/organisations/
```

Returns:

```
HTTP 200 OK
Content-Type: application/json

[
    {
        "id": "1",
        "name": "Carbon Coop",
        "assessments": 0,
        "members": [
            {
                "userid": "1",
                "name": "localadmin",
                "last_login": "2019-06-03T16:35:00+00:00"
            }
        ]
    }
]
```

## Create organisation

```
POST /organisations/
```

ℹ️ porting notes: replaces previous `assessment/neworganisation` route.

### Example

```
> curl -v \
    -H "Content-Type: application/json" \
    http://localhost:9090/v1/api/organisations/ \
    --data @- << EOF
{
    "name": "Example organisation"
}
EOF
```

Returns:

```
HTTP 400 Bad Request
Content-Type: application/json

{
    "detail": "function not implemented"
}
```

## List organisation assessments

```
GET /organisations/:id/assessments/
```

List all assessments belonging to the organisation.

ℹ️ porting notes: replaces previous `assessment/list` route, passing `orgid`.

### Example

```
> curl http://localhost:9090/v1/api/organisations/1/assessments/
```

Returns:

```
HTTP 200 OK
Content-Type: application/json

[]
```

## Create assessment in organisation

```
POST /organisations/:id/assessments/
```

ℹ️ porting notes: replaces previous `assessment/create` route, passing `orgid`.

### Example

```
> curl -v \
    -H "Content-Type: application/json" \
    http://localhost:9090/v1/api/organisations/1/assessments/ \
    --data @- << EOF
{
    "name": "Example assessment",
    "description": "Example description",
    "openbem_version": "10.1.1"
}
EOF
```

Returns:

```
HTTP 400 Bad Request
```
