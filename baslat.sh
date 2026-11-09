#!/usr/bin/env bash
# PİKSEL ARENA — macOS / Linux başlatıcı
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js bulunamadı. https://nodejs.org adresinden LTS sürümünü kur."
  exit 1
fi
( sleep 1; (command -v open >/dev/null && open http://localhost:3000) || (command -v xdg-open >/dev/null && xdg-open http://localhost:3000) ) >/dev/null 2>&1 &
node server.js
