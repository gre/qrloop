#!/bin/bash

set -e
cd $(dirname $0)/..
export NODE_ENV=production
BABEL_ENV=cjs babel -d lib src --ignore __tests__
flow-copy-source -v src lib
BABEL_ENV=es babel -d lib-es src --ignore __tests__
flow-copy-source -v src lib-es
