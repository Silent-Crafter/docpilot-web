const API_URL = 'http://localhost:31337';

/**
 * Stream a response from the Docpilot API.
 *
 * - Text-only: GET /stream?prompt=...
 * - With file:  POST /stream (FormData: { prompt, file })
 *
 * Both return the same SSE event stream.
 *
 * @param {string} prompt
 * @param {File|null} file
 * @param {function} onEvent  - called with each parsed LlmResponse { type, content, status }
 * @param {function} onError
 * @param {function} onDone   - called when stream ends
 * @returns {function} cleanup - call to abort the stream
 */
export function streamResponse(prompt, file, onEvent, onError, onDone) {
    if (file) {
        return _streamPost(prompt, file, onEvent, onError, onDone);
    }
    return _streamGet(prompt, onEvent, onError, onDone);
}

function _streamGet(prompt, onEvent, onError, onDone) {
    const url = `${API_URL}/stream?prompt=${encodeURIComponent(prompt)}`;
    const source = new EventSource(url);

    source.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            onEvent(data);
            if (data.type === 'answer_with_images') {
                source.close();
                onDone?.();
            }
        } catch (err) {
            onError?.(err);
        }
    };

    source.onerror = (err) => {
        source.close();
        onError?.(err);
        onDone?.();
    };

    return () => source.close();
}

function _streamPost(prompt, file, onEvent, onError, onDone) {
    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('file', file);

    const controller = new AbortController();

    fetch(`${API_URL}/stream`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
    })
        .then(async (response) => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            onEvent(data);
                            if (data.type === 'answer_with_images') {
                                reader.cancel();
                                onDone?.();
                                return;
                            }
                        } catch {
                            // skip malformed lines
                        }
                    }
                }
            }
            onDone?.();
        })
        .catch((err) => {
            if (err.name !== 'AbortError') onError?.(err);
            onDone?.();
        });

    return () => controller.abort();
}

/**
 * One-shot generate (POST). Kept for reference.
 */
export async function generateResponse(prompt) {
    const res = await fetch(`${API_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
    });
    return res.json();
}

// ========================
// Knowledge Hub — Documents
// ========================

export async function getDocuments() {
    const res = await fetch(`${API_URL}/documents`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

export async function uploadDocument(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_URL}/documents`, {
        method: 'POST',
        body: formData,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

export async function deleteDocument(id) {
    const res = await fetch(`${API_URL}/documents/${id}`, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}
