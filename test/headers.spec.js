const should = require('should');

const {Headers} = require('..');

describe('Headers()', function() {
  describe('Headers.Header()', function() {
    it('Should add headers from object', function() {
      const headers = new Headers({
        prop: 'value',
      });

      should(headers.has('prop')).be.True();
      should(headers.get('prop')).be.equal('value');
    });

    it('Should add headers from entries', function() {
      const headers = new Headers([
        ['entry', 'value'],
      ]);

      should(headers.has('entry')).be.True();
      should(headers.get('entry')).be.equal('value');
    });
  });

  describe('Headers.set()', function() {
    it('Should add new value', function() {
      const headers = new Headers();

      headers.set('type', 'test');
      should(headers.get('type')).be.equal('test');
    });

    it('Should overwrite existing value', function() {
      const headers = new Headers({
        type: 'test',
      });

      headers.set('type', 'new value');
      should(headers.get('type')).be.equal('new value');
    });
  });

  describe('Headers.append()', function() {
    it('Should add new value', function() {
      const headers = new Headers();

      headers.append('type', 'test');
      should(headers.get('type')).be.equal('test');
    });

    it('Should append to existing value', function() {
      const headers = new Headers({
        type: 'value1',
      });

      headers.append('type', 'value2');
      should(headers.get('type')).be.equal('value1, value2');
    });
  });

  describe('Headers.has()', function() {
    it('Should return `true` when header exists', function() {
      const headers = new Headers();

      headers.set('test', 'value');
      should(headers.has('test')).be.True();
    });

    it('Should return `false` when header not exists', function() {
      const headers = new Headers();

      should(headers.has('test')).be.False();
    });

  });

  describe('Headers.delete()', function() {
    it('Should delete existing header', function() {
      const headers = new Headers({
        test: 'value',
      });

      should(headers.has('test')).be.True();

      headers.delete('test');

      should(headers.has('test')).be.False();
    });
  });

  describe('Headers.keys()', function() {
    it('Should return list of header names', function() {
      const headers = new Headers({
        'content-type': 'text/plain',
        'content-length': '5',
      });

      const list = Array.from(headers.keys());

      should(list).be.deepEqual([
        'content-type',
        'content-length',
      ]);
    });
  });

  describe('Headers.values()', function() {
    it('Should return list of header names', function() {
      const headers = new Headers({
        'content-type': 'text/plain',
        'content-length': '5',
      });

      const list = Array.from(headers.values());

      should(list).be.deepEqual([
        'text/plain',
        '5',
      ]);
    });

    it('Should return concatenated string for multiple header values', function() {
      const headers = new Headers();

      headers.append('accept-encoding', 'gzip');
      headers.append('accept-encoding', 'deflate');

      const list = Array.from(headers.values());

      should(list).be.deepEqual(['gzip, deflate']);
    });
  });

  describe('Headers.entires()', function() {
    it('Should contain all headers', function() {
      const headers = new Headers({
        'content-type': 'text/plain',
        'content-length': '5',
      });

      const list = Array.from(headers.entries());

      should(list).be.deepEqual([
        ['content-type', 'text/plain'],
        ['content-length', '5'],
      ]);
    });

    it('Should return concatenated string for multiple header values', function() {
      const headers = new Headers();

      headers.append('accept-encoding', 'gzip');
      headers.append('accept-encoding', 'deflate');

      const list = Array.from(headers.entries());

      should(list).be.deepEqual([
        ['accept-encoding', 'gzip, deflate'],
      ]);
    });
  });

  describe('Headers.forEach()', function() {
    it('Should iterate over stringified values', function() {
      const headers = new Headers({
        'content-type': 'text/plain',
        'content-length': '5',
      });

      const list = [];

      headers.forEach((value, key) => list.push([key, value]));

      should(list).be.deepEqual([
        ['content-type', 'text/plain'],
        ['content-length', '5'],
      ]);
    });
  });

  describe('Headers.raw()', function() {
    it('Should return array for multiple header values', function() {
      const headers = new Headers();

      headers.append('accept-encoding', 'gzip');
      headers.append('accept-encoding', 'deflate');

      const list = headers.raw('accept-encoding');

      should(list).be.deepEqual(['gzip', 'deflate']);
    });
    it('Should return empty array for missing header', function() {
      const headers = new Headers();

      const list = headers.raw('accept-encoding');

      should(list).be.deepEqual([]);
    });
  });
});
