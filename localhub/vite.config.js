import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      vue(),
      {
        name: 'chat-api-middleware',
        configureServer(server) {
          server.middlewares.use('/api/chat', (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405
              res.end('Method Not Allowed')
              return
            }

            let body = ''
            req.on('data', (chunk) => {
              body += chunk
            })

            req.on('end', async () => {
              try {
                const { message, context } = JSON.parse(body)

                const systemPrompt = `당신은 서울 지역정보 안내 챗봇입니다. 아래 데이터만 근거로 답변하세요:\n${JSON.stringify(
                  context?.items ?? [],
                )}`

                const openaiRes = await fetch(
                  'https://api.openai.com/v1/chat/completions',
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${env.OPEN_API_KEY}`,
                    },
                    body: JSON.stringify({
                      model: 'gpt-5-mini',
                      messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: message },
                      ],
                    }),
                  },
                )

                const data = await openaiRes.json()

                if (!openaiRes.ok) {
                  res.statusCode = openaiRes.status
                  res.setHeader('Content-Type', 'application/json')
                  res.end(
                    JSON.stringify({
                      error: data.error?.message || 'OpenAI API 요청 실패',
                    }),
                  )
                  return
                }

                const reply =
                  data.choices?.[0]?.message?.content ??
                  '응답을 생성하지 못했어요.'

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ reply }))
              } catch (err) {
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: err.message }))
              }
            })
          })
        },
      },
    ],
  }
})