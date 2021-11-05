#!/bin/bash

set -o errexit
set -o pipefail
set -o nounset

postgres_ready() {
python << END
import sys
import logging

import psycopg2
import environ

env = environ.Env()
db_info = env.db("DATABASE_URL")
logger = logging.getLogger("script")

try:
    psycopg2.connect(
        dbname=db_info['NAME'],
        user=db_info['USER'],
        password=db_info['PASSWORD'],
        host=db_info['HOST'],
        port=db_info['PORT'],
    )
except psycopg2.OperationalError:
    logger.error("Couldn't connect to DB...")
    sys.exit(-1)

sys.exit(0)

END
}
until postgres_ready; do
  >&2 date
  >&2 echo
  >&2 echo 'Database not available.'
  >&2 echo
  >&2 echo 'If env var DATABASE_URL is set, then likely the instance is not in the '
  >&2 echo 'correct security group.'
  >&2 echo
  >&2 echo "- ENV VARS BELOW ---------------------"
  >&2 env
  >&2 echo "--------------------------------------"
  exit
done

>&2 echo 'PostgreSQL is available'

exec "$@"
