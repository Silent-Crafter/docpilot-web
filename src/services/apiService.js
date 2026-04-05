const API_URL = 'http://localhost:31337';

/**
 * Stream a response from the Docpilot API.
 *
 * - Text-only: GET /stream?prompt=...&chatid=...
 * - With file:  POST /stream_p (JSON)
 *
 * Both return the same SSE event stream.
 *
 * @param {string} prompt
 * @param {string} chatid - UUID for the chat session
 * @param {File|null} file
 * @param {function} onEvent  - called with each parsed LlmResponse { type, content, status }
 * @param {function} onError
 * @param {function} onDone   - called when stream ends
 * @returns {function} cleanup - call to abort the stream
 */
export function streamResponse(prompt, chatid, file, onEvent, onError, onDone) {
    if (file) {
        return _streamPost(prompt, chatid, file, onEvent, onError, onDone);
    }
    return _streamGet(prompt, chatid, onEvent, onError, onDone);
}

function _streamGet(prompt, chatid, onEvent, onError, onDone) {
    const url = `${API_URL}/stream?prompt=${encodeURIComponent(prompt)}&chatid=${encodeURIComponent(chatid)}`;
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

function _streamPost(prompt, chatid, file, onEvent, onError, onDone) {
    const controller = new AbortController();

    const formData = new FormData()
    formData.append("prompt", prompt)
    formData.append("chatid", chatid)

    if (file) {
        formData.append("file", file);
    }

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
export async function generateResponse(prompt, chatid) {
    const res = await fetch(`${API_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, chatid }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
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

// ========================
// Chat History
// ========================

/**
 * Fetch message history for a chat from the API.
 *
 * POST /history  { chatid: "<uuid>" }
 * Returns: [{ role: 'user'|'ai', content: '...' }, ...]
 *
 * @param {string} chatid - UUID for the chat session
 * @returns {Promise<Array<{role: string, content: string}>>}
 */
export async function fetchChatHistory(chatid) {
    const res = await fetch(`${API_URL}/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatid }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

/**
 * Create a new chat session.
 *
 * GET /chat/new
 * Returns: { chatid: "<uuid>", timestamp: "..." }
 *
 * @returns {Promise<{chatid: string, timestamp: string}>}
 */
export async function createNewChat() {
    const res = await fetch(`${API_URL}/chat/new`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}
