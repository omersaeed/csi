build: src/require.js src/order.js src/text.js

src/require.js: vendor/requirejs/require.js
	node bin/build.js

src/order.js: vendor/requirejs/order.js
	node bin/build.js

src/text.js: vendor/requirejs/text.js
	node bin/build.js

vendor/requirejs/%.js:
	git submodule init
	git submodule update

clean:
	node bin/build.js -c

.PHONY: clean
