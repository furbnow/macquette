<script>
'use strict';

function handleServerError(intendedAction) {
  /*
    pass this into $.ajax() as the error parameter for example
    ```
      $ajax({
        success: function(response) { ... },
        error: handleServerError('listing libraries'),
        ...
      })
    ```
    */

  return function(result) {
    let msg = result.statusText;
    if (result.responseJSON) {
      msg += ': ' + JSON.stringify(result.responseJSON);
    }

    console.log('responseJSON: ', result.responseJSON);
    console.error('error ' + intendedAction + ': server returned: HTTP ' + result.status + ': ' + msg);
    alert('Error ' + intendedAction + '. The server responded: HTTP ' + result.status + ': ' + msg);
  }
}
</script>
