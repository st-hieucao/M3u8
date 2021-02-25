console.log("Registered")

//CHACHE ALL FILES
let cacheData = "appv1"
this.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(cacheData).then((cacheres) => {
            cacheres.addAll([
                '/static/js/bundle.js',
                '/static/js/vendors~main.chunk.js',
                '/static/js/main.chunk.js',
                '/favicon.ico',
                '/index.html',
                '/',
                '/users',
                '/about'
            ])
        })
    )
})

//FETCH ALL IN OFFLINE MODE
this.addEventListener('fetch', (event) => {


    if (!navigator.onLine) {
        event.respondWith(
            caches.match(event.request).then((response) => {
                if (response) {
                    return response
                }
                let requestUrl = event.request.clone()
                fetch(requestUrl).then((res) => {
                    console.log(res)
                }).catch((err) => {
                    console.log(err)
                })

            })
        )
    }
})