#!/usr/bin/env sh

ONLY_MINOR="@types/node"

pnpm exec npm-check-updates --dep dev -f "$ONLY_MINOR" -t minor -u
pnpm exec npm-check-updates --dep dev -x "$ONLY_MINOR" -u
pnpm install
pnpm update --dev
biome format --write package.json
