var R = require('ramda')
var md5 = require('md5')
var axios = window && window.axios || require('axios')

var watcher = null,
    interceptors = {},
    emitPair = {}

function axiosWatcher(watcher) {

    watcher = watcher

    var requestInterceptor, responseInterceptor
    requestInterceptor = axios.interceptors.request.use(function (config) {
        try {
            // generate the emit pair, 
            var { emitReq, emitRes } = watcher()
            const uuid = generateRandom()
            emitPair[uuid] = {
            emitReq, emitRes
            }

            // generate the emitReq params
            var { headers = {}, method, url, data, params } = config
            headers = R.isEmpty(headers[method]) ? headers.common : headers[method]

            // use config to send emitRes to axios.interceptors.response's callback
            // to use in related response
            if (config.url !== watcher.global.origin + '/receiver') {
                if (!config.data) config.data = {}
                if (!config.params) config.params = {}
                config.__emit_uuid__ = uuid
                emitReq({ headers, method, url, params: R.merge(data, params) }).catch(error => console.log(error))
            }
        } catch (err) {
            console.error(err)
        } finally {
            return config
        }

    }, function (error) {
        return Promise.reject(error)
    })

    responseInterceptor = axios.interceptors.response.use(function (response) {
        try {
            var { status, headers, data } = response

            // send response to request-watcher-server
            // const uuid = JSON.parse(response.config.data).__emit_uuid__
            const uuid = response.config.__emit_uuid__
            if (emitPair[uuid]) {
                emitPair[uuid].emitRes({ status, headers, data }).catch(error => console.log(error))
                // can not delete prop in strict mode, then we just set it to null
                try {
                    delete emitPair[uuid]
                } catch (err) {
                    console.log('[request-watcher-axios] you are in strict mode, cannot delete prop')
                    emitPair[uuid] = null
                }
            }
        } catch (err) {
            console.error(err)
        } finally {
            return response
        }
    }, function (error) {

        var response = error.response
        try {
            var { status, headers, data } = response // response may be undefined

            // send response to request-watcher-server
            var uuid = response.config.__emit_uuid__
            if (emitPair[uuid]) {
                emitPair[uuid].emitRes({ status, headers, data }).catch(error => console.log(error))
                // can not delete prop in strict mode, then we just set it to null
                try {
                    delete emitPair[uuid]
                } catch (err) {
                    console.log('[request-watcher-axios] you are in strict mode, cannot delete prop')
                    emitPair[uuid] = null
                }
            }
        } catch (err) {
            return Promise.reject(error)
        } finally {
            return Promise.reject(error)
        }
    })
    interceptors = { requestInterceptor, responseInterceptor }
}

function generateRandom() {
    return md5(new Date().toString() + Math.random())
}

module.exports = axiosWatcher
