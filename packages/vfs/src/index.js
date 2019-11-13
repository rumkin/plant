const path = require('path')
const escapeHtml = require('escape-html')
const mime = require('mime')

/**
 * @typedef DirOptions
 * @property {boolean} [redirect=true] Should links be resolved or redirected.
 * @property {boolean} [listDir=false] Should directories content be listable.
 * @property {Function<Boolean>} [filter] Filepath filter. When returns false, the file will not be available or listed.
 * @property {string} [indexFile="index.html"] Specify the name of index file.
 */

/**
 * @typedef FileOptions
 * @property {string} mimetype Overwrite filepath mime type.
 */

/**
 * Create directory Plant web handler.
 *
 * @param {VFS} fs Filesystem API object.
 * @param {string} dir Serving directory path.
 * @param {DirOptions} options Handler options.
 * @returns {Function} Plant handler function.
 */
function createDirHandler(fs, dir, {
  redirect = true,
  listDir = false,
  filter = () => true,
  indexFile = 'index.html',
} = {}) {
  return function(ctx) {
    return handleDir({
      ...ctx,
      fs,
      options: {
        dir,
        redirect,
        listDir,
        filter,
        indexFile,
      },
    })
  }
}

async function handleDir(ctx) {
  const {
    res,
    route,
    fs,
    options: {dir, filter, indexFile, listDir, redirect},
  } = ctx

  const filename = path.resolve('/', route.path)
  const {basePath} = route

  if (filter(filename) !== true) {
    return
  }

  const resource = await resolveResource(fs, {
    dir,
    basePath,
    filename,
    resolveLinks: !redirect,
    listDir,
    indexFile,
    isNested: false,
  })

  if (! resource) {
    return
  }

  switch (resource.type) {
  case 'file':
    await sendFile({...ctx, resource})
    return
  case 'dir':
    if (listDir) {
      await sendDir({...ctx, resource})
    }
    return
  case 'link':
    if (redirect) {
      res.redirect(resource.target)
    }
    return
  }
}

/**
 * Create directory Plant web handler.
 *
 * @param {VFS} fs Filesystem API object.
 * @param {string} filename Serving file path.
 * @param {FileOptions} options Handler options.
 * @returns {Function} Plant handler function.
 */
function createFileHandler(fs, filename, {
  mimetype,
} = {}) {
  return function (ctx) {
    return handleFile({
      ...ctx,
      fs,
      options: {
        dir: path.dirname(filename),
        filename: path.join('/', path.basename(filename)),
        mimetype,
      },
    })
  }
}

async function handleFile(ctx) {
  const {
    fs,
    options: {dir, filename, mimetype},
  } = ctx

  let resource = await resolveResource(fs, {
    dir,
    basePath: '/',
    filename,
    resolveLinks: true,
    listDir: false,
  })

  if (! resource || resource.type !== 'file') {
    return
  }

  if (mimetype !== void 0) {
    resource = {
      ...resource,
      mimetype,
    }
  }

  return sendFile({
    ...ctx,
    resource,
  })
}

async function sendDir({res, req, fs, resource, options}) {
  const files = (await readDir(fs, resource.filepath))
  .filter((filename) => options.filter(filename))

  const result = renderDir(req.type(['json', 'text']), files)

  res.headers.set('content-type', result.type)
  res.headers.set('content-length', result.size)
  res.body = result.body
}

function renderDir(type, files) {
  switch (type) {
  case 'json': {
    return createResponse({
      type: 'application/json',
      body: JSON.stringify(renderDirAsJson(files)),
    })
  }
  case 'text': {
    return createResponse({
      type: 'text/plain',
      body: renderDirAsText(files),
    })
  }
  default:
    return createResponse({
      type: 'text/html',
      body: renderDirAsHtml(files),
    })
  }
}

function createResponse({type, size, body}) {
  return {
    type,
    size: size === void 0 ? body.length : size,
    body,
  }
}

async function resolveResource(fs, {
  dir,
  basePath,
  filename,
  resolveLinks,
  listDir,
  indexFile,
  isNested,
}) {
  const filepath = path.join(dir, filename)

  let stat
  try {
    stat = await fs.lstat(filepath)
  }
  catch (err) {
    if (err.code === 'ENOENT') {
      return
    }
    else {
      throw err
    }
  }

  if (stat.isDirectory()) {
    if (isNested) {
      return
    }
    else if (indexFile) {
      return resolveResource(fs, {
        dir,
        basePath,
        filename: path.join(filename, indexFile),
        listDir,
        indexFile,
        isNested: true,
      })
    }
    else if (listDir) {
      return {
        type: 'dir',
        stat,
        filename,
      }
    }
    else {
      return
    }
  }
  else if (stat.isFile()) {
    return {
      type: 'file',
      stat,
      filename,
      mimetype: mime.getType(filename),
    }
  }
  else if (stat.isSymbolicLink()) {
    const dest = path.resolve(dir, await fs.readLink(filepath))

    if (! dest.startsWith(`${dir}/`)) {
      return
    }

    if (resolveLinks) {
      return resolveResource(fs, {
        dir,
        basePath,
        filename: path.join(basePath, dest.slice(dir.length + 1)),
        listDir,
        indexFile,
        isNested,
      })
    }
    else {
      return {
        type: 'link',
        stat,
        filename,
        target: path.join(basePath, dest.slice(dir.length + 1)),
      }
    }
  }
}

function renderDirAsJson(files) {
  return files.map((file) => ({
    filename: file.isDirectory() ? `${file.name}/` : file.name,
    size: file.size,
  }))
}

function renderDirAsText(files) {
  return files.map((stat) => getFileName(stat.name)).join('\n')
}

function renderDirAsHtml(files) {
  const filesStr = files.map(
    stat => '<li>'+ escapeHtml(getFileName(stat)) + '</li>'
  )
  .join('')
  return '<!DOCTYPE html><html><head></head><body><ul>' + filesStr + '</ul></body></html>'
}

function getFileName(stat) {
  if (stat.isDirectory()) {
    return stat.name + '/'
  }
  else {
    return stat.name
  }
}

async function readDir(fs, dir) {
  const files = await fs.readDir(dir)

  const stat = await Promise.all(
    files.map((file) => fs.stat(
      path.join(dir, file)
    ))
  )

  return stat
}

async function sendFile({
  fs,
  res,
  resource,
}) {
  res.headers.set('content-type', resource.mimetype)
  res.headers.set('content-length', resource.stat.size)
  const stream = fs.createReadStream(resource.filename)
  res.stream(stream)
}

exports.createDirHandler = createDirHandler
exports.createFileHandler = createFileHandler
exports.handleDir = handleDir
exports.handleFile = handleFile
exports.resolveResource = resolveResource
