var gk_isXlsx = false;
var gk_xlsxFileLookup = {};
var gk_fileData = {};

function filledCell(cell) {
    return cell !== '' && cell != null;
}

function loadFileData(filename) {
    if (gk_isXlsx && gk_xlsxFileLookup[filename]) {
        try {
            var workbook = XLSX.read(gk_fileData[filename], { type: 'base64' });
            var firstSheetName = workbook.SheetNames[0];
            var worksheet = workbook.Sheets[firstSheetName];

            var jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false, defval: '' });
            var filteredData = jsonData.filter(row => row.some(filledCell));

            var headerRowIndex = filteredData.findIndex((row, index) =>
                row.filter(filledCell).length >= filteredData[index + 1]?.filter(filledCell).length
            );
            if (headerRowIndex === -1 || headerRowIndex > 25) {
                headerRowIndex = 0;
            }

            var csv = XLSX.utils.aoa_to_sheet(filteredData.slice(headerRowIndex));
            csv = XLSX.utils.sheet_to_csv(csv, { header: 1 });
            return csv;
        } catch (e) {
            console.error('Error processing XLSX:', e);
            return "";
        }
    }
    return gk_fileData[filename] || "";
}

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
    let initialFontSize = parseInt(initialFontSizeInput.value, 10);

    function createHtmlContent(date, notesHtml, styles) {
        const mobileStyles = `
            @media (max-width: 480px) {
                .note-text {
                    font-size: 32px !important;
                }
                .note-meta {
                    font-size: 16px !important;
                }
            }
        `;

        // Loại bỏ nút xóa khỏi HTML
        const processedNotesHtml = notesHtml.replace(/<button[^>]*class="[^"]*remove-btn[^"]*"[^>]*>.*?<\/button>/gs, '');

        const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ghi chú - ${date}</title>
    <style>
        ${styles}
        ${mobileStyles}
        .font-size-control {
            display: flex;
            align-items: center;
            gap: 4px;
            margin-bottom: 10px;
        }
        .font-size-label {
            font-weight: bold;
            color: #202124;
            font-size: 14px;
        }
        .font-size-input {
            width: 50px;
            padding: 4px;
            border: 1px solid #ddd;
            border-radius: 8px;
            text-align: center;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="notes-area">
            <div id="notesDisplay">${processedNotesHtml}</div>
        </div>
    </div>
    <script>
        let currentSpeech = null;
        let voices = [];

        // Hàm khởi tạo voices
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
            
            if (isIOS) {
                // Tìm giọng Siri trên iOS
                return voices.find(voice => 
                    voice.lang === 'en-US' && voice.name.includes('Siri')
                ) || voices.find(voice => voice.lang === 'en-US');
            } else if (isAndroid) {
                // Tìm giọng Google trên Android
                return voices.find(voice => 
                    voice.lang === 'en-US' && voice.name.includes('Google')
                ) || voices.find(voice => voice.lang === 'en-US');
            } else {
                // PC: tìm giọng tiếng Anh Mỹ
                return voices.find(voice => voice.lang === 'en-US');
            }
        }

        function stopSpeaking() {
            if (currentSpeech) {
                speechSynthesis.cancel();
                currentSpeech = null;
            }
        }

        async function speakNote(text, noteBox, speakButton) {
            stopSpeaking();
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = 0.7;
            
            try {
                const voice = await getVoice();
                if (voice) {
                    utterance.voice = voice;
                }
            } catch (error) {
                console.warn('Không thể tìm giọng đọc phù hợp:', error);
            }

            currentSpeech = utterance;

            // Cập nhật trạng thái nút
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

            speechSynthesis.speak(utterance);
        }

        // Xử lý chỉnh cỡ chữ
        document.querySelectorAll('.font-size-input').forEach(input => {
            input.addEventListener('input', () => {
                const noteBox = input.closest('.note-box');
                const noteText = noteBox.querySelector('.note-text');
                const newSize = input.value;
                noteText.style.setProperty('--original-font-size', newSize + 'px');
                noteText.style.fontSize = newSize + 'px';
            });
        });

        // Xử lý nút đọc
        document.querySelectorAll('.speak-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const noteBox = btn.closest('.note-box');
                if (noteBox.dataset.isSpeaking === 'true') {
                    stopSpeaking();
                    noteBox.dataset.isSpeaking = 'false';
                    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="20px" height="20px"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"></path></svg>';
                    btn.title = 'Đọc ghi chú';
                } else {
                    speakNote(noteBox.dataset.text, noteBox, btn);
                }
            });
        });

        // Khởi tạo voices khi trang load
        initVoices();
    </script>
