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

test: cleantest build
	bin/component_proxy.js build --templatepath test/static --baseurl /static
	mkdir test/different_static_dir
	cp -rf test/static test/different_static_dir/
	mkdir -p test/different_base_url/mystatic
	cp -rf test/static/* test/different_base_url/mystatic
	bin/component_proxy.js build --templatepath test/different_base_url/mystatic --baseurl /mystatic
	bin/component_proxy.js test -l &
	bin/component_proxy.js test -l -s test/different_static_dir/static -p 1334 &
	bin/component_proxy.js test -l -s test/different_base_url/mystatic -p 1333

cleantest:
	rm -rf test/different_static_dir
	rm -rf test/different_base_url
	rm -rf test/static/components
	rm -rf test/static/csi-context.json

clean:
	node bin/build.js -c

distclean: clean
	rm -rf node_modules || true

.PHONY: clean cleantest distclean build
