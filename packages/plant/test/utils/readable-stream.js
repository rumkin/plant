class ReadableStreamMock {
  constructor(values) {
    this.values = values;
    this.reader = null;
  }

  get locked() {
    return this.reader !== null;
  }

  getReader() {
    if (this.locked) {
      throw new Error('Stream is locked');
    }

    const values = this.values.slice();
    this.reader = {
      read: async () => {
        if (values.length) {
          return {
            value: values.shift(),
            done: false,
          };
        }
        else {
          this.reader = null;
          return {
            value: undefined,
            done: true,
          };
        }
      },
      cancel: () => {
        this.cancel();
      },
      releaseLock: () => {
        this.reader = null;
        values.splice(0, values.length);
      },
    };

    return this.reader;
  }

  pipeTo() {}
  pipeThrough() {}
  tee() {}

  cancel() {
    if (this.reader) {
      this.reader.releaseLock();
    }
  }
}

exports.ReadableStream = ReadableStreamMock;
