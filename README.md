# My Home Energy Planner (MHEP) Django

[![Build Status](https://travis-ci.org/mhep-transition/mhep-django.svg?branch=master)](https://travis-ci.org/mhep-transition/mhep-django)
[![Coverage Status](https://coveralls.io/repos/github/mhep-transition/mhep-django/badge.svg?branch=master)](https://coveralls.io/github/mhep-transition/mhep-django?branch=master)

## Install Vagrant & Virtualbox

* Install [Vagrant 2.0.1+](https://www.vagrantup.com/downloads.html)

* Install [Virtualbox 5.2.18](https://www.virtualbox.org/wiki/Downloads)

## Run `vagrant up`

It should create a new Ubuntu 18.04 VM and configure everything.

## Access MHEP

* browse to [localhost:9090](http://localhost:8080)
* the admin username is `localadmin`, password `localadmin`

# API endpoints

* [List assessments](#list-assessments)
* [Get assessment](#get-assessment)
* [Create assessment](#create-assessment)
* [Update a field on assessment](#update-a-field-on-assessment)
* [Delete assessment](#delete-assessment)
* [List element libraries](#list-element-libraries)
* [Create item in element library](#create-item-in-element-library)
* [Update item in element library](#update-item-in-element-library)

All endpoints start with `/api/v1` e.g. `http://localhost:9090/api/v1/assessments/`.

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
```

## Get assessment

```
GET /assessments/:id/
```

ℹ️ porting notes: replaces previous route `assessment/get`

### Example

```
> curl http://localhost:9090/api/v1/assessments/1
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
    "data": {
        "master": {
            "scenario_name": "Master",
            "household": {
                "3a_heatinghours_weekday_on1_hours": 6,
                "3a_heatinghours_weekday_on1_mins": 45,
...
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
    http://localhost:9090/api/v1/assessments/ \
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
    http://localhost:9090/api/v1/assessments/1/ \
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
    http://localhost:9090/api/v1/assessments/1/ \
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
    http://localhost:9090/api/v1/assessments/1/
```

Returns:

```
HTTP 204 HTTP 204 No content
```

## List element libraries

```
GET /libraries/
```

List all element libraries and their library items that I've got access to.

ℹ️ porting notes: replaces previous route `assessment/loaduserlibraries`

### Example

```
> curl http://localhost:9090/api/v1/libraries/
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

## Create item in element library

```
POST /libraries/:id/items/
```

ℹ️ porting notes: replaces previous `assessment/additemtolibrary` route.

### Example

```
> curl -v \
    -H "Content-Type: application/json" \
    http://localhost:9090/api/v1/libraries/1/items/ \
    --data @- << EOF
{
    "idtag": "SWIN_04",
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

## Update item in element library

```
PUT /libraries/:id/items/:idtag/
```

ℹ️ porting notes: replaces previous `assessment/edititeminibrary` route.

### Example

```
> curl -v \
    -X PUT \
    -H "Content-Type: application/json" \
    http://localhost:9090/api/v1/libraries/1/item/SWIN_04/ \
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

# Dummy API endpoints

In this first release, where we have no concept of an organisation, the following endpoints have been hardcoded to return
certain values.

* [List organisation assessments](#list-organisation-assessments)

## List organisation assessments

```
GET /organisations/:id/assessments/
```

List all assessments belonging to the organisation.

ℹ️ porting notes: replaces previous `assessment/list` route, passing `orgid`.

### Example

```
> curl http://localhost:9090/api/v1/organisations/1/assessments/
```

Returns:

```
HTTP 200 OK
Content-Type: application/json

[]
```
