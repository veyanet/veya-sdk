.PHONY: install test lint build doctor live examples

install:
	npm install

test:
	npm test

lint:
	npm run lint

build:
	npm run build

doctor:
	npx tsx scripts/doctor.ts

live:
	npx tsx scripts/live-rpc.ts

examples:
	npx tsx examples/quickstart.ts
	npx tsx examples/pq-identity.ts
