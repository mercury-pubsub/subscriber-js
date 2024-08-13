#!/usr/bin/env sh

ONLY_MINOR="@types/node"

pnpm exec npm-check-updates -f "$ONLY_MINOR" -t minor -u
pnpm exec npm-check-updates -x "$ONLY_MINOR" -u
pnpm install
pnpm update
biome format --write package.json
