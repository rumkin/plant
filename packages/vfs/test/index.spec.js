const assert = require('assert')

const {Request, Response, Route} = require('@plant/plant')

const {
  createDirHandler,
  createFileHandler,
} = require('..')

const {createFs, readStream} = require('./lib/fs')

function createCtx({
  url = new URL('http://localhost/'),
} = {}) {
  const req = new Request({
    url,
  })
  const res = new Response({
    url,
  })
  const route = new Route()

  return {req, res, route}
}

module.exports = ({describe, it}) => {
  describe('createDirHandler()', () => {
    it('Should serve file', async () => {
      const ctx = createCtx(new URL('http://localhost/index.html'))

      const vfs = createFs()
      const file = {
        name: '/index.html',
        content: '<html><body>Hello</body></html>',
      }
      await vfs.writeFile(file.name, file.content)

      const handle = createDirHandler(vfs, '/')

      await handle(ctx)
      const {res} = ctx

      assert.equal(res.headers.get('content-type'), 'text/html', 'Content-type header is text/html')

      const body = await readStream(res.body, 'utf8')

      assert.equal(body, file.content, 'Response body matches')
    })

    it('Should use options.indexFile', async () => {
      const ctx = createCtx(new URL('http://localhost/'))

      const vfs = createFs()
      const file = {
        name: '/test.html',
        content: '<html><body>Hello</body></html>',
      }
      await vfs.writeFile(file.name, file.content)

      const handle = createDirHandler(vfs, '/', {
        indexFile: '/test.html',
      })

      await handle(ctx)
      const {res} = ctx

      assert.equal(res.headers.get('content-type'), 'text/html', 'Content-type header is text/html')

      const body = await readStream(res.body, 'utf8')

      assert.equal(body, file.content, 'Response body matches')
    })

    it('Should serve nothing', async () => {
      const ctx = createCtx(new URL('http://localhost/'))

      const vfs = createFs()
      const file = {
        name: '/test.html',
        content: '<html><body>Hello</body></html>',
      }
      await vfs.writeFile(file.name, file.content)

      const handle = createDirHandler(vfs, '/')

      await handle(ctx)
      const {res} = ctx

      assert.equal(res.hasBody, false, 'No body was set')
    })
  })

  describe('createFileHandler()', () => {
    it('Should serve file', async () => {
      const ctx = createCtx(new URL('http://localhost/index.txt'))

      const vfs = createFs()
      const file = {
        name: '/index.txt',
        content: 'Hello',
      }
      await vfs.writeFile(file.name, file.content)

      const handle = createFileHandler(vfs, '/index.txt')

      await handle(ctx)
      const {res} = ctx

      assert.equal(res.headers.get('content-type'), 'text/plain', 'Content-type header is text/plain')

      const body = await readStream(res.body, 'utf8')
      assert.equal(body, file.content, 'File content matches')
    })
  })
}
