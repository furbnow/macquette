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
          return '{% url VERSION|add:":list-create-assessments" %}';
        },

        assessment: function(assessmentID) {
          const dummyURL = '{% url VERSION|add:":retrieve-update-destroy-assessment" "12345" %}';
          return dummyURL.replace(/12345/, parseInt(assessmentID));
        },

        organisationAssessments: function(organisationID) {
          const dummyURL = '{% url VERSION|add:":list-create-organisation-assessments" "12345" %}';
          return dummyURL.replace(/12345/, parseInt(organisationID));
        },

        organisations: function() {
          return '{% url VERSION|add:":list-organisations" %}';
        },

        libraries: function() {
          return '{% url VERSION|add:":list-create-libraries" %}';
        },

        library: function(libraryID) {
          return '{% url VERSION|add:":update-destroy-library" "12345" %}'.replace(/12345/, parseInt(libraryID));
        },

        libraryItems: function(libraryID) {
          const dummyURL = '{% url VERSION|add:":create-update-delete-library-item" "12345" %}';
          return dummyURL.replace(/12345/, parseInt(libraryID));
        },

        libraryItem: function(libraryID, tag) {
          const dummyURL = '{% url VERSION|add:":create-update-delete-library-item" "12345" "abcde" %}';
          return dummyURL.replace(/12345/, parseInt(libraryID)).replace(/abcde/, tag);
        },
      },

      html: {
        assessment: function(assessmentID) {
          return '{% url VERSION|add:":view-assessment" "12345" %}'.replace(/12345/, assessmentID.toString());
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
