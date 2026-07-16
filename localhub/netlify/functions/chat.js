// netlify/functions/chat.js
import { runChat } from './_shared/chatCore.js'

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const { message, history } = JSON.parse(event.body || '{}')
    const result = await runChat({
      message,
      history,
      apiKey: process.env.OPEN_API_KEY,
      kakaoApiKey: process.env.KAKAO_REST_API_KEY,
    })

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    }
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    }
  }
}