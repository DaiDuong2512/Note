document.addEventListener('DOMContentLoaded', function() {
    const textInput = document.getElementById('textInput');
    const postButton = document.getElementById('postButton');
    const notesDisplay = document.getElementById('notesDisplay');
    const initialFontSizeInput = document.getElementById('initialFontSize');
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const fileInput = document.getElementById('fileInput');
    const inputControls = document.getElementById('inputControls');
    const hideInputBtn = document.getElementById('hideInputBtn');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const exitFullscreenBtn = document.getElementById('exitFullscreenBtn');
    const clearAllBtn = document.getElementById('clearAllBtn');
    const generateSampleBtn = document.getElementById('generateSampleBtn');

    const MW_API_KEY = '41df0ea1-5bee-4925-93ed-7070a944a385';
    const commonVerbs = new Set(['go', 'run', 'eat', 'drink', 'sleep', 'write', 'read', 'speak', 'listen', 'walk', 'be', 'have', 'do', 'say', 'get', 'make', 'know', 'think', 'take', 'see', 'come', 'want', 'look', 'use', 'find', 'give', 'tell']);
    const posAbbreviations = {
        'verb': 'v',
        'noun': 'n',
        'adjective': 'adj',
        'adverb': 'adv',
        'preposition': 'prep',
        'conjunction': 'conj',
        'pronoun': 'pron',
        'interjection': 'int'
    };
    let currentSpeech = null;
    let voices = [];
    let initialFontSize = parseInt(initialFontSizeInput.value, 10);
    
    // Hàm lưu trạng thái giao diện
    function saveUIState() {
        const uiState = {
            inputControlsHidden: inputControls.classList.contains('hidden'),
            initialFontSize: initialFontSize,
            hideInputBtnText: hideInputBtn.querySelector('span').textContent,
            scrollTop: notesDisplay.scrollTop
        };
        localStorage.setItem('notesAppUIState', JSON.stringify(uiState));
    }

    // Hàm khôi phục trạng thái giao diện
    function loadUIState() {
        try {
            const savedUIState = localStorage.getItem('notesAppUIState');
            if (savedUIState) {
                const uiState = JSON.parse(savedUIState);
                
                // Khôi phục trạng thái ẩn/hiện input controls
                if (uiState.inputControlsHidden) {
                    inputControls.classList.add('hidden');
                    hideInputBtn.querySelector('span').textContent = 'Show';
                } else {
                    inputControls.classList.remove('hidden');
                    hideInputBtn.querySelector('span').textContent = 'Hide';
                }
                
                // Khôi phục fontSize ban đầu
                if (uiState.initialFontSize) {
                    initialFontSize = uiState.initialFontSize;
                    initialFontSizeInput.value = initialFontSize;
                }
                
                // Khôi phục vị trí scroll (sau khi notes được load)
                if (uiState.scrollTop) {
                    setTimeout(() => {
                        notesDisplay.scrollTop = uiState.scrollTop;
                    }, 100);
                }
            }
        } catch (error) {
            console.warn('Error loading UI state:', error);
        }
    }

    // Lưu scroll position khi người dùng scroll
    let scrollSaveTimeout;
    notesDisplay.addEventListener('scroll', () => {
        clearTimeout(scrollSaveTimeout);
        scrollSaveTimeout = setTimeout(() => {
            saveUIState();
        }, 500); // Debounce 500ms để tránh lưu quá nhiều
    });

    function stopSpeaking() {
        if (currentSpeech) {
            speechSynthesis.cancel();
            currentSpeech = null;
        }
    }

    // Khởi tạo voices
    function initVoices() {
        return new Promise((resolve) => {
            voices = speechSynthesis.getVoices();
            if (voices.length > 0) {
                resolve(voices);
            } else {
                speechSynthesis.onvoiceschanged = () => {
                    voices = speechSynthesis.getVoices();
                    resolve(voices);
                };
            }
        });
    }

    // Hàm lấy giọng đọc phù hợp
    async function getVoice() {
        await initVoices();
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isAndroid = /Android/.test(navigator.userAgent);
        const isWindows = /Windows/.test(navigator.userAgent);
        
        let preferredVoice;
        
        if (isIOS) {
            // iOS: ưu tiên Samantha hoặc giọng en-US
            preferredVoice = voices.find(voice => 
                voice.name.includes('Samantha') || 
                (voice.lang === 'en-US' && voice.name.includes('Siri'))
            );
        } else if (isAndroid) {
            // Android: ưu tiên Google US English
            preferredVoice = voices.find(voice => 
                voice.lang === 'en-US' && voice.name.includes('Google US English')
            );
        } else if (isWindows) {
            // Windows: ưu tiên Microsoft David/Zira
            preferredVoice = voices.find(voice => 
                voice.lang === 'en-US' && (
                    voice.name.includes('David') || 
                    voice.name.includes('Zira')
                )
            );
        }
        
        // Fallback to any en-US voice if preferred voice not found
        return preferredVoice || voices.find(voice => voice.lang === 'en-US');
    }

    // Khởi tạo voices khi trang load
    initVoices();

    async function speakNote(text, noteBox, speakButton) {
        stopSpeaking();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.7;
        
        try {
            const voice = await getVoice();
            if (voice) {
                utterance.voice = voice;
                console.log('Selected voice:', voice.name);
            }
        } catch (error) {
            console.warn('Không thể tìm giọng đọc phù hợp:', error);
        }

        // Cập nhật trạng thái nút trước khi phát âm thanh
        if (noteBox) noteBox.dataset.isSpeaking = 'true';
        if (speakButton) {
            speakButton.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="20px" height="20px"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path></svg>';
            speakButton.title = 'Dừng đọc';
        }

        utterance.onend = () => {
            if (noteBox) noteBox.dataset.isSpeaking = 'false';
            if (speakButton) {
                speakButton.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="20px" height="20px"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"></path></svg>';
                speakButton.title = 'Đọc ghi chú';
            }
            currentSpeech = null;
        };

        utterance.onerror = (event) => {
            console.error('Lỗi đọc:', event.error);
            if (noteBox) noteBox.dataset.isSpeaking = 'false';
            if (speakButton) {
                speakButton.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="20px" height="20px"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"></path></svg>';
                speakButton.title = 'Đọc ghi chú';
            }
            currentSpeech = null;
        };

        currentSpeech = utterance;
        speechSynthesis.speak(utterance);
    }

    // Xử lý nút tạo đoạn văn mẫu bằng AI
    if (generateSampleBtn) {
        console.log('✓ Generate Sample Button found');
        generateSampleBtn.addEventListener('click', async () => {
            console.log('🎯 Generate Sample Button clicked!');
            
            // Nếu đang loading thì không làm gì
            if (generateSampleBtn.classList.contains('loading')) {
                console.log('⏳ Already loading, skipping...');
                return;
            }
            
            try {
                // Thêm hiệu ứng loading
                console.log('🔄 Starting sample generation...');
                generateSampleBtn.classList.add('loading');
                generateSampleBtn.title = 'Đang tạo mẫu...';
                
                // Kiểm tra xem hàm generateRandomSample có tồn tại không
                if (typeof generateRandomSample !== 'function') {
                    throw new Error('generateRandomSample function not found');
                }
                
                // Tạo đoạn văn mẫu
                const sampleText = await generateRandomSample();
                console.log('📝 Generated sample:', sampleText);
                
                // Đưa vào ô input
                if (textInput) {
                    textInput.value = sampleText;
                    textInput.focus();
                    
                    // Hiệu ứng cho thấy text đã được thêm
                    textInput.style.background = 'linear-gradient(135deg, #e8f5e8, #f0f8ff)';
                    setTimeout(() => {
                        textInput.style.background = '';
                    }, 1000);
                    
                    console.log('✅ Sample inserted into input successfully');
                } else {
                    console.error('❌ textInput element not found');
                }
                
            } catch (error) {
                console.error('❌ Error generating sample:', error);
                
                // Fallback: thêm một mẫu có sẵn
                const fallbackSamples = [
                    'beautiful day',
                    'look forward to',
                    'break the ice',
                    'How are you?',
                    'take care',
                    'good morning',
                    'coffee shop',
                    'make sense'
                ];
                const fallback = fallbackSamples[Math.floor(Math.random() * fallbackSamples.length)];
                
                if (textInput) {
                    textInput.value = fallback;
                    textInput.focus();
                    console.log('🔄 Used fallback sample:', fallback);
                }
                
            } finally {
                // Loại bỏ hiệu ứng loading
                generateSampleBtn.classList.remove('loading');
                generateSampleBtn.title = 'Tạo đoạn văn mẫu bằng AI';
                console.log('🏁 Sample generation completed');
            }
        });
    } else {
        console.error('❌ Generate Sample Button not found! Check HTML ID.');
    }

    // Load saved notes and UI state when page loads
    loadUIState();
    loadNotes();
});

