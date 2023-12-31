# Self-documenting makefile
# https://marmelab.com/blog/2016/02/29/auto-documented-makefile.html

.PHONY: help
help:
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

# ----------------------------------------------------------------------------

.PHONY: dev
dev:  ## Bring up the DB, run the server, and recompile the JS (then watch for changes)
	./client/node_modules/.bin/concurrently -n "server  ,js-watch" -c green "make server" "make js-watch"

.PHONY: js-watch
js-watch:  ## Compile JS (watching, for development)
	./client/node_modules/.bin/esbuild \
		client/src/exports.ts \
		--outdir=server/macquette/static/js_generated/ \
		--loader:.js=jsx \
		--target=es2019 \
		--sourcemap --bundle --watch

.PHONY: js-prod
js-prod:  ## Compile JS (one off, for production)
	./client/node_modules/.bin/esbuild \
		client/src/exports.ts \
		--outdir=server/macquette/static/js_generated/ \
		--loader:.js=jsx \
		--target=es2019 \
		--sourcemap --bundle --minify

.PHONY: server
server: docker-local-up ## Bring docker up and run the local server
	python server/manage.py runserver

.PHONY: pip-compile
pip-compile:  ## Recompile requirements file after a change
	pip-compile -q --output-file=server/requirements/production.txt server/requirements/production.in
	pip-compile -q --output-file=server/requirements/local.txt server/requirements/local.in
	git diff server/requirements/

.PHONY: pip-upgrade
pip-upgrade:  ## Compile new requirements files with the latest pkg (make pip-upgrade pkg=...)
	pip-compile -qP $(pkg) --output-file=server/requirements/production.txt server/requirements/production.in
	pip-compile -qP $(pkg) --output-file=server/requirements/local.txt server/requirements/local.in
	git diff server/requirements/

.PHONY: pip-upgrade-all
pip-upgrade-all:  ## Compile new requirements files with latest possible versions of everything (be careful!)
	pip-compile -qU --output-file=server/requirements/production.txt server/requirements/production.in
	pip-compile -qU --output-file=server/requirements/local.txt server/requirements/local.in
	git diff server/requirements/

.PHONY: sync
sync:  ## Install dependencies
	pip-sync server/requirements/local.txt
	cd client && npm clean-install

.PHONY: docker-local-up
docker-local-up:  ## Bring up our local docker containers
	docker-compose -p macquette -f docker-compose/local.yml up --detach

.PHONY: docker-local-down
docker-local-down:  ## Shut down our local docker containers
	docker-compose -p macquette -f docker-compose/local.yml stop

.PHONY: docker-local-clean
docker-local-clean:  ## Clean system volumes (helpful for resetting broken databases)
	docker-compose -p macquette -f docker-compose/local.yml rm
	docker system prune --volumes -f

.PHONY: coverage
coverage:  test-python ## Run tests & generate line-by-line coverage
	cd server && coverage html

.PHONY: upversion
upversion:  ## Mint a new version
	scripts/upversion.sh

.PHONY: test
test: test-python test-js  ## Run all tests

.PHONY: test-python
test-python:  ## Run Python tests
	cd server && pytest --cov=macquette --mpl --mpl-generate-summary=html --mpl-results-path=graph_results

.PHONY: test-js
test-js:  ## Run non-browser JS tests
	cd client && ./node_modules/.bin/jest

.PHONY: check-types-python
check-types-python:  ## Check types with tsc (without emitting)
	cd server && mypy ./macquette

.PHONY: check-types-js
check-types-js:  ## Check types with tsc (without emitting)
	./client/node_modules/.bin/tsc --noEmit --allowJs -p client/tsconfig.json

.PHONY: test-js-watch
test-js-watch:  ## Run non-browser JS tests (watch mode)
	cd client && ./node_modules/.bin/jest --watch

.PHONY: lint-js
lint-js:  ## Runs eslint with a separate config in the 'client' directory
	cd client && ./node_modules/.bin/eslint \
		$$(if [ "$${CI}" != "true" ]; then echo "--fix"; fi) \
		--config .eslintrc.js \
		--ignore-path .eslintignore \
		--max-warnings 0 \
		.

.PHONY: format-prettier
format-prettier: ## Run prettier on all non-ignored files
	./client/node_modules/.bin/prettier \
		$$(if [ "$${CI}" != "true" ]; then echo "--write"; else echo "--check"; fi) \
		'.'

.PHONY: lint-js-legacy
lint-js-legacy:  ## Runs eslint with a separate config on legacy (non-compiled) JS
	./client/node_modules/.bin/eslint \
		$$(if [ "$${CI}" != "true" ]; then echo "--fix"; fi) \
		--config server/macquette/static/js/.eslintrc.json \
		--ignore-path server/macquette/static/js/.eslintignore \
		--max-warnings 0 \
		server/macquette/static/js/

.PHONY: docker-build
docker-build:  ## Build the service image
	# If running in CI we have already built the image in the build stage
	if [ "${CI}" != "true" ]; then \
		docker build --tag $${SERVICE_IMAGE_TAG:-macquette:latest} . ; \
	fi

.PHONY: test-container
test-container: docker-build  ## Run tests of the built service docker image in a docker-compose environment
	docker-compose -p macquette-testing -f docker-compose/testing.yml build
	cd test-container && docker build --tag test-container:latest .
	docker-compose -p macquette-testing -f docker-compose/testing.yml up -d
	docker run --rm -i \
		--env BASE_URL='http://service:5000/' \
		--env USERNAME='test-superuser' \
		--env PASSWORD='test-superuser-password' \
		--network macquette-testing_macquette-network \
		test-container:latest
	docker-compose -p macquette-testing -f docker-compose/testing.yml down
	docker-compose -p macquette-testing -f docker-compose/testing.yml rm

.PHONY: docs
docs:  ## Build HTML docs (for other options run make in docs/)
	make -C docs/ html
	echo
	echo "URL: file://`pwd`/docs/_build/html/index.html"
