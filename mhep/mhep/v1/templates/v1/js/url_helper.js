{% load static %}

<script>
  'use strict';

  const urlHelper = function() {
    // urlHelper constructions API & HTML urls from object IDs, e.g.
    //
    // urlHelper.api.assessment(3) -> returns `/v1/api/assessments/3/`
    return {
      api: {
        assessments: function() {
          return '{% url "v1:list-create-assessments" %}';
        },

        assessment: function(assessmentID) {
          const dummyURL = '{% url "v1:retrieve-update-destroy-assessment" "12345" %}';
          return dummyURL.replace(/12345/, parseInt(assessmentID));
        },

        organisationAssessments: function(organisationID) {
          const dummyURL = '{% url "v1:list-create-organisation-assessments" "12345" %}';
          return dummyURL.replace(/12345/, parseInt(organisationID));
        },

        organisations: function() {
          return '{% url "v1:list-organisations" %}';
        },

        libraries: function() {
          return '{% url "v1:list-create-libraries" %}';
        },

        library: function(libraryID) {
          return '{% url "v1:update-destroy-library" "12345" %}'.replace(/12345/, parseInt(libraryID));
        },

        libraryItems: function(libraryID) {
          const dummyURL = '{% url "v1:create-update-delete-library-item" "12345" %}';
          return dummyURL.replace(/12345/, parseInt(libraryID));
        },

        libraryItem: function(libraryID, tag) {
          const dummyURL = '{% url "v1:create-update-delete-library-item" "12345" "abcde" %}';
          return dummyURL.replace(/12345/, parseInt(libraryID)).replace(/abcde/, tag);
        },
      },

      html: {
        assessment: function(assessmentID) {
          return '{% url "v1:view-assessment" "12345" %}'.replace(/12345/, assessmentID.toString());
        },
      },

      static: function (resourcePath) {
        // returns the full URL for the given static file e.g. 'img/graphic.png'
        const dummyURL = '{% static VERSION|add:"/12345" %}';
        return dummyURL.replace(/12345/, resourcePath);
      },

      admin: {
        organisation: function(organisationID) {
          const dummyURL = '{% url "admin:"|add:VERSION|add:"_organisation_change" 12345 %}';
          return dummyURL.replace(/12345/, orgid.toString());
        }
      },

    }
  }();
</script>
