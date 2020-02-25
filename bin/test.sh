#!/bin/bash

set -e

CWD=$PWD

run_install() {
  local DIR=$1

  echo "INSTALL: $DIR"

  cd "$CWD/packages/$DIR"

  npm i .
}

run_test() {
  local DIR=$1
  local FILEPATH="$CWD/packages/$DIR"

  echo "TEST: $DIR at $FILEPATH"

  cd "$FILEPATH"

  npm test
}

run_lint() {
  local DIR=$1
  local FILEPATH="$CWD/packages/$DIR"

  echo "LINT: $DIR at $FILEPATH"

  cd "$FILEPATH"

  npm run lint
}

cmd_install() {
  run_install plant
  run_install http-adapter
  run_install http
  run_install https
  run_install http2
  run_install https2
  run_install router
  run_install flow
}

cmd_install_root() {
  echo "FILEPATH: $CWD"
  npm i .
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
  echo "- install"
  echo "- install-root"
  echo "- lint"
  echo "- test"
}

CMD=$1
shift 1

case $CMD in
  "install") cmd_install $@ ;;
  "install-root") cmd_install_root $@ ;;
  "lint") cmd_lint $@ ;;
  "test") cmd_test $@ ;;
  *) cmd_usage ;;
esac
