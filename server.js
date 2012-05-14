var http = require('http'),
    path = require('path'),
    os = require('os'),
    fs = require('fs'),
	url = require('url'),
    tty = require('tty'),
    colors = require('colors'),
    _ = require('underscore'),
    async = require('async'),
    extend = require('node.extend'),
    indexPath = path.resolve(path.join(__dirname, 'templates/index.mtpl'));

var contentType = {
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript'
};

var defaultHeaders = {
    'Content-Type': 'text/plain',
    'Cache-Control': 'must-revalidate, no-cache'
};

var writeHead = function(req, resp, statusCode, headers) {
    var d = new Date(),
        seconds = d.getSeconds() < 10? '0' + d.getSeconds() : d.getSeconds(),
        datestring = d.getHours() + ':' + d.getMinutes() + ':' + seconds,
        line = datestring + ' [' + statusCode + ']: ' + req.url,
        colorized = line;
    if (tty.isatty(process.stdout.fd)) {
        colorized = (+statusCode) >= 500? line.red.bold :
                    (+statusCode) >= 400? line.red : line;
    }
    console.log(colorized);
    resp.writeHead(statusCode, headers);
};

var readIndex = (function() {
    var compiled, error;
    return function(req, resp, indexPath, callback) {
        if (typeof compiled === 'undefined') {
			fs.readFile(indexPath, 'utf8', function(err, file) {
				callback(error = err, compiled = _.template(file || ''));
			});
        } else {
			callback(error, compiled);
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
            if (err.code === 'ENOENT') {
                serve404(req, resp);
            } else {
                serveError(req, resp, err);
            }
            return;
        }
        writeHead(req, resp, 200, _.extend({}, defaultHeaders, {
            'Content-Type': contentType[path.extname(filename).slice(1)],
            'Content-Length': data.length
        }));
        resp.write(data);
        resp.end();
    });
};

var serveIndex = function(req, resp, pathname, config, extra) {
    readIndex(req, resp, indexPath, function(err, compiled) {
        var content, csiPath = path.join(config.baseUrl, config.paths.csi),
			isTest = /test/i.test(req.url.split('?')[0]);

        if (err) {
            serveError(req, resp, err);
			return;
        }

		content = compiled({
			isTest: isTest,
			qunitCss: path.join(csiPath, 'qunit.css'),
			qunitJs: path.join(csiPath, 'qunit.js'),
			requireJs: path.join(csiPath, 'require.js'),
			extra: extra || '',
			config: JSON.stringify(config, null, " "),
			jsPath: pathname
		});

        writeHead(req, resp, 200, _.extend({}, defaultHeaders, {
            'Content-Type': contentType.html,
            'Content-Length': Buffer.byteLength(content)
        }));
        resp.write(content);
        resp.end();
    });
};

exports.createServer = function(staticDir, config, extra) {
	staticDir = typeof staticDir === 'undefined'? './' : staticDir;
	config = extend(true, {
		baseUrl: '/' + path.basename(path.resolve(staticDir))
	}, config || {});
	return http.createServer(function(req, resp) {
		var filename, u = url.parse(req.url, true),
			requested = path.join(config.baseUrl || '', u.pathname + '.js');
		if (!/\.[a-z0-9]+$/i.test(u.pathname)) {
			filename = path.join(path.dirname(staticDir), requested);
			path.exists(filename, function(exists) {
				if (exists) {
					serveIndex(req, resp, u.pathname.replace(/^\//, ''), config, extra);
				} else {
					serve404(req, resp);
				}
			});
		} else {
			filename = path.join(path.dirname(staticDir), u.pathname);
			serveFile(req, resp, filename);
		}
	});
};
