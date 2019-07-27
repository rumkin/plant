#!/bin/bash

set -e

FILES=`git diff --cached --name-status | egrep '^(M|A)' | egrep '\.js$' | awk '{ print $2 }'`

for FILE in $FILES;
do
  echo "LINT: $FILE"
  git show :$FILE | npx eslint --stdin --stdin-filename $FILE
done
