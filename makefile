# Set the shell to bash explicitly, as some commands may not work in sh.
SHELL := /bin/bash

# Define Go binary path
GO_BIN_PATH := $(shell go env GOPATH)/bin

# Change these variables as necessary.
main_package_path = ./cmd/baker-news
binary_name = baker-news

# Shell colors
GREEN=\033[0;32m
RED=\033[0;31m
BLUE=\033[0;34m
NC=\033[0m # No Color


# ==================================================================================== #
# HELPERS
# ==================================================================================== #

## help: print this help message
.PHONY: help
help:
	@echo 'Usage:'
	@sed -n 's/^##//p' ${MAKEFILE_LIST} | column -t -s ':' |  sed -e 's/^/ /'

.PHONY: confirm
confirm:
	@echo -n 'Are you sure? [y/N] ' && read ans && [ $${ans:-N} = y ]

.PHONY: no-dirty
no-dirty:
	@test -z "$(shell git status --porcelain)"


# ==================================================================================== #
# QUALITY CONTROL
# ==================================================================================== #

## audit: run quality control checks
.PHONY: audit
audit: test
	go mod tidy -diff
	go mod verify
	test -z "$(shell gofmt -l .)"
	go vet ./...
	go run honnef.co/go/tools/cmd/staticcheck@latest -checks=all,-ST1000,-U1000 ./...
	go run golang.org/x/vuln/cmd/govulncheck@latest ./...

## test: run all tests
.PHONY: test
test:
	go test -v -race -buildvcs ./...

## test/cover: run all tests and display coverage
.PHONY: test/cover
test/cover:
	go test -v -race -buildvcs -coverprofile=/tmp/coverage.out ./...
	go tool cover -html=/tmp/coverage.out


# ==================================================================================== #
# OPERATIONS
# ==================================================================================== #

## push: push changes to the remote Git repository
.PHONY: push
push: confirm audit no-dirty
	git push

## production/deploy: deploy the application to production
.PHONY: production/deploy
production/deploy: confirm audit no-dirty
	GOOS=linux GOARCH=amd64 go build -ldflags='-s' -o=/tmp/bin/linux_amd64/${binary_name} ${main_package_path}
	upx -5 /tmp/bin/linux_amd64/${binary_name}
	# Include additional deployment steps here...


# ==================================================================================== #
# DATABASE
# ==================================================================================== #

POSTGRES_HOST := localhost
POSTGRES_PORT := 5432
POSTGRES_USER := postgres
POSTGRES_PASSWORD := password
POSTGRES_URI := postgres://$(POSTGRES_USER):$(POSTGRES_PASSWORD)@$(POSTGRES_HOST):$(POSTGRES_PORT)
POSTGRES_DATABASE_NAME := baker_news
DATABASE_URI := $(POSTGRES_URI)/$(POSTGRES_DATABASE_NAME)

GOOSE_PKG := github.com/pressly/goose/v3/cmd/goose@v3.22.1
GOOSE_MIGRATIONS_DIRECTORY := ./state/sql/migrations
GOOSE_DRIVER := pgx


## db/create-if-absent: create the database if it does not exists
.PHONY: db/create-if-absent
.SILENT: db/create-if-absent
db/create-if-absent:
	@echo -e "$(BLUE)📝 Creating database $(POSTGRES_DATABASE_NAME) if it does not exist...$(NC)"
	@echo ""

	DATABASE_URI="$(DATABASE_URI)" \
		go run ./cmd/db-utils/db-utils.go create-database-if-absent

	@echo ""

## db/drop-if-exists: drop the database if it exists
.PHONY: db/drop-if-exists
.SILENT: db/drop-if-exists
db/drop-if-exists:
	DATABASE_URI="$(DATABASE_URI)" \
		go run ./cmd/db-utils/db-utils.go drop-database-if-exists

## db/migrate: run database migrations
.PHONY: db/migrate
.SILENT: db/migrate
db/migrate:
	@echo -e "$(BLUE)📝 Running database migrations...$(NC)"
	@echo ""

	GOOSE_DRIVER=$(GOOSE_DRIVER) \
		GOOSE_DBSTRING="$(POSTGRES_URI)/$(POSTGRES_DATABASE_NAME)" \
		go run $(GOOSE_PKG) --dir $(GOOSE_MIGRATIONS_DIRECTORY) up

	@echo ""

## db/schema-dump: dump the database schema to a file (used by sqlc)
.PHONY: db/schema-dump
db/schema-dump:
	@echo -e "$(BLUE)📝 Dumping database schema to ./state/sql/schema.sql...$(NC)"
	@echo ""

	docker-compose exec --interactive --tty postgres \
				pg_dump \
					--schema-only \
					--host=localhost \
					--username=$(POSTGRES_USER) \
					--exclude-table=goose_db_version \
					--no-owner \
					baker_news \
		> ./state/sql/schema.sql

	@echo ""

## db/sqlc/generate: generate SQLC code
.PHONY: db/sqlc/generate
.SILENT: db/sqlc/generate
db/sqlc/generate:
	@echo -e "$(BLUE)📝 Running SQLC code generation...$(NC)"
	@echo ""

	DATABASE_URI="$(DATABASE_URI)" \
		go run github.com/sqlc-dev/sqlc/cmd/sqlc@v1.27.0 generate --file ./state/sql/sqlc.yml

	@echo ""

SQLC_TARGETS := ./state/db.go ./state/models.go ./state/query.sql.go
SQLC_SOURCES := ./state/sql/sqlc.yml ./state/sql/schema.sql ./state/sql/query.sql
$(SQLC_TARGETS): $(SQLC_SOURCES)
	@$(MAKE) db/sqlc/generate

## db/tidy: create, migrate the database and run generators
.PHONY: db/tidy
db/tidy: db/create-if-absent db/migrate db/schema-dump db/sqlc/generate

## db/seed: populates the database with random data
.PHONY: db/seed
db/seed:
	DATABASE_URI="${DATABASE_URI}" \
		go run -tags=assert ./cmd/seed

## db/goose-alias: adds an alias for goose to the shell (use it with `eval $(make db/goose-alias)`)
.PHONY: db/goose-alias
db/goose-alias:
	echo alias goose=\' \
		GOOSE_DRIVER=pgx \
		GOOSE_DBSTRING="$(DATABASE_URI)" \
		go run $(GOOSE_PKG) \
		--dir $(MIGRATIONS_DIRECTORY)\'


# ==================================================================================== #
# DEVELOPMENT
# ==================================================================================== #

## tidy: tidy modfiles and format .go files
.PHONY: tidy
tidy:
	go mod tidy -v
	go fmt ./...

## templ/generate: generate templates
.PHONY: templ/generate
templ/generate:
	TEMPL_EXPERIMENT=rawgo \
		${GO_BIN_PATH}/templ generate -lazy

## build: build the application
.PHONY: build
build: templ/generate $(SQLC_TARGETS)
	# Include additional build steps, like TypeScript, SCSS or Tailwind compilation here...
	go build -tags=assert -o=/tmp/bin/${binary_name} ${main_package_path}

## run: run the  application
.PHONY: run
run: build
	/tmp/bin/${binary_name}

## run/live: run the application with reloading on file changes
.PHONY: run/live
run/live:
	LOG_LEVEL="$${LOG_LEVEL:-DEBUG}" \
	DATABASE_URI="${DATABASE_URI}" \
		go run github.com/cosmtrek/air@v1.43.0 \
			--build.cmd "make build" \
			--build.bin "/tmp/bin/${binary_name}" \
			--build.delay "100" \
			--build.exclude_dir "docker-compose" \
			--build.include_ext "go, tpl, tmpl, templ, html, css, scss, js, ts, sql, jpeg, jpg, gif, png, bmp, svg, webp, ico" \
			--misc.clean_on_exit "true"
