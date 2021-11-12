Process for importing old MHEP assessments
==========================================

- Get a copy of the original report or data to check against
- Get the data from S3, unpack it
- Load the sql file into a new DB in mysql
- find the assessment in the assessments table
- copy it out (this won’t include images)
- make a new assessment in HRP, go to import/export
- open the console and try to copy paste the JSON

you will run into errors.

Docker config for mysql server + phpMyAdmin replacement
-------------------------------------------------------

.. code-block:: yaml

    version: '3'

    services:
      db:
        image: mysql
        environment:
          MYSQL_ROOT_PASSWORD: my-secret-pw
        command: "--default-authentication-plugin=mysql_native_password"

      adminer:
        image: adminer
        ports:
          - 8080:8080
