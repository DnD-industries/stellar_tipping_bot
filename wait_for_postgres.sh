#!/bin/sh
# Waits for a connection to the postgres server before executing the given command
# Credit to: https://dev.to/kellyjandrews/docker-compose-entrypoint-to-check-for-postgres

set -e

cmd="$@"

while ! pg_isready -h "db" -p "5432" > /dev/null 2> /dev/null; do
   echo "Waiting for postgres connection..."
   sleep 1
 done

>&2 echo "Postgres is up - executing command:"
>&2 echo $cmd
exec $cmd