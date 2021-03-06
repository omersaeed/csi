fs = require "fs"
{join, basename, resolve, normalize} = require "path"
exists = fs.existsSync or require('path').existsSync
extend = require "node.extend"
_ = require "underscore"
t = require "t"
wrench = require "wrench"
yaml = require "js-yaml"
testServer = require "./server"
child_process = require "child_process"

read = (fname, encoding="utf8") ->
  fs.readFileSync(fname, encoding)
write = (fname, content, encoding="utf8") ->
  fs.writeFileSync(fname, content, encoding)
pathSep = normalize("/")
argv = usage = null

pkgJson = (dir = ".") ->
  JSON.parse read(join(dir, "package.json"))

componentName = (dir = ".", json = null) ->
  (json or pkgJson(dir)).component?.name

sourceDirectory = (dir = ".") ->
  pkgJson(dir).component?.sourceDirectory || "src"

testTemplate = (dir = ".") ->
  tt = pkgJson(dir).component?.testTemplate
  if tt then read join(dir,tt) else ""

isComponent = (dir = ".", json = null) ->
  if json
    return not not componentName(dir, json)
  exists(join dir, "package.json") and (not not componentName(dir))

requirejsConfig = (filename, dir = ".") ->
  filename ||= join(dir, "requirejs-config.json")
  if exists filename then JSON.parse read(filename) else {}

makePathsAbsolute = (rjsConfigObj = {}, root = "components") ->
  fullPath = (root) -> root.replace /\/$/, ""
  rootBase = (root) -> basename(root).replace /\/$/, ""
  relativize = (pth, fn = rootBase) -> pth.replace /^\.(\/?)/, "#{fn(root)}$1"

  extend rjsConfigObj,
    paths: _.reduce(rjsConfigObj.paths or {}, ((memo, v, k) ->
      memo[relativize(k)] = relativize(v, fullPath)
      memo
    ), {})
    shim: _.reduce(rjsConfigObj.shim or {}, ((memo, shim, shimPath) ->
      memo[relativize shimPath] = extend shim,
        deps: _.map(shim.deps or [], (d) -> relativize(d))
      memo
    ), {})

addComponentToConfig = (rjsConfigObj = {}, dir = ".", root = "components") ->
  paths = {}
  paths[componentName()] = join root, componentName()
  extend true, {paths: paths}, rjsConfigObj

installTo = (tgtDir, link = false, src, name = null) ->
  src ||= sourceDirectory()
  name ||= componentName()
  if not exists join(tgtDir, name)
    if link
      log "link-installing #{name} to #{tgtDir}"
      orig = resolve process.cwd()
      process.chdir tgtDir
      # there's a chance that 'csi' is a dead link (so exists() returns false,
      # but there's actually a link in the directory).  remove that here.
      try
        fs.unlinkSync name
      fs.symlinkSync join(orig, src), name, "dir"
      process.chdir orig
    else
      log "installing #{name} to #{tgtDir}"
      wrench.copyDirSyncRecursive src, join(tgtDir, name)

allNodeModules = () ->
  modules = {}
  t.bfs directories = {path: "."}, (n) ->
    if exists join(n.path, "package.json")
      n.json = pkgJson n.path
    if exists join(n.path, "requirejs-config.json")
      n.config = requirejsConfig(null, n.path)
    modulesDir = join n.path, "node_modules"
    if exists modulesDir
      n.children = _(fs.readdirSync(modulesDir)).map((d) ->
        full = join modulesDir, d
        fs.statSync(full).isDirectory() and d isnt ".bin" and full
      ).filter(_.identity).map (d) -> {path: d}
  directories

allComponents = () ->
  results = []
  names = () -> component.json.name for component in results
  t.bfs allNodeModules(), (m) ->
    if m.json and isComponent(null, m.json) and m.json.name not in names()
      results.push(m)
  _.filter results, (m) -> m.path isnt "."

provide = (pth) ->
  if not exists pth
    log "recursively creating directory #{pth}"
    start = if pth[0] is pathSep then pathSep else ""
    _.reduce [start].concat(pth.split(pathSep)), (soFar, dir) ->
      fs.mkdirSync join(soFar, dir) if not exists(join(soFar, dir))
      soFar += (if soFar then pathSep else "") + dir

discoverTests = (dir) ->
  dir = argv.staticpath
  return [] if not exists dir
  results = []
  t.bfs dirTree = {path: "."}, (n) ->
    if /test[^\/]*\.js$/.test(n.path) and basename(n.path)[0] isnt "."
      results.push(n.path)
    if fs.statSync(join(dir, n.path)).isDirectory()
      n.children = fs.readdirSync(join(dir, n.path)).map (d) ->
        path: join n.path, d
  results