// Google Translate function
async function fetchTranslation(text) {
    if (!text || /^\s*$/.test(text)) return '';
    try {
        const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=${encodeURIComponent(text)}`);
        if (response.ok) {
            const data = await response.json();
            return data[0].map(item => item[0]).join('');
        }
        return '';
    } catch (error) {
        console.warn(`Google Translate API error for "${text}":`, error);
        return '';
    }
}

async function fetchWordData(text) {
    let phonetic = '';
    let pos = '';
    let translation = '';

    // Lấy phiên âm từ Free Dictionary API
    try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(text)}`);
        if (response.ok) {
            const data = await response.json();
            const entry = data[0];
            phonetic = entry.phonetic || (entry.phonetics?.find(p => p.text)?.text) || '';
            phonetic = phonetic.replace(/^\/|\/$/g, '');
        }
    } catch (error) {
        console.warn(`⚠️ Free Dictionary API error for "${text}":`, error);
    }

    // Lấy loại từ từ Merriam-Webster (chỉ cho từ đơn)
    if (!text.includes(' ')) {
        try {
            const MW_API_KEY = '41df0ea1-5bee-4925-93ed-7070a944a385';
            const commonVerbs = new Set(['go', 'run', 'eat', 'drink', 'sleep', 'write', 'read', 'speak', 'listen', 'walk', 'be', 'have', 'do', 'say', 'get', 'make', 'know', 'think', 'take', 'see', 'come', 'want', 'look', 'use', 'find', 'give', 'tell']);
            const posAbbreviations = {
                'verb': 'v',
                'noun': 'n',
                'adjective': 'adj',
                'adverb': 'adv',
                'preposition': 'prep',
                'conjunction': 'conj',
                'pronoun': 'pron',
                'interjection': 'int'
            };
            const response = await fetch(`https://www.dictionaryapi.com/api/v3/references/collegiate/json/${text}?key=${MW_API_KEY}`);
            if (response.ok) {
                const data = await response.json();
                if (data && data.length > 0 && typeof data[0] === 'object') {
                    let entry = data[0];
                    // Ưu tiên động từ cho các từ thông dụng
                    if (commonVerbs.has(text.toLowerCase())) {
                        const verbEntry = data.find(item => typeof item === 'object' && item.fl === 'verb');
                        if (verbEntry) entry = verbEntry;
                    }
                    pos = posAbbreviations[entry.fl] || entry.fl || '';
                }
            }
        } catch (error) {
            console.warn(`⚠️ Merriam-Webster API error for "${text}":`, error);
        }
    }

    // Lấy bản dịch - bắt buộc phải có
    try {
        translation = await fetchTranslation(text);
        if (!translation) {
            throw new Error('Translation is empty');
        }
    } catch (error) {
        console.error(`❌ Translation failed for "${text}":`, error);
        throw new Error(`Cannot translate "${text}"`);
    }

    return { phonetic, pos, translation };
}

