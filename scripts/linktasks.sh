#!/bin/bash
mkdir -p .backups
timestamp=$(date +"%Y%m%d_%H%M%S")
if [ -f ~/Documents/tasks.json ]; then
  cp ~/Documents/tasks.json ".backups/tasks.json.$timestamp"
fi
rm -f ~/Documents/tasks.json && ln -s "$(pwd)/tasks.json" ~/Documents/tasks.json