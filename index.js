const R = require('ramda')

var axios = null,
    watcher = null,
    watcherParams = {},
    interceptors = {}

function useWatcher(axios, watcher, watcherParams) {

    axios = axios
    watcher = watcher
    watcherParams = watcherParams

    var requestInterceptor = axios.interceptors.request.use(function (config) {

        // generate the emit pair, 
        // and use config to send emitRes to axios.interceptors.response's callback
        var { emitReq, emitRes } = watcher(watcherParams)
        config.__emitRes__ = emitRes

        // generate the emitReq params
        var { headers, method, url, data } = config
        headers = R.isEmpty(headers[method]) ? headers.common : headers[method]

        // send request to request-watcher-server
        emitReq({ headers, method, url, params: data })

        return config
    }, function (error) {
        return Promise.reject(error)
    })

    var responseInterceptor = axios.interceptors.response.use(function (response) {
        // generate the emitRes params
        var { status, headers, data } = response

        // send response to request-watcher-server
        response.config.__emitRes__({ status, headers, data })

        return response
    }, function (error) {
        return Promise.reject(error)
    })
    interceptors = { requestInterceptor, responseInterceptor }
}

// function unuseWatcher() {
//     axios.interceptors.request.eject(interceptors.requestInterceptor)
//     axios.interceptors.response.eject(interceptors.responseInterceptor)
// }

module.exports = useWatcher
