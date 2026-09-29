import Fastify from 'fastify'


export const createServer = () => {
    const app = Fastify({
        logger: false,
    })

    app.post('/chat', {
        schema: {
            body: {
                type: 'object',
                required: ['question'],
                properties: {
                    question: { type: 'string', minLength: 3 },
                }
            }
        }

    }, async (request, reply) => {
        try {
            const { question } = request.body as { question: string }
            return reply.send('Hello teste ')
        } catch (error) {
            return reply.status(500).send({ error: 'Internal Server Error' })
        }
    })


    return app


}