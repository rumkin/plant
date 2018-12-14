#!/bin/bash

set -e

cd packages/plant
npm i .
npm test