getConfig = (root = "components") ->
  components = allComponents()
  componentPath = (c) ->
    ret = {paths: {}}
    ret.paths[c.json.component.name] = join root, c.json.component.name
    ret
  componentConfig = (c) ->
    makePathsAbsolute(c.config, join(root, componentName(c.path)))
  thisComponentConfig = () ->
    if not isComponent() then return {}
    destPath = join(root, componentName())
    addComponentToConfig(makePathsAbsolute(requirejsConfig(), destPath))
  baseUrl = if argv.baseurlSpecified then {baseUrl: argv.baseurl} else {}
  extend.apply this, [true, baseUrl]
    .concat(componentPath(c) for c in components)
    .concat(componentConfig(c) for c in components)
    .concat([thisComponentConfig()])

getTestTemplate = () ->
  components = allComponents().concat([{path: "."}])
  (testTemplate(component.path) for component in components).join("\n")

getTestMiddleware = () ->
  components = allComponents()
  components.push({path: ".", json: pkgJson()}) if isComponent()
  require(resolve(join(component.path, component.json.component.testMiddleware))) \
    for component in components when component.json.component.testMiddleware

componentsPath = () ->
  join argv.staticpath, "components"

stringBundles = (dir = ".") ->
  stringsYml = join(dir, "strings.yml")
  stringsYaml = join(dir, "strings.yaml")
  if exists stringsYml
    yaml.load read(stringsYml)
  else if exists stringsYaml
    yaml.load read(stringsYaml)
  else
    {}

allStringBundles = () ->
  _.reduce(allComponents().concat([{path: "."}]), ((strings, component) ->
    extend true, strings, stringBundles(component.path)
  ), {})

stringBundlesAsRequirejsModule = () ->
  bundles = JSON.stringify(allStringBundles(), null, "    ")
    .replace(/\n/g, "\n      ")
  """
  <script>
    define('strings', [], function() {
        return #{bundles};
    });
  </script>
  """

defaultStaticpath = () ->
  json = try
    pkgJson()
  catch e
    {}
  base = json.component?.testDirectory or (exists("static") and ".") or ".test"
  join base, "static"

listTests = (tests, host, port) ->
  for test in tests
    console.log("http://#{host}:#{port}/#{test.replace(/\.js$/, "")}")

templateCommands =
  requirejs: (config) ->
    join config.baseUrl || '', config.paths.csi, "require.js"
  extra: () ->
    stringBundlesAsRequirejsModule()
  config: (config) ->
    JSON.stringify config, null, "    "
  all: (config) ->
    _.reduce(templateCommands, ((templateObj, cmd, name) ->
      return templateObj if name is "all"
      templateObj[name] = templateCommands[name](config)
      return templateObj
    ), {})

