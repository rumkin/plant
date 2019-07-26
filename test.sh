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

run_lint() {
  local DIR=$1

  echo "LINT: $DIR"

  cd "$CWD/packages/$DIR"

  npm run lint
}

cmd_test() {
  run_test plant
  run_test http-adapter
  run_test http
  run_test https
  run_test http2
  run_test https2
  run_test router
  run_test flow
}

cmd_lint() {
  run_lint plant
  run_lint http-adapter
  run_lint http
  run_lint https
  run_lint http2
  run_lint https2
  run_lint router
  run_lint flow
}

cmd_usage() {
  echo "Usage is: test.sh COMMAND"
  echo ""
  echo "Commands are:"
  echo "- test"
  echo "- lint"
}

CMD=$1
shift 1

case $CMD in
  "lint") cmd_lint $@ ;;
  "test") cmd_test $@ ;;
  *) cmd_usage ;;
esac
