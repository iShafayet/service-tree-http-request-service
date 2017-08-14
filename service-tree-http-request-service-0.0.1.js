

/* HttpRequestService adds HttpRequestService to service tree */
(function () {

  let {
    StandardEvent,
    EventEmitter,
    ServiceManager,
    Service
  } = window.ServiceTree;

  class HttpRequestService extends Service {

    constructor(method, url, options = {}) {
      super();
      let {
      headers = {},
        responseType = 'text'
    } = options;
      Object.assign(this, { method, url, headers, responseType });
      this._hasErrorBeenNotified = false;
    }

    _serialize(content) {
      return JSON.stringify(content);
    }

    _deserialize(content) {
      return JSON.parse(content);
    }

    _onLoad() {
      let {
      status: statusCode,
        responseText: body
    } = this._xmlHttpRequest;

      let error = null;
      if (this.responseType === 'json') {
        try {
          body = this._deserialize(body);
        } catch (ex) {
          error = ex;
        }
      }
      if (error) {
        return this._onError(true, error);
      }

      this.emit('progress', new StandardEvent({
        name: 'progress',
        detail: {
          progress: 1
        }
      }));
      this.emit('load', new StandardEvent({
        name: 'load',
        detail: {
          statusCode, body
        }
      }));
      this.emit('end', new StandardEvent({
        name: 'end',
        detail: {
          resolution: 'success',
          statusCode,
          body
        }
      }));
      this._serviceEnd();
    }

    _onAbort() {
      this.emit('progress', new StandardEvent({
        name: 'progress',
        detail: {
          progress: 0
        }
      }));
      this.emit('abort', new StandardEvent({
        name: 'abort',
        detail: {
        }
      }));
      this.emit('end', new StandardEvent({
        name: 'end',
        detail: {
          resolution: 'abort'
        }
      }));
      this._serviceEnd();
    }

    _onError(isParseError = false, parseError = null) {
      if (this._hasErrorBeenNotified) return;
      this._hasErrorBeenNotified = true;
      this.emit('progress', new StandardEvent({
        name: 'progress',
        detail: {
          progress: 0
        }
      }));
      this.emit('error', new StandardEvent({
        name: 'error',
        detail: {
          isParseError,
          parseError
        }
      }));
      this.emit('end', new StandardEvent({
        name: 'end',
        detail: {
          resolution: 'error',
          isParseError,
          parseError
        }
      }));
      this._serviceEnd();
    }

    _onUploadProgress(event) {
      if (event.lengthComputable) {
        let progress = event.loaded / event.total;
        this.emit('upload-progress', new StandardEvent({
          name: 'upload-progress',
          detail: {
            loaded: event.loaded,
            total: event.total,
            progress
          }
        }));
        this.emit('progress', new StandardEvent({
          name: 'progress',
          detail: {
            progress: (Math.round((progress / 2) * 100) / 100)
          }
        }));
      }
    }

    _onDownloadProgress(event) {
      if (event.lengthComputable) {
        let progress = event.loaded / event.total;
        this.emit('download-progress', new StandardEvent({
          name: 'download-progress',
          detail: {
            loaded: event.loaded,
            total: event.total,
            progress
          }
        }));
        this.emit('progress', new StandardEvent({
          name: 'progress',
          detail: {
            progress: 0.5 + (Math.round((progress / 2) * 100) / 100)
          }
        }));
      }
    }

    request(...args) {
      let [body = null, type = null] = args.reverse()

      if (type === null) {
        if (typeof (body) === 'object' && body !== null) {
          type = 'json';
        } else {
          type = 'text';
        }
      }

      this._xmlHttpRequest = new XMLHttpRequest();

      this._xmlHttpRequest.onload = (_ => this._onLoad());
      this._xmlHttpRequest.onabort = (_ => this._onAbort());
      this._xmlHttpRequest.upload.onabort = (_ => this._onAbort());
      this._xmlHttpRequest.onerror = (_ => this._onError());
      this._xmlHttpRequest.upload.onerror = (_ => this._onError());
      this._xmlHttpRequest.onprogress = (event => this._onDownloadProgress(event));
      this._xmlHttpRequest.upload.onprogress = (event => this._onUploadProgress(event));

      this._xmlHttpRequest.open(this.method, this.url, true);

      if (body === null) {
        this.payload = null;
      } else {
        this.payload = this._serialize(body);
        if (type === 'json') {
          this._xmlHttpRequest.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        } else {
          this._xmlHttpRequest.setRequestHeader("Content-Type", "text/plain;charset=UTF-8");
        }
      }

      for (let key in this.headers) {
        this._xmlHttpRequest.setRequestHeader(key, this.headers[key]);
      }

      if (body === null) {
        this._xmlHttpRequest.send();
      } else {
        this._xmlHttpRequest.send(this.payload);
      }

      this.emit('start', new StandardEvent({
        name: 'start',
        detail: {
          url: this.url,
          payload: this.payload
        }
      }));
      this.emit('progress', new StandardEvent({
        name: 'progress',
        detail: {
          progress: 0
        }
      }));

      this._serviceStart();
    }
  }

  window.ServiceTree.HttpRequestService = HttpRequestService;

})();