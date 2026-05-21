document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const jobDescriptionInput = document.getElementById('job-description');
    
    const uploadStatus = document.getElementById('upload-status');
    const analysisSummary = document.getElementById('analysis-summary');
    const atsScoreValue = document.getElementById('ats-score-value');
    const scoreCirclePath = document.getElementById('score-circle-path');
    
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const btnSend = document.getElementById('btn-send');

    let currentResumeText = "";
    let chatHistory = [];

    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 200) + 'px';
        btnSend.disabled = this.value.trim() === '';
    });

    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!btnSend.disabled) sendMessage();
        }
    });

    btnSend.addEventListener('click', sendMessage);

    dropZone.addEventListener('click', (e) => {
        if(e.target.tagName !== 'INPUT') fileInput.click();
    });

    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) handleFileUpload(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) handleFileUpload(e.target.files[0]);
    });

    async function handleFileUpload(file) {
        if (!file.name.toLowerCase().endsWith('.pdf')) {
            addBotMessage("Please upload a valid PDF file.");
            return;
        }

        dropZone.style.display = 'none';
        uploadStatus.hidden = false;

        const formData = new FormData();
        formData.append('resume', file);
        formData.append('job_description', jobDescriptionInput.value.trim());

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const text = await response.text();
                let errMsg = `HTTP ${response.status}`;
                try {
                    const errData = JSON.parse(text);
                    errMsg = errData.error || errMsg;
                } catch (e) {
                    errMsg = `Server Error (${response.status}). HTML Response received.`;
                }
                throw new Error(errMsg);
            }

            const data = await response.json();
            currentResumeText = data.resume_text;
            uploadStatus.hidden = true;
            
            analysisSummary.hidden = false;
            updateScore(data.analysis.ats_score);

            chatInput.disabled = false;
            chatInput.placeholder = "Ask follow-up questions...";

            renderAnalysisMessage(data.analysis);

        } catch (error) {
            uploadStatus.hidden = true;
            dropZone.style.display = 'block';
            addBotMessage(`<span class="error-msg"><i class="fa-solid fa-triangle-exclamation"></i> Error: ${error.message}</span>`);
        }
    }

    function updateScore(score) {
        atsScoreValue.innerText = `${score}%`;
        scoreCirclePath.setAttribute('stroke-dasharray', `${score}, 100`);
        let color = '#ef4444'; // red
        if(score > 50) color = '#eab308'; // yellow
        if(score > 75) color = '#22c55e'; // green
        scoreCirclePath.style.stroke = color;
    }

    function renderAnalysisMessage(analysis) {
        const container = document.createElement('div');
        
        let delayCount = 1;
        const getDelay = () => {
            const d = delayCount++;
            return `delay-${Math.min(d, 7)}`;
        };

        // 1. Summary
        let summaryDiv = document.createElement('div');
        summaryDiv.className = `animate-slide-up ${getDelay()}`;
        summaryDiv.innerHTML = marked.parse(`### Analysis Complete! \n\n${analysis.summary}`);
        container.appendChild(summaryDiv);

        // 2. Original Features (Skill Extraction Removed)
        let featuresMd = "";
        if (analysis.career_domains && analysis.career_domains.length) {
            featuresMd += `#### 🎯 Career Domain Mapping\n- ${analysis.career_domains.join('\n- ')}\n\n`;
        }
        if (analysis.skill_gaps && analysis.skill_gaps.length) {
            featuresMd += `#### ⚠️ Skill Gap Detection\n- ${analysis.skill_gaps.join('\n- ')}\n\n`;
        }
        if (analysis.role_recommendations && analysis.role_recommendations.length) {
            featuresMd += `#### 💼 Job Role Recommendations\n- ${analysis.role_recommendations.join('\n- ')}\n\n`;
        }
        if (analysis.learning_roadmap && analysis.learning_roadmap.length) {
            featuresMd += `#### 🛣️ Learning Roadmap\n- ${analysis.learning_roadmap.join('\n- ')}\n\n`;
        }
        
        if (featuresMd) {
            let featDiv = document.createElement('div');
            featDiv.className = `animate-slide-up ${getDelay()}`;
            featDiv.innerHTML = marked.parse(featuresMd);
            container.appendChild(featDiv);
        }

        // 3. Resume Improvements
        if (analysis.resume_improvements) {
            const imp = analysis.resume_improvements;
            let impHtml = `<div class="modern-card">
                <h4><i class="fa-solid fa-wand-magic-sparkles"></i> Resume Improvements</h4>`;
            
            if (imp.missing_sections && imp.missing_sections.length) {
                impHtml += `<strong>Missing Sections:</strong><ul>${imp.missing_sections.map(i => `<li>${i}</li>`).join('')}</ul>`;
            }
            if (imp.better_wording && imp.better_wording.length) {
                impHtml += `<strong>Better Wording:</strong><ul>${imp.better_wording.map(i => `<li>${i}</li>`).join('')}</ul>`;
            }
            if (imp.action_verbs && imp.action_verbs.length) {
                impHtml += `<strong>Action Verbs to Use:</strong> <p>${imp.action_verbs.join(', ')}</p>`;
            }
            if (imp.ats_tips && imp.ats_tips.length) {
                impHtml += `<strong>ATS Tips:</strong><ul>${imp.ats_tips.map(i => `<li>${i}</li>`).join('')}</ul>`;
            }
            impHtml += `</div>`;
            
            let impDiv = document.createElement('div');
            impDiv.className = `animate-slide-up ${getDelay()}`;
            impDiv.innerHTML = marked.parse(impHtml); 
            container.appendChild(impDiv);
        }

        // 4. Project Ideas
        if (analysis.project_ideas && analysis.project_ideas.length) {
            let headerDiv = document.createElement('div');
            headerDiv.className = `animate-slide-up ${getDelay()}`;
            headerDiv.innerHTML = marked.parse(`### Suggested Projects to Fill Skill Gaps`);
            container.appendChild(headerDiv);

            analysis.project_ideas.forEach(proj => {
                let badges = proj.tech_stack.map(t => `<span class="tech-badge">${t}</span>`).join('');
                let projHtml = `<div class="modern-card project-card">
                    <h4><i class="fa-solid fa-code"></i> ${proj.name}</h4>
                    <p>${proj.description}</p>
                    <div>${badges}</div>
                </div>`;
                
                let pDiv = document.createElement('div');
                pDiv.className = `animate-slide-up ${getDelay()}`;
                pDiv.innerHTML = marked.parse(projHtml);
                container.appendChild(pDiv);
            });
        }

        // Add to DOM
        const wrapper = document.createElement('div');
        wrapper.className = 'message bot-message';
        const content = document.createElement('div');
        content.className = 'message-content markdown-body';
        content.appendChild(container);
        wrapper.appendChild(content);
        chatMessages.appendChild(wrapper);
        scrollToBottom();
    }

    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        chatInput.value = '';
        chatInput.style.height = 'auto';
        btnSend.disabled = true;

        addUserMessage(text);
        chatHistory.push({ role: "user", text: text });

        const typingId = showTypingIndicator();

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ history: chatHistory, resume_text: currentResumeText })
            });
            
            if (!response.ok) {
                const errText = await response.text();
                let errMsg = `HTTP ${response.status}`;
                try {
                    const errData = JSON.parse(errText);
                    errMsg = errData.error || errMsg;
                } catch (e) {
                    errMsg = `Server Error (${response.status}).`;
                }
                throw new Error(errMsg);
            }

            const data = await response.json();
            removeElement(typingId);
            
            addBotMessage(data.reply);
            chatHistory.push({ role: "model", text: data.reply });

        } catch (error) {
            removeElement(typingId);
            addBotMessage(`<span class="error-msg">Error: ${error.message}</span>`);
        }
    }

    function addUserMessage(text) {
        const div = document.createElement('div');
        div.className = 'message user-message animate-slide-up';
        const escaped = text.replace(/[&<>'"]/g, tag => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'}[tag] || tag));
        div.innerHTML = `<div class="message-content">${escaped}</div>`;
        chatMessages.appendChild(div);
        scrollToBottom();
    }

    function addBotMessage(markdownText) {
        const div = document.createElement('div');
        div.className = 'message bot-message animate-slide-up';
        const html = marked.parse(markdownText);
        div.innerHTML = `<div class="message-content markdown-body">${html}</div>`;
        chatMessages.appendChild(div);
        scrollToBottom();
    }

    function showTypingIndicator() {
        const id = 'typing-' + Date.now();
        const div = document.createElement('div');
        div.id = id;
        div.className = 'message bot-message animate-slide-up';
        div.innerHTML = `
            <div class="message-content markdown-body">
                <div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>
            </div>`;
        chatMessages.appendChild(div);
        scrollToBottom();
        return id;
    }

    function removeElement(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
});
