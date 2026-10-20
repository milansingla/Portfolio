#!/bin/bash
# Builds the site a second time with the FIXTURE articles (tests/fixtures/blog) into a separate
# output directory, serves it on :3115 and runs the blog e2e suite against it. The real build and
# content/blog are not touched. Usage: bash tests/blog-e2e.sh
set -e
cd "$(dirname "$0")/.."
export NEXT_DIST_DIR=.next-blogfix BLOG_CONTENT_DIR="$PWD/tests/fixtures/blog" NEXT_PUBLIC_SITE_URL=https://milansingla.tech
rm -rf .next-blogfix
npx next build > /tmp/blogfix-build.log 2>&1 || { cat /tmp/blogfix-build.log; exit 1; }
npx next start -p 3115 > /tmp/blogfix-server.log 2>&1 &
PID=$!
trap 'kill $PID 2>/dev/null; rm -rf .next-blogfix' EXIT
for i in $(seq 1 30); do curl -s -o /dev/null http://localhost:3115/blog && break; sleep 1; done
python3 tests/e2e/blog.py fixture http://localhost:3115
