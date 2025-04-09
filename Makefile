-include .env

NODE_VERSION := 22.14.0
DC_CMD := COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 BUILDKIT_PROGRESS=plain docker compose
DBMATE_CMD := docker compose run --rm dbmate

dbmate-args := \
    --url=${POSTGRESQL_DSN}?sslmode=disable \
    --migrations-dir=./db/migrations \
	--no-dump-schema \
  	--wait

.PHONY: setup
setup: check-node install-deps install-tsx
	git config core.hooksPath .husky
	@echo "Setup finished!"

.PHONY: app/run
app/run:
	npx tsx src/index.tsx

.PHONY: lint
lint:
	npx eslint .

.PHONY: db/up
db/up:
	$(DC_CMD) up postgres -d

.PHONY: db/down
db/down:
	$(DC_CMD) down postgres

.PHONY: db/migrations/up
db/migrations/up:
	$(DBMATE_CMD) ${dbmate-args} up

.PHONY: db/migrations/down
db/migrations/down:
	$(DBMATE_CMD) ${dbmate-args} down

check-node:
	@if ! node --version | grep -q $(NODE_VERSION); then \
		echo "Node.js of version $(NODE_VERSION) was not defined! Ensure that you have right version."; \
		exit 1; \
	fi

install-deps:
	npm install

install-tsx:
	npm install -g tsx


