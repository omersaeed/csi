build: src/require.js src/order.js src/text.js src/qunit.js src/qunit.css

src/require.js: vendor/requirejs/require.js
	node bin/build.js

src/order.js: vendor/requirejs/order.js
	node bin/build.js

src/text.js: vendor/requirejs/text.js
	node bin/build.js

src/qunit.js: node_modules
	node bin/build.js

src/qunit.css: node_modules
	node bin/build.js

vendor/requirejs/%.js:
	git submodule init
	git submodule update

node_modules:
	npm install

test: build
	node_modules/.bin/coffee component.coffee -l test

clean:
	node bin/build.js -c

distclean: clean
	rm -rf node_modules || true

.PHONY: clean distclean
