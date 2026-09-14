#!/bin/bash
set -euo pipefail
SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:?Set NEXT_PUBLIC_SUPABASE_URL}"
SUPABASE_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY:?Set NEXT_PUBLIC_SUPABASE_ANON_KEY}"

echo "Creating 'vehicles' storage bucket on $SUPABASE_URL ..."
curl -X POST "$SUPABASE_URL/storage/v1/b" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "vehicles",
    "public": true,
    "file_size_limit": 52428800
  }'
echo
echo "Request sent."
