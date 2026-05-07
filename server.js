const express = require('express');
const { spawn, exec } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const activeProcesses = new Map();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/sessions', (req, res) => {
    exec('gemini --list-sessions', { cwd: process.cwd(), env: process.env }, (error, stdout, stderr) => {
        if (error) {
            console.error('Error listing sessions:', error);
            return res.status(500).json({ error: 'Failed to list sessions' });
        }
        
        const sessions = [];
        const lines = stdout.split('\n');
        
        // Example line: "  1. hello (25 minutes ago) [7a6fa9af-d75a-4429-a3f6-28409ca3943d]"
        const regex = /^\s*\d+\.\s+(.*?)\s+\((.*?)\)\s+\[(.*?)\]/;
        
        for (const line of lines) {
            const match = line.match(regex);
            if (match) {
                sessions.push({
                    title: match[1].trim(),
                    date: match[2].trim(),
                    id: match[3].trim()
                });
            }
        }
        
        res.json({ sessions });
    });
});

app.delete('/api/sessions/:id', (req, res) => {
    const sessionId = req.params.id;
    // The CLI's native delete command has bugs with UUIDs, so we remove the jsonl file directly.
    const cmd = `files=$(grep -l "${sessionId}" ~/.gemini/tmp/*/chats/*.jsonl 2>/dev/null); if [ -n "$files" ]; then rm $files; fi`;
    exec(cmd, { cwd: process.cwd(), env: process.env, shell: true }, (error) => {
        if (error) {
            console.error('Error deleting session:', error);
            // It might fail if files are not found, which is fine
        }
        res.json({ success: true });
    });
});

app.post('/api/chat/stop', (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'Session ID required' });
    
    const geminiProcess = activeProcesses.get(sessionId);
    if (geminiProcess && !geminiProcess.killed) {
        geminiProcess.kill();
        return res.json({ success: true });
    }
    res.json({ success: false, message: 'Process not running' });
});

app.post('/api/chat', (req, res) => {
    const { prompt, sessionId, isFirstMessage, model } = req.body;

    if (!prompt || !sessionId) {
        return res.status(400).json({ error: 'Prompt and sessionId are required' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // flush the headers to establish SSE

    const sessionFlag = isFirstMessage ? '--session-id' : '--resume';

    const geminiArgs = [
        '-p', prompt,
        '--output-format', 'stream-json',
        sessionFlag, sessionId,
        '--yolo',
        '--skip-trust'
    ];
    if (model) {
        geminiArgs.push('--model', model);
    }

    console.log(`Spawning: gemini ${geminiArgs.join(' ')}`);

    // Spawn the gemini CLI
    const geminiProcess = spawn('gemini', geminiArgs, {
        cwd: process.cwd(),
        env: process.env
    });

    activeProcesses.set(sessionId, geminiProcess);

    geminiProcess.on('error', (err) => {
        console.error(`[Spawn Error] ${err.message}`);
        res.write(`data: {"type":"message","role":"assistant","content":"*Error: Failed to spawn Gemini CLI. Make sure it is installed and in PATH.*"}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
    });

    let buffer = '';

    geminiProcess.stdout.on('data', (data) => {
        buffer += data.toString();
        let lines = buffer.split('\n');
        buffer = lines.pop(); // Keep the incomplete line in the buffer

        for (const line of lines) {
            if (line.trim()) {
                res.write(`data: ${line}\n\n`);
            }
        }
    });

    geminiProcess.stderr.on('data', (data) => {
        console.error(`[Gemini CLI] ${data.toString().trim()}`);
    });

    geminiProcess.on('close', (code, signal) => {
        console.log(`[Server] Gemini process exited with code ${code} and signal ${signal}`);
        activeProcesses.delete(sessionId);
        if (buffer.trim()) {
            res.write(`data: ${buffer}\n\n`);
        }
        res.write('data: [DONE]\n\n');
        res.end();
    });

    res.on('close', () => {
        if (geminiProcess.exitCode === null && !geminiProcess.killed) {
            console.log('[Server] Client aborted, killing process');
            geminiProcess.kill();
        }
    });
});

app.listen(PORT, () => {
    console.log(`Gemini Web UI is running at http://localhost:${PORT}`);
});
