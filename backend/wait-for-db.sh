#!/bin/sh
# Script to wait for PostgreSQL to be ready

host="$1"
port="${2:-5432}"
user="${3:-xentraldesk}"
password="${4:-xentraldesk_dev}"
db="${5:-xentraldesk}"

counter=0
max_attempts=60

until [ $counter -ge $max_attempts ]; do
  if PGPASSWORD="$password" psql -h "$host" -p "$port" -U "$user" -d "$db" -c '\q' 2>/dev/null; then
    >&2 echo "PostgreSQL is up - proceeding"
    exit 0
  fi
  
  counter=$((counter + 1))
  >&2 echo "PostgreSQL is unavailable (attempt $counter/$max_attempts) - sleeping"
  sleep 2
done

>&2 echo "PostgreSQL is not available after $max_attempts attempts"
exit 1