// Hàm fetchNoteData gốc (dự phòng khi Gemini lỗi)
async function fetchNoteDataFallback(text) {
    const trimmedText = text.trim();
    if (!trimmedText) return { phrase: {}, words: {} };

    console.log('🔄 Using fallback translation method...');
    
    const periodCount = (trimmedText.match(/\./g) || []).length;
    const wordCount = trimmedText.split(/\s+/).filter(word => word.match(/^[a-zA-Z'-]+$/)).length;

    // Đối với đoạn văn dài (nhiều câu hoặc từ 8 từ trở lên), chỉ dịch nghĩa
    if (periodCount > 1 || wordCount >= 8) {
        try {
            const phraseTranslation = await fetchTranslation(trimmedText);
            return { phrase: { phonetic: '', pos: '', translation: phraseTranslation }, words: {} };
        } catch (error) {
            console.error('❌ Fallback translation failed for long text:', error);
            throw new Error('Fallback translation failed');
        }
    }

    // Đối với từ đơn và cụm từ ngắn
    try {
        const wordData = { phrase: {}, words: {} };
        
        // Lấy thông tin cho toàn bộ cụm từ
        wordData.phrase = await fetchWordData(trimmedText);
        
        // Nếu có nhiều từ, phân tích từng từ riêng biệt
        if (wordCount > 1 && wordCount <= 7) {
            const words = trimmedText.split(/\s+/).filter(word => word.match(/^[a-zA-Z'-]+$/));
            
            // Giới hạn số từ để tránh quá tải API
            const wordsToProcess = words.slice(0, 5); // Chỉ xử lý tối đa 5 từ
            
            for (const word of wordsToProcess) {
                const cleanedWord = word.toLowerCase().replace(/[^a-z'-]/g, '');
                if (cleanedWord && cleanedWord.length > 1) { // Bỏ qua từ quá ngắn
                    try {
                        const wordInfo = await fetchWordData(cleanedWord);
                        if (wordInfo.phonetic || wordInfo.pos) {
                            wordData.words[cleanedWord] = { 
                                phonetic: wordInfo.phonetic, 
                                pos: wordInfo.pos 
                            };
                        }
                    } catch (wordError) {
                        console.warn(`⚠️ Error fetching data for word "${cleanedWord}":`, wordError);
                        // Tiếp tục với từ tiếp theo thay vì dừng lại
                    }
                }
            }
        }
        
        // Đảm bảo có ít nhất bản dịch
        if (!wordData.phrase.translation) {
            throw new Error('No translation available');
        }
        
        console.log('✅ Fallback translation completed successfully');
        return wordData;
        
    } catch (error) {
        console.error('❌ Fallback method completely failed:', error);
        throw new Error('All translation methods failed');
    }
}

// Hàm fetchNoteData chính với Gemini AI và fallback
async function fetchNoteData(text, isNewNote = true) {
    try {
        // Thử dùng Gemini AI trước
        console.log('🤖 Đang dịch bằng Gemini AI...');
        return await fetchNoteDataWithGemini(text, isNewNote);
    } catch (error) {
        console.warn('⚠️ Gemini AI gặp lỗi, chuyển sang phương thức dự phòng:', error);
        // Nếu Gemini lỗi, dùng phương thức gốc
        try {
            console.log('🔄 Đang dịch bằng phương thức dự phòng...');
            return await fetchNoteDataFallback(text);
        } catch (fallbackError) {
            console.error('❌ Cả hai phương thức dịch đều lỗi:', fallbackError);
            // Trả về dữ liệu đặc biệt để báo hiệu lỗi
            return { 
                phrase: {}, 
                words: {}, 
                hasTranslationError: true,
                originalText: text
            };
        }
    }
}

function updateNoteMeta(noteBox, wordData) {
    const noteMeta = noteBox.querySelector('.note-meta');
    if (!noteMeta) return;

    noteMeta.innerHTML = '';
    
    // Kiểm tra nếu có lỗi dịch
    if (wordData.hasTranslationError) {
        createRetryButton(noteBox, wordData.originalText, noteMeta);
        return;
    }
    
    const { phrase, words } = wordData;

    if (phrase && (phrase.phonetic || phrase.pos || phrase.translation)) {
        let phraseHtml = `<span class="phonetic">`;
        if (phrase.pos) phraseHtml += `<span class="phrase-phonetic">(${phrase.pos}) </span>`;
        if (phrase.phonetic) phraseHtml += `/${phrase.phonetic}/`;
        phraseHtml += `</span>`;
        if (phrase.translation) {
            phraseHtml += `<span class="separator">|</span><span class="translation">${phrase.translation}</span>`;
        }
        noteMeta.innerHTML += `<div>${phraseHtml}</div>`;
    }

    const wordsArray = Object.entries(words);
    if (wordsArray.length > 0) {
        wordsArray.forEach(([word, data]) => {
            if (data.phonetic || data.pos) {
                let wordHtml = `<div><span class="word-phonetic">${word}`;
                if (data.pos) wordHtml += `<span class="phrase-phonetic"> (${data.pos})</span>`;
                if (data.phonetic) wordHtml += `<span class="phonetic"> /${data.phonetic}/</span>`;
                wordHtml += `</span></div>`;
                noteMeta.innerHTML += wordHtml;
            }
        });
    }

    if (noteMeta.innerHTML.trim() === '') {
        if (phrase && phrase.translation) {
            noteMeta.innerHTML = `<div><span class="translation">${phrase.translation}</span></div>`;
        } else {
            noteMeta.textContent = 'Không có thông tin bổ sung.';
        }
    }
}

// Tạo nút "Dịch lại" khi gặp lỗi
function createRetryButton(noteBox, originalText, noteMeta) {
    const retryContainer = document.createElement('div');
    retryContainer.className = 'retry-container';
    retryContainer.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px;
        background: #fff3cd;
        border: 1px solid #ffeaa7;
        border-radius: 6px;
        margin: 4px 0;
    `;
    
    const errorMessage = document.createElement('span');
    errorMessage.textContent = 'Lỗi dịch. ';
    errorMessage.style.color = '#856404';
    errorMessage.style.fontSize = '12px';
    
    const retryButton = document.createElement('button');
    retryButton.className = 'retry-btn';
    retryButton.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21C9.61 21 7.46 19.96 6 18.34" 
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M3 18L6 18.34L6.34 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Dịch lại
    `;
    retryButton.style.cssText = `
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
    `;
    
    retryButton.addEventListener('mouseenter', () => {
        retryButton.style.background = '#0056b3';
        retryButton.style.transform = 'scale(1.05)';
    });
    
    retryButton.addEventListener('mouseleave', () => {
        retryButton.style.background = '#007bff';
        retryButton.style.transform = 'scale(1)';
    });
    
    retryButton.addEventListener('click', async () => {
        retryButton.disabled = true;
        retryButton.innerHTML = 'Đang dịch...';
        retryButton.style.background = '#6c757d';
        
        try {
            const newWordData = await fetchNoteData(originalText, false);
            
            // Loại bỏ thông tin lỗi khỏi wordData trước khi lưu
            const cleanWordData = { ...newWordData };
            delete cleanWordData.hasTranslationError;
            delete cleanWordData.originalText;
            
            noteBox.dataset.wordData = JSON.stringify(cleanWordData);
            updateNoteMeta(noteBox, cleanWordData);
            saveNotes();
            
            console.log('✅ Retry translation successful');
        } catch (error) {
            console.error('❌ Retry translation failed:', error);
            // Tạo lại nút retry nếu vẫn lỗi
            createRetryButton(noteBox, originalText, noteMeta);
        }
    });
    
    retryContainer.appendChild(errorMessage);
    retryContainer.appendChild(retryButton);
    noteMeta.appendChild(retryContainer);
}

function createNoteElement(text, fontSize, existingWordData = null, shouldFetch = true) {
    removeEmptyState();
    const noteBox = document.createElement('div');
    noteBox.className = 'note-box';
    noteBox.dataset.text = text;
    noteBox.dataset.fontSize = fontSize;
    noteBox.dataset.isSpeaking = 'false';
    noteBox.dataset.timestamp = Date.now(); // Thêm timestamp cho note mới

    const noteTopControls = document.createElement('div');
    noteTopControls.className = 'note-top-controls';

    const fontSizeControl = document.createElement('div');
    fontSizeControl.className = 'font-size-control';

    const fontSizeLabel = document.createElement('label');
    fontSizeLabel.className = 'font-size-label';
    fontSizeLabel.textContent = 'Cỡ:';
    const uniqueId = `fontSize-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    fontSizeLabel.htmlFor = uniqueId;

    const fontSizeInput = document.createElement('input');
    fontSizeInput.className = 'font-size-input';
    fontSizeInput.type = 'number';
    fontSizeInput.min = '12';
    fontSizeInput.max = '128';
    fontSizeInput.value = fontSize;
    fontSizeInput.id = uniqueId;
    fontSizeInput.setAttribute('aria-label', 'Cỡ chữ của ghi chú');

    const noteTextSpan = document.createElement('span');

    fontSizeInput.addEventListener('input', () => {
        const newSize = fontSizeInput.value;
        noteTextSpan.style.fontSize = `${newSize}px`;
        noteBox.dataset.fontSize = newSize;
        saveNotes();
    });

    fontSizeControl.appendChild(fontSizeLabel);
    fontSizeControl.appendChild(fontSizeInput);

    const noteControls = document.createElement('div');
    noteControls.className = 'note-controls';

    const speakBtn = document.createElement('button');
    speakBtn.className = 'btn speak-btn';
    speakBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="20px" height="20px"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"></path></svg>';
    speakBtn.title = 'Đọc ghi chú';
    speakBtn.setAttribute('aria-label', 'Đọc ghi chú');
    speakBtn.addEventListener('click', () => {
        if (noteBox.dataset.isSpeaking === 'true') {
            stopSpeaking();
            noteBox.dataset.isSpeaking = 'false';
            speakBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="20px" height="20px"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"></path></svg>';
            speakBtn.title = 'Đọc ghi chú';
        } else {
            speakNote(noteBox.dataset.text, noteBox, speakBtn);
        }
    });

    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn remove-btn';
    removeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="18px" height="18px"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path></svg>';
    removeBtn.title = 'Xóa ghi chú';
    removeBtn.setAttribute('aria-label', 'Xóa ghi chú');
    removeBtn.addEventListener('click', () => {
        stopSpeaking();
        const notesDisplay = document.getElementById('notesDisplay');
        notesDisplay.removeChild(noteBox);
        if (notesDisplay.children.length === 0 || (notesDisplay.children.length === 1 && notesDisplay.firstChild.classList.contains('empty-state'))) {
            showEmptyState();
        }
        saveNotes();
    });

    noteControls.appendChild(speakBtn);
    noteControls.appendChild(removeBtn);

    noteTopControls.appendChild(fontSizeControl);
    noteTopControls.appendChild(noteControls);

    noteTextSpan.className = 'note-text';
    noteTextSpan.spellcheck = false;
    noteTextSpan.textContent = text;
    noteTextSpan.contentEditable = false;
    noteTextSpan.style.fontSize = `${fontSize}px`;
    noteTextSpan.setAttribute('aria-label', 'Nội dung ghi chú, nhấp đúp để chỉnh sửa');

    noteTextSpan.addEventListener('dblclick', () => {
        noteTextSpan.contentEditable = true;
        noteTextSpan.focus();
        noteTextSpan.dataset.originalText = noteTextSpan.textContent;
    });
    
    noteTextSpan.addEventListener('blur', async () => {
        noteTextSpan.contentEditable = false;
        const newText = noteTextSpan.textContent.trim();
        const oldText = noteBox.dataset.text;

        if (newText === oldText) return;

        noteBox.dataset.text = newText;
        const noteMeta = noteBox.querySelector('.note-meta');
        if (newText) {
            noteMeta.textContent = 'Đang tải...';
            try {
                // Khi người dùng tự chỉnh sửa, không áp dụng spell check
                const newWordData = await fetchNoteData(newText, false);
                noteBox.dataset.wordData = JSON.stringify(newWordData);
                updateNoteMeta(noteBox, newWordData);
            } catch (error) {
                console.error('Error fetching data for edited note:', error);
                noteBox.dataset.wordData = JSON.stringify({ phrase: {}, words: {} });
                noteMeta.textContent = 'Lỗi tải dữ liệu.';
            }
        } else {
            noteBox.dataset.wordData = JSON.stringify({ phrase: {}, words: {} });
            updateNoteMeta(noteBox, { phrase: {}, words: {} });
        }
        saveNotes();
    });

    noteTextSpan.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            noteTextSpan.blur();
        } else if (e.key === 'Escape') {
            noteTextSpan.textContent = noteTextSpan.dataset.originalText || noteBox.dataset.text;
            noteTextSpan.contentEditable = false;
            noteTextSpan.blur();
        }
    });

    const noteMeta = document.createElement('div');
    noteMeta.className = 'note-meta';

    noteBox.appendChild(noteTopControls);
    noteBox.appendChild(noteTextSpan);
    noteBox.appendChild(noteMeta);
    
    if (existingWordData) {
        noteBox.dataset.wordData = JSON.stringify(existingWordData);
        updateNoteMeta(noteBox, existingWordData);
    } else if (shouldFetch && text) {
        noteMeta.textContent = 'Đang tải...';
        // Khởi tạo wordData mặc định ngay lập tức để tránh undefined
        noteBox.dataset.wordData = JSON.stringify({ phrase: {}, words: {} });
        
        // Chỉ áp dụng spell check cho note mới (shouldFetch = true)
        fetchNoteData(text, shouldFetch).then(wordData => {
            // Nếu text được sửa chính tả, cập nhật hiển thị
            if (wordData.correctedText && wordData.correctedText !== text) {
                noteTextSpan.textContent = wordData.correctedText;
                noteBox.dataset.text = wordData.correctedText;
                console.log(`📝 Spell corrected: "${text}" → "${wordData.correctedText}"`);
            }
            
            // Loại bỏ correctedText khỏi wordData trước khi lưu (nhưng giữ hasTranslationError để hiển thị nút retry)
            const cleanWordData = { ...wordData };
            delete cleanWordData.correctedText;
            
            noteBox.dataset.wordData = JSON.stringify(cleanWordData);
            updateNoteMeta(noteBox, cleanWordData);
            saveNotes();
        }).catch(error => {
            console.error("❌ Error fetching note data on add:", error);
            // Tạo dữ liệu lỗi để hiển thị nút retry
            const errorWordData = { 
                phrase: {}, 
                words: {}, 
                hasTranslationError: true,
                originalText: text 
            };
            noteBox.dataset.wordData = JSON.stringify(errorWordData);
            updateNoteMeta(noteBox, errorWordData);
            saveNotes();
        });
    } else {
        // Luôn đảm bảo có wordData hợp lệ
        noteBox.dataset.wordData = JSON.stringify({ phrase: {}, words: {} });
        updateNoteMeta(noteBox, { phrase: {}, words: {} });
    }

    // Luôn thêm note mới vào đầu danh sách để đảm bảo mới nhất ở trên
    const notesDisplay = document.getElementById('notesDisplay');
    notesDisplay.insertBefore(noteBox, notesDisplay.firstChild);
    return noteBox;
}

function showEmptyState() {
    const notesDisplay = document.getElementById('notesDisplay');
    if (!notesDisplay.querySelector('.empty-state')) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.textContent = 'Chưa có ghi chú nào. Hãy nhập nội dung bên trên để bắt đầu.';
        notesDisplay.appendChild(emptyState);
    }
}

function removeEmptyState() {
    const notesDisplay = document.getElementById('notesDisplay');
    const emptyState = notesDisplay.querySelector('.empty-state');
    if (emptyState) {
        notesDisplay.removeChild(emptyState);
    }
}

function saveNotes() {
    const notes = [];
    // Lấy notes theo thứ tự từ trên xuống dưới (mới nhất đến cũ nhất)
    document.querySelectorAll('.note-box').forEach(noteBox => {
        try {
            // Kiểm tra và xử lý wordData an toàn hơn
            let wordData = { phrase: {}, words: {} }; // Default value
            
            if (noteBox.dataset.wordData && noteBox.dataset.wordData !== 'undefined') {
                try {
                    const parsedData = JSON.parse(noteBox.dataset.wordData);
                    // Loại bỏ dữ liệu lỗi khi lưu
                    const cleanData = { ...parsedData };
                    delete cleanData.hasTranslationError;
                    delete cleanData.originalText;
                    wordData = cleanData;
                } catch (parseError) {
                    console.warn("Invalid JSON in wordData for note:", noteBox.dataset.text, "- using default");
                    wordData = { phrase: {}, words: {} };
                }
            }
            
            notes.push({
                text: noteBox.dataset.text || '',
                fontSize: noteBox.dataset.fontSize || 18,
                wordData: wordData,
                timestamp: noteBox.dataset.timestamp || Date.now() // Thêm timestamp để sắp xếp
            });
        } catch (e) {
            console.error("Error processing note during save:", noteBox.dataset.text, e);
            notes.push({
                text: noteBox.dataset.text || '',
                fontSize: noteBox.dataset.fontSize || 18,
                wordData: { phrase: {}, words: {} },
                timestamp: Date.now()
            });
        }
    });
    
    // Lưu notes theo thứ tự mới nhất trước (từ trên xuống)
    const initialFontSize = parseInt(document.getElementById('initialFontSize').value, 10);
    localStorage.setItem('notesApp', JSON.stringify({
        notes: notes,
        initialFontSize: initialFontSize
    }));
    
    console.log(`💾 Saved ${notes.length} notes in newest-first order`);
}

// Load notes từ localStorage và hiển thị theo thứ tự mới nhất trước
function loadNotes() {
    try {
        const savedData = localStorage.getItem('notesApp');
        if (savedData) {
            const data = JSON.parse(savedData);
            
            // Khôi phục fontSize ban đầu
            const initialFontSizeInput = document.getElementById('initialFontSize');
            if (data.initialFontSize) {
                initialFontSizeInput.value = data.initialFontSize;
            }
            
            // Khôi phục notes
            if (data.notes && Array.isArray(data.notes)) {
                const notesDisplay = document.getElementById('notesDisplay');
                notesDisplay.innerHTML = '';
                
                // Sắp xếp notes theo timestamp (mới nhất trước) để đảm bảo thứ tự đúng
                const sortedNotes = data.notes.sort((a, b) => {
                    const timestampA = a.timestamp || 0;
                    const timestampB = b.timestamp || 0;
                    return timestampB - timestampA; // Mới nhất trước
                });
                
                console.log(`📂 Loading ${sortedNotes.length} notes in newest-first order`);
                
                // Thêm notes theo thứ tự đã sắp xếp (mới nhất sẽ được thêm vào đầu)
                sortedNotes.forEach((note, index) => {
                    const noteBox = createNoteElement(
                        note.text, 
                        note.fontSize || 18, 
                        note.wordData, 
                        false // Không fetch lại dữ liệu khi load
                    );
                    
                    // Thêm timestamp vào noteBox để theo dõi
                    if (noteBox) {
                        noteBox.dataset.timestamp = note.timestamp || Date.now() - index;
                        const notesDisplay = document.getElementById('notesDisplay');
                        notesDisplay.appendChild(noteBox); // Thêm vào cuối để giữ thứ tự
                    }
                });
            }
        }
        
        // Hiển thị empty state nếu không có notes
        const notesDisplay = document.getElementById('notesDisplay');
        if (notesDisplay.children.length === 0) {
            showEmptyState();
        }
    } catch (error) {
        console.error('Error loading notes:', error);
        showEmptyState();
    }
}

function addNoteBox(text, fontSize, existingWordData = null, shouldFetch = true) {
    const noteBox = createNoteElement(text, fontSize, existingWordData, shouldFetch);
    if (noteBox) {
        const notesDisplay = document.getElementById('notesDisplay');
        // Đảm bảo note mới luôn ở đầu
        if (notesDisplay.firstChild && !notesDisplay.firstChild.classList.contains('empty-state')) {
            notesDisplay.insertBefore(noteBox, notesDisplay.firstChild);
        } else {
            notesDisplay.appendChild(noteBox);
        }
        return noteBox;
    }
    return null;
}

// Load UI state when page loads
document.addEventListener('DOMContentLoaded', function() {
    // UI event listeners
    const textInput = document.getElementById('textInput');
    const postButton = document.getElementById('postButton');
    const initialFontSizeInput = document.getElementById('initialFontSize');
    const hideInputBtn = document.getElementById('hideInputBtn');
    const inputControls = document.getElementById('inputControls');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const exitFullscreenBtn = document.getElementById('exitFullscreenBtn');
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const fileInput = document.getElementById('fileInput');
    const clearAllBtn = document.getElementById('clearAllBtn');

    postButton.addEventListener('click', async () => {
        const text = textInput.value.trim();
        if (text) {
            postButton.classList.add('loading');
            postButton.disabled = true;
            try {
                await addNoteBox(text, parseInt(initialFontSizeInput.value, 10), null, true);
                textInput.value = '';
                textInput.focus();
                saveNotes();
            } catch (error) {
                console.error("Error posting note:", error);
            } finally {
                postButton.classList.remove('loading');
                postButton.disabled = false;
            }
        }
    });

    textInput.addEventListener('keypress', (e) => {
        const isPC = !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (e.key === 'Enter') {
            if (e.shiftKey) {
                // Shift + Enter: đăng ghi chú
                e.preventDefault();
                postButton.click();
            }
            // Enter trên PC và mobile: xuống dòng (mặc định)
        }
    });
    
    initialFontSizeInput.addEventListener('change', () => {
        const saveUIState = () => {
            const uiState = {
                inputControlsHidden: inputControls.classList.contains('hidden'),
                initialFontSize: parseInt(initialFontSizeInput.value, 10),
                hideInputBtnText: hideInputBtn.querySelector('span').textContent
            };
            localStorage.setItem('notesAppUIState', JSON.stringify(uiState));
        };
        saveUIState(); // Lưu trạng thái UI khi thay đổi
    });

    hideInputBtn.addEventListener('click', () => {
        inputControls.classList.toggle('hidden');
        hideInputBtn.querySelector('span').textContent = 
            inputControls.classList.contains('hidden') ? 'Show' : 'Hide';
        const saveUIState = () => {
            const uiState = {
                inputControlsHidden: inputControls.classList.contains('hidden'),
                initialFontSize: parseInt(initialFontSizeInput.value, 10),
                hideInputBtnText: hideInputBtn.querySelector('span').textContent
            };
            localStorage.setItem('notesAppUIState', JSON.stringify(uiState));
        };
        saveUIState(); // Lưu trạng thái UI khi thay đổi
    });

    fullscreenBtn.addEventListener('click', () => {
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
        }
        fullscreenBtn.style.display = 'none';
        exitFullscreenBtn.style.display = 'block';
    });

    exitFullscreenBtn.addEventListener('click', () => {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
        fullscreenBtn.style.display = 'block';
        exitFullscreenBtn.style.display = 'none';
    });

    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement) {
            fullscreenBtn.style.display = 'block';
            exitFullscreenBtn.style.display = 'none';
        }
    });

    exportBtn.addEventListener('click', async () => {
        const date = new Date().toLocaleDateString('en-US', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
        const notesDisplay = document.getElementById('notesDisplay');
        const notesHtml = notesDisplay.innerHTML;
        const styles = document.querySelector('style').textContent;
        
        // Create simple HTML export
        const htmlContent = `<!DOCTYPE html><html><head><title>Notes - ${date}</title><style>${styles}</style></head><body><div class="container"><div class="notes-area"><div id="notesDisplay">${notesHtml}</div></div></div></body></html>`;
        
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Note_${date}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    importBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const content = event.target.result;
            
            if (file.name.endsWith('.html')) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(content, 'text/html');
                const importedNotes = doc.querySelectorAll('.note-box');
                if (importedNotes.length > 0) {
                    const notesDisplay = document.getElementById('notesDisplay');
                    notesDisplay.innerHTML = '';
                    
                    // Chuyển đổi NodeList thành Array và đảo ngược để import đúng thứ tự
                    const notesArray = Array.from(importedNotes).reverse();
                    
                    notesArray.forEach((note, index) => {
                        const text = note.dataset.text;
                        const fontSize = parseInt(note.dataset.fontSize) || 18;
                        const wordData = note.dataset.wordData ? JSON.parse(note.dataset.wordData) : null;
                        const timestamp = note.dataset.timestamp || (Date.now() - (notesArray.length - index));
                        
                        const noteBox = addNoteBox(text, fontSize, wordData, false);
                        if (noteBox) {
                            noteBox.dataset.timestamp = timestamp;
                        }
                    });
                    saveNotes();
                }
            } else if (file.name.endsWith('.json')) {
                try {
                    const data = JSON.parse(content);
                    const notesDisplay = document.getElementById('notesDisplay');
                    notesDisplay.innerHTML = '';
                    if (Array.isArray(data.notes)) {
                        // Sắp xếp notes theo timestamp (mới nhất trước) trước khi import
                        const sortedNotes = data.notes.sort((a, b) => {
                            const timestampA = a.timestamp || 0;
                            const timestampB = b.timestamp || 0;
                            return timestampB - timestampA;
                        });
                        
                        // Import notes theo thứ tự mới nhất trước
                        sortedNotes.reverse().forEach((note, index) => {
                            const noteBox = addNoteBox(note.text, note.fontSize, note.wordData, false);
                            if (noteBox) {
                                noteBox.dataset.timestamp = note.timestamp || (Date.now() - index);
                            }
                        });
                        
                        if (data.initialFontSize) {
                            const initialFontSizeInput = document.getElementById('initialFontSize');
                            initialFontSizeInput.value = parseInt(data.initialFontSize, 10);
                        }
                        saveNotes();
                    }
                } catch (error) {
                    console.error('Error parsing JSON:', error);
                    alert('Lỗi khi đọc file JSON. Vui lòng kiểm tra định dạng file.');
                }
            }
        };
        reader.readAsText(file);
    });
    
    clearAllBtn.addEventListener('click', () => {
        if (confirm('Bạn có chắc muốn xóa tất cả ghi chú?')) {
            const notesDisplay = document.getElementById('notesDisplay');
            notesDisplay.innerHTML = '<div class="empty-state">Chưa có ghi chú nào. Hãy nhập nội dung bên trên để bắt đầu.</div>';
            localStorage.removeItem('notesApp');
            // Không xóa UI state khi xóa notes
        }
    });
});
