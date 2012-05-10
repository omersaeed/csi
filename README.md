# `csi`

client side package tools for team players

## go ahead, elevator pitch me.

`csi` is a client side package manager for industrial strength software
projects.  it's built on [`require.js`][requirejs], and it allows you to write
full client-side components (`html`, `css`, and `javascript`) that can be
installed anywhere within your app.  some features:

 - **backend agnostic** -- `csi` doesn't assume anything other than
   [`npm`][npm] for dependency management.

 - **test-driven** -- `csi` provides built-in, easy to use testing with
   [`qunit`][qunit], and it can be easily extended to use other frameworks like
   [`mocha`][mocha].

 - **[`require.js`][requirejs] based** -- [`amd`][amd] is baked in with
   `require.js`, and `csi` builds on that foundation to allow even more
   modularity.

 - **whollistic** -- last time we checked, client-side web apps are composed of
   not just javascript, but also `css` and markup.  `csi` helps you write
   full components with `css` and `html` dependencies without having to worry
   about where your assets will be stored.

## let's get into some examples.

let's say you've got a module called `bird`, and its sole purpose is to [put a
bird on it][bird_on_it].  it is so friggin useful that you want it in all the
apps that you make, even though some of your apps are 10 years old and they run
on perl-scripting-cgi-serving technology, and others are so hip that [you
haven't even heard of their framework yet][spire].  it goes something like
this:

    var birdifyIt = function(node) {
        var el = document.createElement('div');
        el.className = 'with-a-bird-on-it';
        node.appendChild(el);
    };

and then you throw some css up somewhere:

    .with-a-bird-on-it {
      width: 640px
      height: 480px;
      background-image: url(bird.png);
    }

but you want to leverage amd for code reuse, so you put it in a module:

    define([], function() {
        return function(node) {
            var el = document.createElement('div');
            el.className = 'with-a-bird-on-it';
            node.appendChild(el);
        };
    });

you're even so savvy that you write a css plugin for `require.js`.  that way
you can abstract the details of the code from the caller:

    define([
        'css!bird.css'
    ], function() {
        return function(node) {
            var el = document.createElement('div');
            el.className = 'with-a-bird-on-it';
            node.appendChild(el);
        };
    });

your code works, it's modular, your company is selling crap with birds on it
left and right, and your boss is so happy he comes over to your cubicle and
he says:

> man that put-a-bird-on-it code you wrote is so sick, lets use it in our new
> app, version 2.0!

### the plot thickens.

like any good engineering organization, you guys completely re-architected
everything in version 2.0, and now you're putting modules into their own little
subdirectories in order to help separate concerns.  you throw your bird module
into the `components/bird` directory, and BOOM, it stops working because the
paths to `bird.css` and `bird.png` have changed.

so now you've got to edit the bird code in order to put it in a new app.
that's not optimal, and since you didn't write any unit tests for it, you've
got that sinking "i think i broke it when i touched it" feeling.  

### a simple `csi` module

so what would it look like to have a fully modular way of doing this?  let's
write it as a `csi` component.  we make a 'bird' repository with the following
directory structure:

    bird
    |-- package.json
    `-- src
        |-- bird.css
        |-- bird.js
        `-- bird.png

`bird.js` looks like:

    define([
        'path!bird:css!bird.css'
    ], function() {
        return function(node) {
            var el = document.createElement('div');
            el.className = 'with-a-bird-on-it';
            node.appendChild(el);
        };
    });

let's break down line 2 where we declare the css dependency:

    'path!bird:css!bird.css'

 - `path!`: we're using the 'path' plugin

 - `bird:`: we're telling the 'path' plugin that this dependency comes from the
   'bird' component.  this is another layer of indirection; the 'path'
   plugin maps 'bird' to our 'components/bird' directory (we'll cover that
   mapping more later)

 - `css!`: we're still using that slick 'css' plugin

 - `bird.css`: and of course our filename, except now it's relative to the bird
   component, so we won't need to update this if we put it in a different
   project

we've also included an npm [package.json][package_json] file.  this is
necessary whether or not you plan on publishing to the npm registry because
it's how we manage dependencies.  here's the contents:

    {
      "author": "nature and stuff",
      "name": "put-a-bird-on-it",
      "description": "we put birds on things.",
      "version": "0.0.0",
      "engines": {
        "node": "~0.6.11"
      },
      "dependencies": {
        "csi": "0.0.x"
      },
      "component": {
        "name": "bird"
      }
    }

this is all pretty strait forward, but there are two important things:

 - **`csi` dependency**: declaring `csi` as a dependency gives us tools like the
   `reqiure.js` path plugin and makes unit testing and code reuse a breeze.

 - **`component` property**: `csi` uses this to define the name of the
   component.  the `component.name` property is required.

before we get into how we include the bird component, let's write a quick qunit
test to cover ourselves in future refactorings:

    require([
        'path!bird:bird'
    ], function(birdifyIt) {

        test('put an effin bird on it', function() {
            var body = document.getElementsByTagName('body')[0], childNodes;
            birdifyIt(body);
            childNodes = body.childNodes;
            equal(childNodes[childNodes.length-1].className, 'with-a-bird-on-it');
        });

        start();
    });

running the test is easy:

    $ npm install
    $ node_modules/.bin/component test

this will start up a server for you and list out URL's you can visit to run
tests.  open up [http://localhost:1335/components/bird/test][test] in your
browser.

### including components in an app

now back to your app version 2.0.  you'll have a directory structure like this:

    app_v2
    |-- package.json
    `-- static
        |-- bluejay.js
        `-- test.js

your sweet new `bluejay` module extends the functionality of `birdifyIt`:

    define([
        'path!bird:bird'
    ], function(birdifyIt) {
        return function(node) {
            var childNodes;
            birdifyIt(node);
            childNodes = node.childNodes;
            childNodes[childNodes.length-1].style.backgroundColor = 'blue';
        };
    });

**#protip**: you can use the shorthand `path!bird` instead of
`path!bird:bird`, and `csi` is smart enough to load the default module

and then you can add an entry point at `static/index.js`

    require([
        'bluejay'
    ], function(bluejay) {
        var body = document.getElementsByTagName('body')[0];
        bluejay(body);
    });

and your `package.json` will be:

    {
      "name": "app_v2",
      "description": "the new hotness in aviary appification",
      "version": "0.0.0",
      "engines": {
        "node": "~0.6.11"
      },
      "dependencies": {
        "csi": "0.0.x",
        "put-a-bird-on-it": "git://github.com/aaronj1335/put-a-bird-on-it.git"
      }
    }

thanks to npm's [flexible dependency specification][json_deps], we can just use
a `git` url, but you could of course use the npm registry or the location of a
tarball.

running tests is still easy:

    $ npm install
    $ node_modules/.bin/component test

since we defined the entry point in `static/index.js`, we can open
[http://localhost:1335/index][index].  `csi` is smart enough to figure out that
this is not a test module (since it doesn't have 'test' in the filename), so
your page loads as without all the qunit stuff.

## bada bing

and there you have it, modular client-side development.  there are quite a few
details that we glossed over, such as the mechanics of installing components
(hint: they go in a directory called `components`), and the fact that [`csi`
may re-write `url()` paths in `css`][css_url_rewrite] files, but hopefully this
was an instructive tutorial.  the best way to get a feel for `csi` would
probably be to check out working examples:

 - [`gloss`][gloss]: a UI framework.  this makes heavy use of `csi`.  it also
   includes an example of client-side templating with [John Resig's
   micro-templating][microtemplates].  it utilizes the following dependencies:

     - [`siq-vendor-js`][vendorjs]: third-party stuff like jquery and
       underscore

     - [`bedrockjs`][bedrock]: our class and (non-DOM) event implementation

     - [`mesh`][mesh]: our integrated REST framework


[bird_on_it]: http://www.youtube.com/watch?v=0XM3vWJmpfo
[spire]: https://github.com/siq/spire
[gloss]: https://github.com/siq/gloss
[vendorjs]: https://github.com/siq/siq-vendor-js
[requirejs]: http://requirejs.org/
[package_json]: http://npmjs.org/doc/json.html
[json_deps]: http://npmjs.org/doc/json.html#dependencies
[css_url_rewrite]: https://github.com/siq/csi/blob/master/lib/css_requirejs_plugin.js#L139
[test]: http://localhost:1335/components/bird/test
[index]: http://localhost:1335/index
[bedrock]: https://github.com/siq/B
[mesh]: https://github.com/siq/mesh
[microtemplates]: http://ejohn.org/blog/javascript-micro-templating/
[npm]: http://npmjs.org/
[qunit]: http://docs.jquery.com/QUnit
[mocha]: http://visionmedia.github.com/mocha/
[amd]: https://github.com/amdjs/amdjs-api/wiki/AMD
