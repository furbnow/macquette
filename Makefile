# Self-documenting makefile
# https://marmelab.com/blog/2016/02/29/auto-documented-makefile.html

.PHONY: help
help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

# ----------------------------------------------------------------------------

.PHONY: dev
dev:  ## Bring up the DB, run the server, and recompile the JS (then watch for changes)
	npx concurrently -n "server,js    " -c green "make server" "make js"

.PHONY: js
js:  ## Compile JS (one off, for development)
	npx esbuild \
		mhep/dev/static/dev/js_src/exports.tsx \
		--outdir=mhep/dev/static/dev/js_generated/ \
		--loader:.js=jsx \
		--define:process.env.NODE_ENV=\"dev\" \
		--sourcemap --bundle --watch

.PHONY: ts-check
ts-check:
	npx tsc --noEmit --allowJs -p mhep/dev/static/dev/tsconfig.json -w

.PHONY: js-prod
js-prod:  ## Compile JS (one off, for production)
	npx esbuild \
		mhep/dev/static/dev/js_src/exports.tsx \
		--outdir=mhep/dev/static/dev/js_generated/ \
		--loader:.js=jsx \
		--define:process.env.NODE_ENV=\"production\" \
		--sourcemap --bundle

.PHONY: load-placeholder-library
load-placeholder-library:
	python manage.py loaddata mhep/dev/fixtures/standard_library.json

.PHONY: server
server: docker-up ## Bring docker up and run the local server
	python manage.py runserver

.PHONY: pip-compile
pip-compile:  ## Recompile requirements file after a change
	pip-compile -q --output-file=requirements/production.txt requirements/production.in
	pip-compile -q --output-file=requirements/local.txt requirements/local.in
	git diff requirements/

.PHONY: pip-upgrade
pip-upgrade:  ## Compile new requirements files with the latest pkg (make pip-upgrade pkg=...)
	pip-compile -qP $(pkg) --output-file=requirements/production.txt requirements/production.in
	pip-compile -qP $(pkg) --output-file=requirements/local.txt requirements/local.in
	git diff requirements/

.PHONY: pip-upgrade-all
pip-upgrade-all:  ## Compile new requirements files with latest possible versions of everything (be careful!)
	pip-compile -qU --output-file=requirements/production.txt requirements/production.in
	pip-compile -qU --output-file=requirements/local.txt requirements/local.in
	git diff requirements/

.PHONY: pip-sync
pip-sync:  ## Make the local installed packages reflect the ones in the local requirements
	pip-sync requirements/local.txt

.PHONY: docker-up
docker-up:  ## Bring up our local docker containers
	docker-compose -p macquette -f scripts/local.yml up --no-start
	docker-compose -p macquette -f scripts/local.yml start

.PHONY: docker-down
docker-down:  ## Shut down our local docker containers
	docker-compose -p macquette -f scripts/local.yml stop

.PHONY: docker-clean
docker-clean:  ## Clean system volumes (helpful for resetting broken databases)
	docker system prune --volumes -f

.PHONY: coverage
coverage:  ## Run tests & generate line-by-line coverage
	pytest --cov=mhep
	coverage html

.PHONY: upversion
upversion:  ## Mint a new version
	scripts/upversion.sh

.PHONY: test
test: test-python test-js  ## Run all tests

.PHONY: test-python
test-python:  ## Run Python tests
	pytest --cov=mhep
	flake8 mhep

.PHONY: test-js
test-js:  ## Run non-browser JS tests
	npx jest
	npx tsc --noEmit --allowJs -p mhep/dev/static/dev/tsconfig.json

.PHONY: test-js-watch
test-js-watch:  ## Run non-browser JS tests (watch mode)
	npx jest --watch

.PHONY: docs
docs:  ## Build HTML docs (for other options run make in docs/)
	make -C docs/ html
	echo
	echo "URL: file://`pwd`/docs/_build/html/index.html"
