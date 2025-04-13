-include .env
export

.PHONY: setup \
	local/up \
	docker/build docker/up docker/down \
	db/up db/down db/migrations/up db/migrations/down \
	lint \
	utils/tuna/up

NODE_VERSION := 22.14.0
DC_CMD := COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 BUILDKIT_PROGRESS=plain docker compose
DBMATE_CMD := docker compose run --rm dbmate

dbmate-args := \
    --url=${POSTGRESQL_DSN}?sslmode=disable \
    --migrations-dir=./db/migrations \
	--no-dump-schema \
  	--wait


setup: .check-node .install-deps .install-tsx
	git config core.hooksPath .husky
	@echo "Setup finished!"

local/up:
	npx tsx src/index.ts

docker/build:
	$(DC_CMD) build --no-cache app

docker/up:
	$(DC_CMD) up app

docker/down:
	$(DC_CMD) down

db/up:
	$(DC_CMD) up postgres -d

db/down:
	$(DC_CMD) down postgres

db/migrations/up:
	$(DBMATE_CMD) ${dbmate-args} up

db/migrations/down:
	$(DBMATE_CMD) ${dbmate-args} down

.db/rm:
	$(DC_CMD) down postgres -v

lint:
	npx eslint .  # TODO: fix it

utils/tuna/up:
	tuna http 3000 --subdomain=tg-shop

.check-node:
	@if ! node --version | grep -q $(NODE_VERSION); then \
		echo "Node.js of version $(NODE_VERSION) was not defined! Ensure that you have right version."; \
		exit 1; \
	fi

.install-deps:
	npm install

.install-tsx:
	npm install -g tsx

.docker/up-daemon:
	$(DC_CMD) up -d app

-include Makefile.override