</body>
</html>`;

        return htmlContent;
    }

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

        try {
            const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(text)}`);
            if (response.ok) {
                const data = await response.json();
                const entry = data[0];
                phonetic = entry.phonetic || (entry.phonetics?.find(p => p.text)?.text) || '';
                phonetic = phonetic.replace(/^\/|\/$/g, '');
            }
        } catch (error) {
            console.warn(`Free Dictionary API error for "${text}":`, error);
        }

        if (!text.includes(' ')) {
            try {
                const response = await fetch(`https://www.dictionaryapi.com/api/v3/references/collegiate/json/${text}?key=${MW_API_KEY}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.length > 0 && typeof data[0] === 'object') {
                        let entry = data[0];
                        if (commonVerbs.has(text.toLowerCase())) {
                            const verbEntry = data.find(item => typeof item === 'object' && item.fl === 'verb');
                            if (verbEntry) entry = verbEntry;
                        }
                        pos = posAbbreviations[entry.fl] || entry.fl || '';
                    }
                }
            } catch (error) {
                console.warn(`Merriam-Webster API error for "${text}":`, error);
            }
        }

        translation = await fetchTranslation(text);
        return { phonetic, pos, translation };
    }

    async function fetchNoteData(text) {
        const trimmedText = text.trim();
        if (!trimmedText) return { phrase: {}, words: {} };

        const periodCount = (trimmedText.match(/\./g) || []).length;
        const wordCount = trimmedText.split(/\s+/).filter(word => word.match(/^[a-zA-Z'-]+$/)).length;

        if (periodCount > 1 || wordCount > 7) {
            const phraseTranslation = await fetchTranslation(trimmedText);
            return { phrase: { translation: phraseTranslation }, words: {} };
        }

        const wordData = { phrase: {}, words: {} };
        wordData.phrase = await fetchWordData(trimmedText);

        if (wordCount > 1) {
            const words = trimmedText.split(/\s+/).filter(word => word.match(/^[a-zA-Z'-]+$/));
            for (const word of words) {
                const cleanedWord = word.toLowerCase().replace(/[^a-z'-]/g, '');
                if (cleanedWord) {
                    const wordInfo = await fetchWordData(cleanedWord);
                    wordData.words[cleanedWord] = { phonetic: wordInfo.phonetic, pos: wordInfo.pos };
                }
            }
        }
        return wordData;
    }

    function updateNoteMeta(noteBox, wordData) {
        const noteMeta = noteBox.querySelector('.note-meta');
        if (!noteMeta) return;

        noteMeta.innerHTML = '';
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
                    if (data.phonetic) wordHtml += `<span class="phonetic">/${data.phonetic}/</span>`;
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

    function createNoteElement(text, fontSize, existingWordData = null, shouldFetch = true) {
        removeEmptyState();
        const noteBox = document.createElement('div');
        noteBox.className = 'note-box';
        noteBox.dataset.text = text;
        noteBox.dataset.fontSize = fontSize;
        noteBox.dataset.isSpeaking = 'false';

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
                btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="20px" height="20px"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"></path></svg>';
                    btn.title = 'Đọc ghi chú';
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
            if (newText) {
                noteMeta.textContent = 'Đang tải...';
                const newWordData = await fetchNoteData(newText);
                noteBox.dataset.wordData = JSON.stringify(newWordData);
                updateNoteMeta(noteBox, newWordData);
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
            fetchNoteData(text).then(wordData => {
                noteBox.dataset.wordData = JSON.stringify(wordData);
                updateNoteMeta(noteBox, wordData);
                saveNotes();
            }).catch(error => {
                console.error("Error fetching note data on add:", error);
                noteMeta.textContent = 'Lỗi tải dữ liệu.';
                saveNotes();
            });
        } else if (!text) {
            noteBox.dataset.wordData = JSON.stringify({ phrase: {}, words: {} });
            updateNoteMeta(noteBox, { phrase: {}, words: {} });
        }

        notesDisplay.insertBefore(noteBox, notesDisplay.firstChild);
        return noteBox;
    }

    function showEmptyState() {
        if (!notesDisplay.querySelector('.empty-state')) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.textContent = 'Chưa có ghi chú nào. Hãy nhập nội dung bên trên để bắt đầu.';
            notesDisplay.appendChild(emptyState);
        }
    }

    function removeEmptyState() {
        const emptyState = notesDisplay.querySelector('.empty-state');
        if (emptyState) {
            notesDisplay.removeChild(emptyState);
        }
    }

    function saveNotes() {
        const notes = [];
        document.querySelectorAll('.note-box').forEach(noteBox => {
            try {
                const wordData = JSON.parse(noteBox.dataset.wordData);
                notes.push({
                    text: noteBox.dataset.text,
                    fontSize: noteBox.dataset.fontSize,
                    wordData: wordData
                });
            } catch (e) {
                console.error("Error parsing wordData during save for note:", noteBox.dataset.text, e);
                notes.push({
                    text: noteBox.dataset.text,
                    fontSize: noteBox.dataset.fontSize,
                    wordData: { phrase: {}, words: {} }
                });
            }
        });
        localStorage.setItem('notesApp', JSON.stringify({
            notes: notes,
            initialFontSize: initialFontSize
        }));
    }

    function loadNotes() {
        const data = localStorage.getItem('notesApp');
        if (data) {
            const parsedData = JSON.parse(data);
            if (parsedData.initialFontSize) {
                initialFontSize = parseInt(parsedData.initialFontSize, 10);
                initialFontSizeInput.value = initialFontSize;
            }
            if (parsedData.notes && parsedData.notes.length > 0) {
                parsedData.notes.forEach(note => {
                    addNoteBox(note.text, parseInt(note.fontSize, 10), note.wordData, false);
                });
                removeEmptyState();
            } else {
                showEmptyState();
            }
        } else {
            showEmptyState();
        }
    }

    function addNoteBox(text, fontSize, existingWordData = null, shouldFetch = true) {
        const noteBox = createNoteElement(text, fontSize, existingWordData, shouldFetch);
        if (noteBox) {
            notesDisplay.insertBefore(noteBox, notesDisplay.firstChild);
            return noteBox;
        }
        return null;
    }

    postButton.addEventListener('click', async () => {
        const text = textInput.value.trim();
        if (text) {
            postButton.classList.add('loading');
            postButton.disabled = true;
            try {
                await addNoteBox(text, initialFontSize, null, true);
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
        initialFontSize = parseInt(initialFontSizeInput.value, 10);
    });

    hideInputBtn.addEventListener('click', () => {
        inputControls.classList.toggle('hidden');
        hideInputBtn.querySelector('span').textContent = 
            inputControls.classList.contains('hidden') ? 'Show' : 'Hide';
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

    exportBtn.addEventListener('click', () => {
        const date = new Date().toLocaleDateString('en-US', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
        const notesHtml = notesDisplay.innerHTML;
        const styles = document.querySelector('style').textContent;
        const htmlContent = createHtmlContent(date, notesHtml, styles);
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
                    notesDisplay.innerHTML = '';
                    importedNotes.forEach(note => {
                        const text = note.dataset.text;
                        const fontSize = parseInt(note.dataset.fontSize) || initialFontSize;
                        const wordData = note.dataset.wordData ? JSON.parse(note.dataset.wordData) : null;
                        addNoteBox(text, fontSize, wordData, false);
                    });
                    saveNotes();
                }
            } else if (file.name.endsWith('.json')) {
                try {
                    const data = JSON.parse(content);
                    notesDisplay.innerHTML = '';
                    if (Array.isArray(data.notes)) {
                        data.notes.forEach(note => {
                            addNoteBox(note.text, note.fontSize, note.wordData, false);
                        });
                        if (data.initialFontSize) {
                            initialFontSize = parseInt(data.initialFontSize, 10);
                            initialFontSizeInput.value = initialFontSize;
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
            notesDisplay.innerHTML = '<div class="empty-state">Chưa có ghi chú nào. Hãy nhập nội dung bên trên để bắt đầu.</div>';
            localStorage.removeItem('notesApp');
        }
    });

    // Load saved notes when page loads
    loadNotes();
}); 
