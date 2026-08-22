#!/bin/sh
set -eu

if [ -f ./prisma/schema.prisma ]; then
  if [ -f ./node_modules/prisma/build/index.js ]; then
    node ./node_modules/prisma/build/index.js migrate deploy
  elif [ -x ./node_modules/.bin/prisma ]; then
    ./node_modules/.bin/prisma migrate deploy
  fi
fi

exec node server.js
