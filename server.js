var http = require('http'),
    path = require('path'),
    os = require('os'),
    fs = require('fs'),
    _ = require('underscore'),
    async = require('async'),
    // Buffer = require('buffer').Buffer,
    extend = require('node.extend'),
    indexPath = path.resolve(path.join(path.dirname(__filename), 'index.html')),
    testBodyPath = path.resolve(path.join(path.dirname(__filename), 'test_body.html')),
    testHeadPath = path.resolve(path.join(path.dirname(__filename), 'test_head.html')),
    rjsBaseDir = path.dirname(require.resolve('siq-requirejs-base')),
    rjsStaticDir = path.join(rjsBaseDir, 'static'),
    rjsConfigFileName = path.join(rjsBaseDir, 'requirejs-config.json'),
    rjsConfig = JSON.parse(fs.readFileSync(rjsConfigFileName, 'utf8'));

var contentType = {
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript'
};

var defaultHeaders = {
    'Content-Type': 'text/plain',
    'Cache-Control': 'must-revalidate, no-cache'
};

var extentsion = function(filename) {
    var split = filename.split('.');
    return split[split.length-1];
};

var addJsExt = function(url, staticDir) {
    return (/.js$/).test(url)? url : url + '.js';
};

var writeHead = function(req, resp, statusCode, headers) {
    console.log(new Date() + ' [' + statusCode + ']: ' + req.url);
    resp.writeHead(statusCode, headers);
};

var readIndex = (function() {
    var indexContent, indexError, testBodyContent, testHeadContent,
        curriedReadFile = function() {
            var filename = arguments[0],
                encoding = arguments.length >=3? arguments[1] : 'utf8',
                callback = arguments[arguments.length >= 3? 2 : 1];
            return fs.readFile(filename, encoding, callback);
        };
    return function(req, resp, indexPath, callback) {
        if (typeof indexContent === 'undefined') {
            async.map([indexPath, testBodyPath, testHeadPath], curriedReadFile,
                function(err, results) {
                    var file = results[0],
                        testBody = results[1],
                        testHead = results[2];
                    if (err) {
                        serveError(req, resp, err);
                        return;
                    }
                    indexError = err;
                    indexContent = file || null;
                    testBodyContent = testBody;
                    testHeadContent = testHead;
                    callback(err, file, testBody, testHead);
                });
        } else {
            callback(indexError, indexContent, testBodyContent, testHeadContent);
        }
    };
})();

var serveError = function(req, resp, err) {
    writeHead(req, resp, 500, defaultHeaders);
    resp.write(err + '\n');
    resp.end();
};

var serve404 = function(req, resp) {
    writeHead(req, resp, 404, defaultHeaders);
    resp.end('not found');
};

var serveFile = function(req, resp, filename) {
    fs.readFile(filename, function(err, data) {
        if (err) {
            serveError(req, resp, err);
            return;
        }
        writeHead(req, resp, 200, _.extend({}, defaultHeaders, {
            'Content-Type': contentType[extentsion(filename)],
            'Content-Length': data.length
        }));
        resp.write(data);
        resp.end();
    });
};

var serveIndex = function(req, resp, filename, config, tmpl) {
    readIndex(req, resp, filename, function(err, file, testBody, testHead) {
        var replaced,
            url = req.url.split('?')[0].replace(/^\//, ''),
            isTest = /test/i.test(req.url.split('?')[0]);
        if (err) {
            serveError(req, resp, err);
        }
        tmpl = tmpl || '';
        replaced = file
            .replace(/\{\{ head \}\}/g, isTest? testHead : '')
            .replace(/\{\{ body \}\}/g, isTest? testBody : '')
            .replace(/\{\{ jsPath \}\}/g, url)
            .replace(/\{\{ config \}\}/g, JSON.stringify(config))
            .replace(/\{\{ tmpl \}\}/g, tmpl);
        writeHead(req, resp, 200, _.extend({}, defaultHeaders, {
            'Content-Type': contentType.html,
            'Content-Length': Buffer.byteLength(replaced)
        }));
        resp.write(replaced);
        resp.end();
    });
};

exports.createServer = function(staticDir, config, tmpl) {
    config = extend(true,
        {baseUrl: '/' + path.basename(staticDir)},
        rjsConfig,
        config || {}
    );
    staticDir = path.resolve(staticDir);
    process.chdir(path.dirname(__filename));
    return http.createServer(function(req, resp) {
        var requested,
            url = req.url.split('?')[0],
            paths = [
                addJsExt(path.join(staticDir, url)),
                path.join(path.dirname(staticDir), url),
                path.join('.', url)
            ];
        async.filter(paths, path.exists, function(results) {
            requested = results[0];
            if (requested) {
                if (requested === paths[0]) {
                    serveIndex(req, resp, indexPath, config, tmpl);
                } else {
                    serveFile(req, resp, requested);
                }
            } else {
                serve404(req, resp);
            }
        });
    });
};

