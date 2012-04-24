build: src/require.js src/order.js src/text.js

src/require.js: vendor/requirejs
	node bin/build.js

src/order.js: vendor/requirejs
	node bin/build.js

src/text.js: vendor/requirejs
	node bin/build.js

vendor/requirejs:
	git submodule init
	git submodule update

clean:
	node bin/build.js -c

.PHONY: clean
