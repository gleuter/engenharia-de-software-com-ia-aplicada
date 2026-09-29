import { createServer } from "./server.ts";

const app = createServer()

app.listen({ port: 3000, host: '0.0.0.0' })
app.log.info(`Server is running at http://localhost:3000`) 

app.inject({
    method: 'POST',
    url: '/chat',
    body: {
        question: 'Hello world'
    }
}).then(response => {
    console.log('Response status:', response.statusCode)
    console.log('Response body: ', response.body)
})