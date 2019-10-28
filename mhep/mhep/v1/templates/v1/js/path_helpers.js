{% load staticfiles %}

<script>
  'use strict';

  function staticURL(resourcePath) {
    // returns the full URL for the given static file e.g. 'img/graphic.png'

    return '{% static "12345" %}'.replace(/12345/, resourcePath);
  }

</script>
