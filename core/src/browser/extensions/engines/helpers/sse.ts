import { Observable } from 'rxjs'
import { ErrorCode, ModelRuntimeParams } from '../../../../types'
/**
 * Sends a request to the inference server to generate a response based on the recent messages.
 * @param recentMessages - An array of recent messages to use as context for the inference.
 * @returns An Observable that emits the generated response as a string.
 */
export function requestInference(
  inferenceUrl: string,
  requestBody: any,
  model: {
    id: string
    parameters?: ModelRuntimeParams
  },
  controller?: AbortController,
  headers?: HeadersInit,
  transformResponse?: Function
): Observable<string> {
  return new Observable((subscriber) => {
    fetch(inferenceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Accept': model.parameters?.stream
          ? 'text/event-stream'
          : 'application/json',
        ...headers,
      },
      body: JSON.stringify(requestBody),
      signal: controller?.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const data = await response.json()
          let errorCode = ErrorCode.Unknown
          if (data.error) {
            errorCode = data.error.code ?? data.error.type ?? ErrorCode.Unknown
          } else if (response.status === 401) {
            errorCode = ErrorCode.InvalidApiKey
          }
          const error = {
            message: data.error?.message ?? data.message ?? 'Error occurred.',
            code: errorCode,
          }
          subscriber.error(error)
          subscriber.complete()
          return
        }
        // There could be overriden stream parameter in the model
        // that is set in request body (transformed payload)
        if (
          requestBody?.stream === false ||
          model.parameters?.stream === false
        ) {
          const data = await response.json()
          if (data.error || data.message) {
            subscriber.error(data.error ?? data)
            subscriber.complete()
            return
          }
          if (transformResponse) {
            subscriber.next(transformResponse(data))
          } else {
            subscriber.next(
              data.choices
                ? data.choices[0]?.message?.content
                : (data.content[0]?.text ?? '')
            )
          }
        } else {
          const stream = response.body
          const decoder = new TextDecoder('utf-8')
          const reader = stream?.getReader()
          let content = ''

          while (true && reader) {
            const { done, value } = await reader.read()
            if (done) {
              break
            }
            const text = decoder.decode(value)
            const lines = text.trim().split('\n')
            let cachedLines = ''
            for (const line of lines) {
              try {
                if (transformResponse) {
                  content += transformResponse(line)
                  subscriber.next(content ?? '')
                } else {
                  const toParse = cachedLines + line
                  if (!line.includes('data: [DONE]')) {
                    const data = JSON.parse(toParse.replace('data: ', ''))
                    if (
                      'error' in data ||
                      'message' in data ||
                      'detail' in data
                    ) {
                      subscriber.error(data.error ?? data)
                      subscriber.complete()
                      return
                    }
                    content += data.choices[0]?.delta?.content ?? ''
                    if (content.startsWith('assistant: ')) {
                      content = content.replace('assistant: ', '')
                    }
                    if (content !== '') subscriber.next(content)
                  }
                }
              } catch {
                cachedLines = line
              }
            }
          }
        }
        subscriber.complete()
      })
      .catch((err) => subscriber.error(err))
  })
}
