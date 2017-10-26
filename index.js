const R = require('ramda')
const md5 = require('md5')

var axios = null,
    watcher = null,
    watcherParams = {},
    interceptors = {},
    emitPair = {}

function useWatcher(axios, watcher, watcherParams) {

    axios = axios
    watcher = watcher
    watcherParams = watcherParams

    var requestInterceptor = axios.interceptors.request.use(function (config) {

        // generate the emit pair, 
        // and use config to send emitRes to axios.interceptors.response's callback
        var { emitReq, emitRes } = watcher(watcherParams)
        const uuid = generateRandom()
        emitPair[uuid] = {
          emitReq, emitRes
        }

        // generate the emitReq params
        var { headers, method, url, data } = config
        headers = R.isEmpty(headers[method]) ? headers.common : headers[method]

        // to use in related response
        config.data.__emit_uuid__ = uuid

        // send request to request-watcher-server
        axios.interceptors.request.eject(requestInterceptor)
        axios.interceptors.response.eject(responseInterceptor)
        emitReq({ headers, method, url, params: data })
        axios.interceptors.request.use(requestInterceptor)
        axios.interceptors.response.use(responseInterceptor)

        return config
    }, function (error) {
        return Promise.reject(error)
    })

    var responseInterceptor = axios.interceptors.response.use(function (response) {
        // generate the emitRes params
        var { status, headers, data } = response

        // send response to request-watcher-server
        const uuid = JSON.parse(response.config.data).__emit_uuid__
        axios.interceptors.request.eject(requestInterceptor)
        axios.interceptors.response.eject(responseInterceptor)
        emitPair[uuid].emitRes({ status, headers, data })
        emitPair[uuid] = null
        axios.interceptors.request.use(requestInterceptor)
        axios.interceptors.response.use(responseInterceptor)

        return response
    }, function (error) {
        return Promise.reject(error)
    })
    interceptors = { requestInterceptor, responseInterceptor }
}

function generateRandom() {
    return md5(new Date().toString() + Math.random())
}

// function unuseWatcher() {
//     axios.interceptors.request.eject(interceptors.requestInterceptor)
//     axios.interceptors.response.eject(interceptors.responseInterceptor)
// }

module.exports = useWatcher
