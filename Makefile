build: src/require.js src/order.js src/text.js src/qunit.js src/qunit.css bin/build.js lib/css_requirejs_plugin.js lib/css_rewrite.js
	node bin/build.js

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
	mkdir test/different_static_dir
	cp -rf test/static test/different_static_dir/
	bin/component_proxy.js test -l &
	bin/component_proxy.js test -l -s test/different_static_dir/static -p 1334

cleantest:
	rm -rf test/different_static_dir
	rm -rf test/static/components

clean:
	node bin/build.js -c

distclean: clean
	rm -rf node_modules || true

.PHONY: clean cleantest distclean build
