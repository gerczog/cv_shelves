#!/bin/bash

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
while ! pg_isready -h postgres -p 5432 -U cv_shelves_user; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done

echo "PostgreSQL is ready - running migrations"

# Run Alembic migrations
alembic upgrade head

echo "Migrations completed"
