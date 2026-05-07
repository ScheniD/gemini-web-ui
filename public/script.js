document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const chatForm = document.getElementById('chat-form');
    const promptInput = document.getElementById('prompt-input');
    const sendBtn = document.getElementById('send-btn');
    const chatHistory = document.getElementById('chat-history');
    const welcomeMessage = document.getElementById('welcome-message');
    const sessionIdDisplay = document.getElementById('session-id-display');
    const sessionsList = document.getElementById('sessions-list');
    const newChatBtn = document.getElementById('new-chat-btn');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    
    // New Elements
    const stopBtnContainer = document.getElementById('stop-btn-container');
    const stopBtn = document.getElementById('stop-btn');
    const scrollBottomBtn = document.getElementById('scroll-bottom-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const modelSelect = document.getElementById('model-select');
    const currentModelDisplay = document.getElementById('current-model-display');
    
    // Drag & Drop Elements
    const dragOverlay = document.getElementById('drag-overlay');
    const attachmentsContainer = document.getElementById('attachments-container');

    // State
    let sessionId = '';
    let isFirstMessage = true;
    let isUserScrolling = false;
    let currentModel = localStorage.getItem('geminiModel') || 'auto-gemini-3';
    let attachedFiles = [];

    // Apply Settings
    modelSelect.value = currentModel;
    const formatModelName = (name) => {
        if (name === 'auto-gemini-3') return 'Auto Gemini 3';
        if (name === 'gemini-3-flash-preview') return 'Gemini 3 Flash';
        if (name === 'gemini-2.5-pro') return 'Gemini 2.5 Pro';
        return name;
    };
    currentModelDisplay.textContent = formatModelName(currentModel);

    // Sidebar Toggle
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }

    // Modal Logic
    settingsBtn.addEventListener('click', () => settingsModal.style.display = 'flex');
    closeSettingsBtn.addEventListener('click', () => settingsModal.style.display = 'none');
    saveSettingsBtn.addEventListener('click', () => {
        currentModel = modelSelect.value;
        localStorage.setItem('geminiModel', currentModel);
        currentModelDisplay.textContent = formatModelName(currentModel);
        settingsModal.style.display = 'none';
    });

    // Drag & Drop Logic
    let dragCounter = 0;

    document.addEventListener('dragenter', (e) => {
        e.preventDefault();
        dragCounter++;
        if (dragCounter === 1) {
            dragOverlay.style.display = 'flex';
        }
    });

    document.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dragCounter--;
        if (dragCounter === 0) {
            dragOverlay.style.display = 'none';
        }
    });

    document.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    document.addEventListener('drop', (e) => {
        e.preventDefault();
        dragCounter = 0;
        dragOverlay.style.display = 'none';

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleDroppedFiles(e.dataTransfer.files);
        }
    });

    const handleDroppedFiles = (files) => {
        Array.from(files).forEach(file => {
            // Check size (e.g. limit to 2MB)
            if (file.size > 2 * 1024 * 1024) {
                alert(`File ${file.name} is too large. Please attach files under 2MB.`);
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                attachedFiles.push({
                    name: file.name,
                    content: e.target.result
                });
                renderAttachments();
            };
            // Read as text. If it's a binary file, this will produce garbage, but there's no perfect way to filter text files client-side consistently.
            reader.readAsText(file);
        });
    };

    const renderAttachments = () => {
        attachmentsContainer.innerHTML = '';
        if (attachedFiles.length > 0) {
            attachmentsContainer.style.display = 'flex';
            attachedFiles.forEach((file, index) => {
                const pill = document.createElement('div');
                pill.className = 'attachment-pill';
                pill.innerHTML = `
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                    ${file.name}
                    <button type="button" class="remove-btn" onclick="removeAttachment(${index})">&times;</button>
                `;
                attachmentsContainer.appendChild(pill);
            });
        } else {
            attachmentsContainer.style.display = 'none';
        }
        promptInput.dispatchEvent(new Event('input')); // Trigger resize
    };

    window.removeAttachment = (index) => {
        attachedFiles.splice(index, 1);
        renderAttachments();
    };

    // Session Logic
    const startNewChat = () => {
        sessionId = 'session-' + Math.random().toString(36).substring(2, 9);
        isFirstMessage = true;
        sessionIdDisplay.textContent = sessionId;
        chatHistory.innerHTML = '';
        if (welcomeMessage) welcomeMessage.style.display = 'flex';
        
        document.querySelectorAll('.session-item').forEach(item => item.classList.remove('active'));
    };

    const loadSessions = async () => {
        try {
            const response = await fetch('/api/sessions');
            const data = await response.json();
            
            if (data.sessions && data.sessions.length > 0) {
                sessionsList.innerHTML = '';
                data.sessions.forEach(session => {
                    const item = document.createElement('div');
                    item.className = 'session-item';
                    if (session.id === sessionId) item.classList.add('active');
                    
                    item.innerHTML = `
                        <div class="session-info-wrap">
                            <div class="session-title">${session.title}</div>
                            <div class="session-date">${session.date}</div>
                        </div>
                        <button class="delete-session-btn" title="Delete Session" data-id="${session.id}">
                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    `;
                    
                    // Click to resume
                    item.querySelector('.session-info-wrap').addEventListener('click', () => {
                        resumeSession(session.id, item);
                    });

                    // Click to delete
                    item.querySelector('.delete-session-btn').addEventListener('click', async (e) => {
                        e.stopPropagation();
                        if (confirm('Are you sure you want to delete this session?')) {
                            await fetch(`/api/sessions/${session.id}`, { method: 'DELETE' });
                            if (sessionId === session.id) startNewChat();
                            loadSessions();
                        }
                    });

                    sessionsList.appendChild(item);
                });
            }
        } catch (err) {
            console.error('Failed to load sessions', err);
        }
    };

    const resumeSession = (id, element) => {
        sessionId = id;
        isFirstMessage = false;
        sessionIdDisplay.textContent = sessionId;
        
        document.querySelectorAll('.session-item').forEach(item => item.classList.remove('active'));
        if (element) element.classList.add('active');

        chatHistory.innerHTML = '';
        if (welcomeMessage) welcomeMessage.style.display = 'none';
        
        const sysNote = document.createElement('div');
        sysNote.className = 'message-wrapper bot';
        sysNote.innerHTML = `
            <div class="message" style="color: var(--text-muted); font-size: 0.85rem; font-style: italic;">
                Resumed session context. Past messages are retained by the model.
            </div>
        `;
        chatHistory.appendChild(sysNote);
    };

    newChatBtn.addEventListener('click', startNewChat);
    startNewChat();
    loadSessions();

    // Scroll Logic
    chatHistory.addEventListener('scroll', () => {
        const isAtBottom = chatHistory.scrollHeight - chatHistory.scrollTop <= chatHistory.clientHeight + 20;
        isUserScrolling = !isAtBottom;
        scrollBottomBtn.style.display = isUserScrolling ? 'flex' : 'none';
    });

    scrollBottomBtn.addEventListener('click', () => {
        isUserScrolling = false;
        chatHistory.scrollTo({ top: chatHistory.scrollHeight, behavior: 'smooth' });
    });

    const safeScrollToBottom = () => {
        if (!isUserScrolling) {
            chatHistory.scrollTop = chatHistory.scrollHeight;
        }
    };

    // Auto-resize textarea
    promptInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        if (this.value.trim() !== '') {
            sendBtn.removeAttribute('disabled');
        } else {
            sendBtn.setAttribute('disabled', 'true');
        }
    });

    promptInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (this.value.trim() !== '') {
                chatForm.dispatchEvent(new Event('submit'));
            }
        }
    });

    // Marked Config & Custom Renderer for Copy Buttons
    const renderer = new marked.Renderer();
    renderer.code = function(tokenOrCode, language) {
        let rawCode = typeof tokenOrCode === 'string' ? tokenOrCode : (tokenOrCode ? tokenOrCode.text : '');
        let lang = typeof tokenOrCode === 'string' ? language : (tokenOrCode ? tokenOrCode.lang : 'plaintext');
        
        let code = String(rawCode || '');
        if (!lang) lang = 'plaintext';
        
        const validLang = hljs.getLanguage(lang) ? lang : 'plaintext';
        let highlighted = code;
        try {
            highlighted = hljs.highlight(code, { language: validLang }).value;
        } catch (e) {
            console.warn('Highlight js error:', e);
        }
        
        const codeId = 'code-' + Math.random().toString(36).substr(2, 9);
        
        return `
            <pre>
                <div class="code-header">
                    <span>${validLang}</span>
                    <button class="copy-btn" onclick="copyCode('${codeId}', this)">
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        Copy
                    </button>
                </div>
                <code id="${codeId}" class="hljs ${validLang}">${highlighted}</code>
            </pre>
        `;
    };
    marked.setOptions({ renderer });

    window.copyCode = (id, btn) => {
        const el = document.getElementById(id);
        if (el) {
            navigator.clipboard.writeText(el.innerText).then(() => {
                const originalHTML = btn.innerHTML;
                btn.innerHTML = `
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg> Copied!
                `;
                setTimeout(() => btn.innerHTML = originalHTML, 2000);
            });
        }
    };

    const renderMarkdown = (text) => {
        return DOMPurify.sanitize(marked.parse(text));
    };

    // Chat Helpers
    const appendUserMessage = (text) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'message-wrapper user';
        const msg = document.createElement('div');
        msg.className = 'message';
        msg.textContent = text;
        wrapper.appendChild(msg);
        chatHistory.appendChild(wrapper);
        safeScrollToBottom();
        if (welcomeMessage) welcomeMessage.style.display = 'none';
    };

    const appendBotMessage = () => {
        const wrapper = document.createElement('div');
        wrapper.className = 'message-wrapper bot';
        
        const toolsContainer = document.createElement('div');
        toolsContainer.className = 'tools-container';
        wrapper.appendChild(toolsContainer);

        const msg = document.createElement('div');
        msg.className = 'message';
        msg.innerHTML = '<span class="tool-spinner" style="display: inline-block;"></span>';
        wrapper.appendChild(msg);

        chatHistory.appendChild(wrapper);
        safeScrollToBottom();

        return { wrapper, toolsContainer, msgElement: msg, textBuffer: '' };
    };

    const appendToolUse = (toolsContainer, toolName) => {
        const indicator = document.createElement('div');
        indicator.className = 'tool-indicator';
        indicator.innerHTML = `<span class="tool-spinner"></span> Using ${toolName}...`;
        toolsContainer.appendChild(indicator);
        safeScrollToBottom();
        return indicator;
    };

    // Stop Logic
    stopBtn.addEventListener('click', async () => {
        try {
            await fetch('/api/chat/stop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId })
            });
            stopBtnContainer.style.display = 'none';
        } catch (err) {
            console.error('Failed to stop', err);
        }
    });

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        let prompt = promptInput.value.trim();
        
        if (!prompt && attachedFiles.length === 0) return;

        // Bundle attached files into the prompt
        if (attachedFiles.length > 0) {
            let bundledText = prompt ? prompt + '\n\n' : '';
            attachedFiles.forEach(file => {
                bundledText += `--- Attached File: ${file.name} ---\n${file.content}\n---------------------------------\n\n`;
            });
            prompt = bundledText.trim();
            
            // Clear attachments after successful read
            attachedFiles = [];
            renderAttachments();
        }

        promptInput.value = '';
        promptInput.style.height = 'auto';
        sendBtn.setAttribute('disabled', 'true');
        stopBtnContainer.style.display = 'flex';

        // Add user message to UI (hide full file content in UI for brevity if needed, but for now we append the full string)
        appendUserMessage(prompt);
        const botResponse = appendBotMessage();
        
        const activeTools = new Map();

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, sessionId, isFirstMessage, model: currentModel })
            });
            
            isFirstMessage = false;

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            botResponse.msgElement.innerHTML = '';

            let hasStartedText = false;

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.replace('data: ', '').trim();
                        if (dataStr === '[DONE]') break;
                        if (dataStr === '') continue;
                        
                        try {
                            const data = JSON.parse(dataStr);
                            
                            if (data.type === 'message' && data.role === 'assistant' && data.content) {
                                botResponse.textBuffer += data.content;
                                botResponse.msgElement.innerHTML = renderMarkdown(botResponse.textBuffer);
                                hasStartedText = true;
                                safeScrollToBottom();
                            } else if (data.type === 'tool_use') {
                                const indicator = appendToolUse(botResponse.toolsContainer, data.tool_name);
                                activeTools.set(data.tool_id, { indicator, name: data.tool_name });
                            } else if (data.type === 'tool_result') {
                                const toolObj = activeTools.get(data.tool_id);
                                if (toolObj) {
                                    const { indicator, name } = toolObj;
                                    const isSuccess = data.status === 'success';
                                    indicator.innerHTML = `<span class="${isSuccess ? 'tool-success' : 'tool-error'}">${isSuccess ? '✓' : '✗'}</span> ${name}`;
                                }
                            }
                        } catch (err) {
                            console.error('Error parsing JSON:', err, dataStr);
                        }
                    }
                }
            }
            
            if (!hasStartedText && botResponse.textBuffer === '') {
                botResponse.msgElement.innerHTML = '<i>Finished executing tools.</i>';
            }

            loadSessions();

        } catch (error) {
            console.error('Fetch error:', error);
            botResponse.msgElement.innerHTML = `<span style="color: #ef4444;">Error connecting to Gemini.</span>`;
        } finally {
            stopBtnContainer.style.display = 'none';
        }
    });
});
