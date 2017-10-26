const R = require('ramda')
const md5 = require('md5')

var axios = null,
    watcher = null,
    interceptors = {},
    emitPair = {}

function axiosWatcher(axios, watcher) {

    axios = axios
    watcher = watcher

    var requestInterceptor, responseInterceptor
    requestInterceptor = axios.interceptors.request.use(function (config) {

        // generate the emit pair, 
        // and use config to send emitRes to axios.interceptors.response's callback
        var { emitReq, emitRes } = watcher()
        const uuid = generateRandom()
        emitPair[uuid] = {
          emitReq, emitRes
        }

        // generate the emitReq params
        var { headers, method, url, data } = config
        headers = R.isEmpty(headers[method]) ? headers.common : headers[method]

        // to use in related response
        if (config.url !== watcher.global.origin + '/receiver') {
            config.data.__emit_uuid__ = uuid
            emitReq({ headers, method, url, params: data }).catch(error => console.log(error))
        }

        return config
    }, function (error) {
        return Promise.reject(error)
    })

    responseInterceptor = axios.interceptors.response.use(function (response) {
        // generate the emitRes params
        var { status, headers, data } = response

        // send response to request-watcher-server
        const uuid = JSON.parse(response.config.data).__emit_uuid__
        if (emitPair[uuid]) {
            emitPair[uuid].emitRes({ status, headers, data }).catch(error => console.log(error))
            // can not delete prop in strict mode, then we just set it to null
            try {
                delete emitPair[uuid]
            } catch (err) {
                console.log(err)
                emitPair[uuid] = null
            }
        }

        return response
    }, function (error) {
        return Promise.reject(error)
    })
    interceptors = { requestInterceptor, responseInterceptor }
}

function generateRandom() {
    return md5(new Date().toString() + Math.random())
}

module.exports = R.curry(axiosWatcher)
