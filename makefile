# Set the shell to bash explicitly, as some commands may not work in sh.
SHELL := /bin/bash

# Define Go binary path
GO_BIN_PATH := $(shell go env GOPATH)/bin

# Change these variables as necessary.
main_package_path = ./cmd/baker-news
binary_name = baker-news

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
# DEVELOPMENT
# ==================================================================================== #

## tidy: tidy modfiles and format .go files
.PHONY: tidy
tidy:
	go mod tidy -v
	go fmt ./...

## build: build the application
.PHONY: build
build:
	# Include additional build steps, like TypeScript, SCSS or Tailwind compilation here...
	${GO_BIN_PATH}/templ generate -lazy
	go build -o=/tmp/bin/${binary_name} ${main_package_path}

## run: run the  application
.PHONY: run
run: build
	/tmp/bin/${binary_name}

## run/live: run the application with reloading on file changes
.PHONY: run/live
run/live:
	LOG_LEVEL="$${LOG_LEVEL:-DEBUG}" \
		go run github.com/cosmtrek/air@v1.43.0 \
			--build.cmd "make build" --build.bin "/tmp/bin/${binary_name}" --build.delay "100" \
			--build.exclude_dir "" \
			--build.include_ext "go, tpl, tmpl, templ, html, css, scss, js, ts, sql, jpeg, jpg, gif, png, bmp, svg, webp, ico" \
			--misc.clean_on_exit "true"


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

DATABASE_URI := postgres://postgres:password@localhost:5432
MIGRATIONS_DIRECTORY := ./state/sql/migrations

## db/create-if-absent: create the database if it does not exists
.PHONY: db/create-if-absent
.SILENT: db/create-if-absent
db/create-if-absent:
	DATABASE_URI="${DATABASE_URI}" \
		go run ./bin/db-utils/db-utils.go create-database-if-absent

## db/drop-if-exists: drop the database if it exists
.PHONY: db/drop-if-exists
.SILENT: db/drop-if-exists
db/drop-if-exists:
	DATABASE_URI="${DATABASE_URI}" \
		go run ./bin/db-utils/db-utils.go drop-database-if-exists

## db/goose-alias: adds an alias for goose to the shell (use it with `eval $(make db/goose-alias)`)
.PHONY: db/goose-alias
db/goose-alias:
	echo alias goose=\' \
		GOOSE_DRIVER=pgx \
		GOOSE_DBSTRING="$(DATABASE_URI)/baker_news" \
		go run github.com/pressly/goose/v3/cmd/goose@v3.22.1 \
		--dir $(MIGRATIONS_DIRECTORY)\'

# .PHONY: db/schema-dump
# 	db/schema-dump:
# 		docker run --interactive --tty postgres:17-alpine /bin/sh --workdir /working --volume ./state/sql:/working

# db/schema-dump: dump the database schema
.PHONY: db/schema-dump
db/schema-dump:
	docker run --interactive --tty --rm \
		--env PGPASSWORD="password" \
		--network baker-news_std-network \
		postgres:17-alpine pg_dump \
			--schema-only \
			--host=postgres \
			--username=postgres \
			--exclude-table=goose_db_version \
			--no-owner \
			baker_news \
		> ./state/sql/schema.sql


## db/sqlc/generate: generate SQLC code
.PHONY: db/sqlc/generate
sqlc/generate:
	go run github.com/sqlc-dev/sqlc/cmd/sqlc@v1.27.0 generate --file ./state/sql/sqlc.yml
