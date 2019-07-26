const path = require('path')
const escapeHtml = require('escape-html')
const mime = require('mime')

function createDirHandler(fs, dir, {
  redirect = true,
  listDir = false,
  indexFile = 'index.html',
} = {}) {
  return async function handleDir({req, res, route}) {
    const filename = path.resolve('/', route.path)
    const {basePath} = route

    if (! await fs.exists(path.join(dir, filename))) {
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
      await sendFile(fs, path.join(dir, resource.filename), mime.getType(resource.filename), res)
      return
    case 'dir':
      if (listDir) {
        await sendDir(fs, resource.filepath, req.type(['json', 'text']), res)
      }
      return
    case 'link':
      if (redirect) {
        res.redirect(resource.target)
      }
      return
    }
  }
}

function createFileHandler(fs, filename, {
  mimetype,
} = {}) {
  if (! mimetype) {
    mimetype = mime.getType(filename)
  }
  return function serveFile({res}) {
    return sendFile(fs, filename, mimetype, res)
  }
}

async function sendDir(fs, filepath, contentType, res) {
  const files = await readDir(fs, filepath)

  switch (contentType) {
  case 'json': {
    res.json(renderDirAsJson(files))
    break
  }
  case 'text': {
    res.json(renderDirAsText(files))
    break
  }
  default:
    res.html(renderDirAsHtml(files))
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
  const stat = await fs.lstat(filepath)

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
  return '<!DOCTYPE html><html><head></head><body><ul>' + files.map(
    stat => '<li>'+ escapeHtml(getFileName(stat)) + '</li>'
  ).join('') + '</ul></body></html>'
}

function getFileName(stat) {
  if (stat.isDirectory()) {
    return stat.name + '/'
  }
  else {
    return stat.name
  }
}

exports.createDirHandler = createDirHandler
exports.createFileHandler = createFileHandler

async function readDir(fs, dir) {
  const files = await fs.readDir(dir)

  const stat = await Promise.all(
    files.map((file) => fs.stat(
      path.join(dir, file)
    ))
  )

  return stat
}

async function sendFile(fs, filename, mimetype, res) {
  if (! await fs.exists(filename)) {
    return
  }

  const stat = await fs.stat(filename)
  res.headers.set('content-type', mimetype)
  res.headers.set('content-length', stat.size)
  const stream = fs.createReadStream(filename)
  res.stream(stream)
}
