#!/bin/bash

set -e

CWD=$PWD

run_test() {
  local DIR=$1

  echo "TEST: $DIR"

  cd "$CWD/packages/$DIR"
  [ "$INSTALL" == "1" ] && npm i .
  npm test
}

run_test plant
run_test http-adapter
run_test http
run_test https
run_test http2
run_test https2
run_test router
run_test flow
