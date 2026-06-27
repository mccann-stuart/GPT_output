function makeR2Object(key, value, options = {}, etag = `"etag-${key}"`) {
  return {
    key,
    etag,
    httpEtag: etag,
    uploaded: new Date('2026-05-08T00:00:00.000Z'),
    body: value,
    httpMetadata: options.httpMetadata || {},
    writeHttpMetadata(headers) {
      if (this.httpMetadata.contentType) {
        headers.set('content-type', this.httpMetadata.contentType);
      }
      if (this.httpMetadata.cacheControl) {
        headers.set('cache-control', this.httpMetadata.cacheControl);
      }
    },
  };
}

export function makeR2Bucket(initialObjects = {}) {
  const objects = new Map();
  for (const [key, value] of Object.entries(initialObjects)) {
    objects.set(key, makeR2Object(key, value));
  }
  return {
    objects,
    puts: [],
    async put(key, value, options = {}) {
      const object = makeR2Object(key, value, options, `"etag-${this.puts.length + 1}"`);
      this.objects.set(key, object);
      this.puts.push({ key, value, options });
      return object;
    },
    async get(key) {
      return this.objects.get(key) || null;
    },
    async list({ prefix = '' } = {}) {
      const listedObjects = [...this.objects.values()]
        .filter((object) => object.key.startsWith(prefix))
        .map((object) => ({ key: object.key, etag: object.etag, uploaded: object.uploaded }));
      return {
        objects: listedObjects,
        truncated: false,
      };
    },
  };
}
