#!/bin/sh
# Builds preview/index.html = Index.html + the mock server, for local testing.
cd "$(dirname "$0")"
sed 's#<script>#<script src="mock.js"></script>\n<script>#' ../Index.html > index.html
