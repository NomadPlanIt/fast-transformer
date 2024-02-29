#!/usr/bin/env bash

git diff-index --quiet HEAD --

if [ $? -ne 0 ]; then
  echo "Your repo has uncommited changes."
  exit -1
fi

exit 0
