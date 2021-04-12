# Self-documenting makefile
# https://marmelab.com/blog/2016/02/29/auto-documented-makefile.html

.PHONY: help docs

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

# ----------------------------------------------------------------------------

dev:  ## Bring up the DB, run the server, and recompile the JS (then watch for changes)
	npx concurrently -n "django,js    " -c green "make server" "make js-watch" "make js"

js:  ## Compile JS (one off, for development)
	npx esbuild \
		mhep/dev/static/dev/js_src/exports.tsx \
		--outdir=mhep/dev/static/dev/js_generated/ \
		--loader:.js=jsx \
		--define:process.env.NODE_ENV=\"dev\" \
		--sourcemap --bundle

ts-check:
	npx tsc --noEmit --allowJs -p mhep/dev/static/dev/tsconfig.json

js-prod:  ## Compile JS (one off, for production)
	npx esbuild \
		mhep/dev/static/dev/js_src/exports.tsx \
		--outdir=mhep/dev/static/dev/js_generated/ \
		--loader:.js=jsx \
		--define:process.env.NODE_ENV=\"production\" \
		--sourcemap --bundle

js-watch:  ## Compile JS (watching for changes, for development)
	npx chokidar "mhep/dev/static/dev/js_src/**/*" -c "make js"

load-placeholder-library:
	python manage.py loaddata mhep/dev/fixtures/standard_library.json

server: docker-up ## Bring docker up and run the local server
	python manage.py runserver

pip-compile:  ## Recompile requirements file after a change
	pip-compile -q --output-file=requirements/production.txt requirements/production.in
	pip-compile -q --output-file=requirements/local.txt requirements/local.in
	git diff requirements/

pip-upgrade:  ## Compile new requirements files with the latest pkg (make pip-upgrade pkg=...)
	pip-compile -qP $(pkg) --output-file=requirements/production.txt requirements/production.in
	pip-compile -qP $(pkg) --output-file=requirements/local.txt requirements/local.in
	git diff requirements/

pip-upgrade-all:  ## Compile new requirements files with latest possible versions of everything (be careful!)
	pip-compile -qU --output-file=requirements/production.txt requirements/production.in
	pip-compile -qU --output-file=requirements/local.txt requirements/local.in
	git diff requirements/

pip-sync:  ## Make the local installed packages reflect the ones in the local requirements
	pip-sync requirements/local.txt

docker-up:  ## Bring up our local docker containers
	docker-compose -p macquette -f scripts/local.yml up --no-start
	docker-compose -p macquette -f scripts/local.yml start

docker-down:  ## Shut down our local docker containers
	docker-compose -p macquette -f scripts/local.yml stop

docker-clean:  ## Clean system volumes (helpful for resetting broken databases)
	docker system prune --volumes -f

coverage:  ## Run tests & generate line-by-line coverage
	pytest --cov=mhep
	coverage html

upversion:  ## Mint a new version
	scripts/upversion.sh

test: test-python test-js  ## Run all tests

test-python:  ## Run Python tests
	pytest --cov=mhep
	flake8 mhep

test-js:  ## Run non-browser JS tests
	node --experimental-vm-modules node_modules/.bin/jest

test-js-watch:  ## Run non-browser JS tests (watch mode)
	node --experimental-vm-modules node_modules/.bin/jest --watch

docs:  ## Build HTML docs (for other options run make in docs/)
	make -C docs/ html
	echo
	echo "URL: file://`pwd`/docs/_build/html/index.html"