exports.commands = commands =
  install:
    description: """
    install component dependencies to [staticpath]
    """
    action: () ->
      provide argv.staticpath
      components = allComponents()
      provide componentsPath()
      for component in components
        src = join(component.path, sourceDirectory(component.path))
        name = componentName(null, component.json)
        installTo componentsPath(), argv.link, src, name
      if isComponent()
        installTo componentsPath(), argv.link, sourceDirectory(), componentName()

  doc:
    description: """
        builds client side code documentation
        """
    action: () ->
      log "building client side code docs"
      docco_lib = require.resolve('docco-husky')
      docco = docco_lib.substring(0, docco_lib.lastIndexOf "node_modules") +
              "node_modules/.bin/docco-husky"
      child_process.execFile(docco, [sourceDirectory()],
          (error, stdout, stderr) ->
            if error?
              console.log(error)
            else
              console.log(stdout)
      )

  test:
    description: """
    start up a test server
    """
    action: () ->
      components = allComponents()
      if argv.listtests
        return listTests(discoverTests(argv.staticpath), argv.host, argv.port)
      commands.install.action()
      tests = discoverTests argv.staticpath
      extraHtml = getTestTemplate() + "\n" + stringBundlesAsRequirejsModule()
      testServer.createServer(
          argv.staticpath,
          getConfig(),
          extraHtml,
          getTestMiddleware())
        .listen(argv.port, argv.host)
      log "serving at http://#{argv.host}:#{argv.port}"
      log "available tests:"
      listTests tests, argv.host, argv.port

  template:
    description: """
    output html snippets for things like the require.js path, can be any of:
    #{(' - ' + cmd + '\n' for cmd of templateCommands).join("")}
    """.replace(/\n$/, '')
    action: (cmd, args...) ->
      console.log templateCommands[cmd](getConfig())

  build:
    description: """
    the build command does two things:
     - run `component install`
     - if the [templatepath] is given, output a json file named
       [contextjsonname] to that path containing the keyed info from the
       `component template` command
    """
    action: () ->
      if resolve(argv.staticpath) isnt resolve(defaultStaticpath())
        log "installing default static path (#{defaultStaticpath()}) to #{argv.staticpath}"
        provide argv.staticpath
        wrench.copyDirSyncRecursive defaultStaticpath(), argv.staticpath

      commands.install.action()

      if argv.templatepath
        templateObj = templateCommands.all getConfig()
        provide argv.templatepath
        contextjsonname = join(argv.templatepath, argv.contextjsonname)
        log "writing context json to #{contextjsonname}"
        write contextjsonname, JSON.stringify(templateObj)

  completion:
    description: """
    spits out a bash completion command.  something you can run like this:
      $ component completion > /tmp/cc.bash && source /tmp/cc.bash
    """
    action: () ->
      console.log "complete -W \"#{(c for c of commands).join(" ")}\" component"

  uninstall:
    description: """
    just does the opposite of the `component install` command -- it removes
    directories (or links) from [staticpath] that would have been installed
    """
    action: () ->
      components = allComponents()
      if isComponent()
        components.push {json: {component: {name: componentName()}}}
      for component in components
        installedTo = join(componentsPath(), component.json.component.name)
        if exists installedTo
          if fs.lstatSync(installedTo).isSymbolicLink()
            log "removing link #{installedTo}"
            fs.unlinkSync installedTo
          else
            log "removing directory #{installedTo}"
            wrench.rmdirSyncRecursive installedTo

log = (msg, level="info") ->
  console.log "[#{basename process.argv[1]} #{argv._[0]}] #{msg}"

usage = """#{("node $0 "+cmd+'\n' for cmd of commands).join("")}
`component` is a utility that's used for installing javascript components and
their dependencies -- imagine that!

commands:

"""
for name, command of commands
  usage += "
  #{name}:\n
    #{command.description.replace(/\n/g, '\n    ')}\n"

exports.parseArgs = parseArgs = () ->
  argv = require("optimist")
    .usage(usage)

    .option "link",
      boolean: true
      alias: "l"
      describe: "install components as links (useful for dev.. on *nix systems)"

    .option "port",
      alias: "p"
      default: process.argv.PORT || 1335
      describe: "test server port, overrides $PORT env variable\n(cmd: test)"

    .option "host",
      alias: "H"
      default: process.argv.HOST || "localhost"
      describe: "test server host, overrides $HOST env variable\n(cmd: test)"

    .option "listtests",
      boolean: true
      describe: "just list tests\n(cmd: test)"

    .option "templatepath",
      string: true
      alias: "t"
      describe: "specify the templatepath\n(cmd: build)"

    .option "contextjsonname",
      string: true
      alias: "j"
      "default": "csi-context.json"
      describe: "specify the name of the context json\n(cmd: build)"

    .option "staticpath",
      string: true
      alias: "s"
      "default": defaultStaticpath()
      describe: """
      specify the installation path.  the default for this value is dynamically determined:
       - if there is a package.json file with a component.testDirectory property, staticpath is set to that
       - otherwise if the './static' directory exits, staticpath is set to 'static'
       - finally if nothing else component will create a '.test' directory and use it as the staticpath
       (cmd: build)
       """

    .option "baseurl",
      string: true
      alias: "b"
      "default": "/static"
      describe: "specify the baseurl\n(cmd: build)"

    .alias("h", "help")

    .wrap(80)

    .argv

  specified = (argName, shorthand) ->
    argv[argName+'Specified'] = _.any process.argv, (arg) ->
      RegExp('^-{1,2}' + argName).test(arg) or (arg is "-" + shorthand)

  specified("templatepath", "t")
  specified("staticpath", "s")
  specified("baseurl", "b")

  [argv, argv._[0]]


exports.run = () ->
  [argv, command] = parseArgs()
  if argv.help
    console.log require("optimist").help()
    process.exit 0
  if not commands[command]
    console.error "ERROR: command must be one of: #{k for k,v of commands}\n"
    require("optimist").showHelp()
    process.exit 1

  commands[command].action(argv._[1..]...)

