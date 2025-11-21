

const GEMINI_API_KEY = secrets.GEMINI_API;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Hàm gọi API Gemini để dịch văn bản
async function fetchGeminiTranslation(text) {
    if (!text || /^\s*$/.test(text)) return '';
    
    try {
        const isVietnamese = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(text);
        const targetLang = isVietnamese ? 'English' : 'Vietnamese';
        const sourceLang = isVietnamese ? 'Vietnamese' : 'English';
        
        const prompt = `Translate the following ${sourceLang} text to ${targetLang}. Return only the translation without any additional explanation or formatting:

${text}`;

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.1,
                    topK: 1,
                    topP: 1,
                    maxOutputTokens: 3000,
                }
            })
        });

        if (response.ok) {
            const data = await response.json();
            const translatedText = data.candidates[0].content.parts[0].text.trim();
            return translatedText;
        } else {
            throw new Error(`Gemini API error: ${response.status}`);
        }
    } catch (error) {
        console.warn(`Gemini Translation API error for "${text}":`, error);
        throw error;
    }
}

// Hàm thông minh phân tích từ/cụm từ bằng Gemini với một request duy nhất
async function fetchGeminiSmartAnalysis(text) {
    if (!text || /^\s*$/.test(text)) return { phrase: {}, words: {} };
    
    try {
        const wordCount = text.split(/\s+/).filter(word => word.match(/^[a-zA-Z'-]+$/)).length;
        
        // Tạo prompt thông minh dựa trên số từ
        let prompt;
        
        if (wordCount === 1) {
            // Đơn từ - phân tích chi tiết
            prompt = `Analyze this English word comprehensively:

Word: "${text}"

Provide detailed linguistic analysis in JSON format:
{
  "type": "single_word",
  "phrase": {
    "phonetic": "IPA_transcription_without_forward_slashes",
    "pos": "abbreviated_part_of_speech",
    "translation": "accurate_vietnamese_translation"
  },
  "words": {}
}

Part of speech abbreviations: n=noun, v=verb, adj=adjective, adv=adverb, prep=preposition, conj=conjunction, pron=pronoun, int=interjection

Requirements:
- Phonetic must be accurate IPA without / /
- Translation must be natural Vietnamese
- Consider word context and common usage`;

        } else if (wordCount >= 2 && wordCount <= 9) {
            // Cụm từ 2-9 từ - phân tích thông minh
            prompt = `Analyze this English phrase with advanced linguistic intelligence:

Phrase: "${text}"

Apply these decision rules:
1. IDIOMS & FIXED EXPRESSIONS: "break up", "look forward to", "by the way" → treat as single semantic unit
2. PHRASAL VERBS: "give up", "turn on", "look after" → treat as single unit  
3. COMPOUND CONCEPTS: "ice cream", "coffee shop", "high school" → treat as single unit
4. TECHNICAL TERMS: "machine learning", "data science" → treat as single unit
5. SIMPLE COMBINATIONS: "beautiful house", "red car" → analyze separately

Return JSON format:
{
  "type": "phrase_as_unit" OR "phrase_separate_words",
  "phrase": {
    "phonetic": "IPA_for_whole_phrase_if_single_unit_otherwise_empty",
    "pos": "part_of_speech_if_single_unit_otherwise_empty",
    "translation": "vietnamese_translation_of_complete_phrase"
  },
  "words": {
    "word1": {"phonetic": "IPA", "pos": "abbreviated_pos"},
    "word2": {"phonetic": "IPA", "pos": "abbreviated_pos"}
  }
}

Decision logic:
- IF phrase is idiom/phrasal verb/compound → type="phrase_as_unit", fill phrase completely, words={}
- IF phrase is simple word combination → type="phrase_separate_words", fill phrase.translation + all words

Part of speech: n, v, adj, adv, prep, conj, pron, int
Ensure phonetic accuracy and natural Vietnamese translations.`;
        } else {
            // Fallback cho trường hợp bất thường
            return { 
                phrase: { 
                    phonetic: '', 
                    pos: '', 
                    translation: await fetchGeminiTranslation(text) 
                }, 
                words: {} 
            };
        }

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],                generationConfig: {
                    temperature: 0.2, // Tăng một chút để linh hoạt hơn
                    topK: 1,
                    topP: 0.95,
                    maxOutputTokens: 3000, // Tăng để xử lý được nhiều từ hơn
                }
            })
        });

        if (response.ok) {
            const data = await response.json();
            const responseText = data.candidates[0].content.parts[0].text.trim();
            
            // Parse JSON response với error handling tốt hơn
            try {
                // Tìm JSON block chính xác hơn
                const jsonMatch = responseText.match(/\{[\s\S]*?\}(?=\s*$|\s*```|\s*\n\n)/);
                if (jsonMatch) {
                    const parsedData = JSON.parse(jsonMatch[0]);
                    
                    // Đảm bảo cấu trúc trả về đúng format cho app.js
                    const result = {
                        phrase: {
                            phonetic: parsedData.phrase?.phonetic || '',
                            pos: parsedData.phrase?.pos || '',
                            translation: parsedData.phrase?.translation || ''
                        },
                        words: parsedData.words || {}
                    };
                    
                    // Validate kết quả trước khi trả về
                    if (!result.phrase.translation) {
                        throw new Error('Missing translation in AI response');
                    }
                    
                    console.log(`✓ AI Smart Analysis for "${text}":`, parsedData.type || 'unknown', result);
                    return result;
                }
                
                // Nếu không parse được JSON, thử extract translation từ text
                const translationMatch = responseText.match(/translation["']?\s*:\s*["']([^"']+)["']/i);
                if (translationMatch) {
                    return { 
                        phrase: { phonetic: '', pos: '', translation: translationMatch[1] }, 
                        words: {} 
                    };
                }
                
                throw new Error('Cannot parse AI response');
                
            } catch (parseError) {
                console.warn('⚠️ Error parsing Gemini smart analysis JSON:', parseError);
                console.warn('Raw response:', responseText);
                
                // Fallback: dùng dịch đơn giản
                const translation = await fetchGeminiTranslation(text);
                return { 
                    phrase: { phonetic: '', pos: '', translation }, 
                    words: {} 
                };
            }
        } else {
            throw new Error(`Gemini API error: ${response.status} - ${response.statusText}`);
        }
    } catch (error) {
        console.warn(`❌ Gemini Smart Analysis API error for "${text}":`, error);
        throw error;
    }
}

// Hàm lấy dữ liệu ghi chú sử dụng Gemini thông minh (thay thế cho fetchNoteData gốc)
async function fetchNoteDataWithGemini(text, isNewNote = true) {
    let processedText = text.trim();
    if (!processedText) return { phrase: {}, words: {} };

    let hasSpellCorrection = false;
    
    // Sửa lỗi chính tả chỉ cho note mới, không cho note đã chỉnh sửa
    if (isNewNote) {
        try {
            const spellCheckedText = await fetchGeminiSpellCheck(processedText);
            if (spellCheckedText !== processedText) {
                processedText = spellCheckedText;
                hasSpellCorrection = true;
                console.log(`📝 Spell correction applied: "${text.trim()}" → "${processedText}"`);
            }
        } catch (spellError) {
            console.warn('⚠️ Spell check failed, using original text:', spellError);
            processedText = text.trim();
        }
    }

    const periodCount = (processedText.match(/\./g) || []).length;
    const wordCount = processedText.split(/\s+/).filter(word => word.match(/^[a-zA-Z'-]+$/)).length;

    // Nếu là đoạn văn dài (từ 10 từ trở lên hoặc nhiều câu), chỉ dịch nghĩa
    if (periodCount > 1 || wordCount >= 10) {
        try {
            const phraseTranslation = await fetchGeminiTranslation(processedText);
            const result = { 
                phrase: { 
                    phonetic: '', 
                    pos: '', 
                    translation: phraseTranslation 
                }, 
                words: {}
            };
            
            // Thêm thông tin text đã sửa nếu có
            if (hasSpellCorrection) {
                result.correctedText = processedText;
            }
            
            return result;
        } catch (error) {
            throw error;
        }
    }

    // Sử dụng phân tích thông minh cho từ đơn và cụm từ (1-9 từ)
    try {
        const result = await fetchGeminiSmartAnalysis(processedText);
        
        // Thêm thông tin text đã sửa nếu có spell correction
        if (hasSpellCorrection) {
            result.correctedText = processedText;
        }
        
        console.log(`✅ Smart analysis completed for "${processedText}":`, {
            hasPhonetic: !!result.phrase?.phonetic,
            hasPos: !!result.phrase?.pos,
            hasTranslation: !!result.phrase?.translation,
            wordCount: Object.keys(result.words || {}).length,
            spellCorrected: hasSpellCorrection
        });
        
        return result;
    } catch (error) {
        throw error;
    }
}

// Hàm sửa lỗi chính tả thông minh (chỉ dành cho note mới)
async function fetchGeminiSpellCheck(text) {
    if (!text || /^\s*$/.test(text)) return text;
    
    try {
        // Chỉ kiểm tra text tiếng Anh
        const hasEnglishWords = /[a-zA-Z]{2,}/.test(text);
        if (!hasEnglishWords) return text;        const prompt = `Fix ONLY spelling errors in this text. Do NOT change grammar, sentence structure, or word choices. Return the corrected text exactly as provided, but with spelling mistakes fixed.

Text to check: ${text}

CRITICAL RULES:
1. Fix ONLY obvious spelling mistakes (misspelled words)
2. Do NOT change grammar or sentence structure  
3. Do NOT rephrase or improve the text
4. Do NOT change punctuation unless it's clearly wrong
5. Keep the exact same meaning and style
6. Do NOT add quotes, formatting, or any extra characters
7. If no spelling errors found, return the original text unchanged
8. Return ONLY the corrected text, nothing else

Corrected text:`;

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],                generationConfig: {
                    temperature: 0.1, // Thấp để đảm bảo không thay đổi nhiều
                    topK: 1,
                    topP: 0.8,
                    maxOutputTokens: 3000, // Tăng để xử lý text dài hơn
                }
            })
        });        if (response.ok) {
            const data = await response.json();
            let correctedText = data.candidates[0].content.parts[0].text.trim();
            
            // Loại bỏ dấu ngoặc kép thừa từ AI response
            correctedText = correctedText.replace(/^["'`]+|["'`]+$/g, ''); // Remove quotes
            
            // Kiểm tra xem có thay đổi quá nhiều không (tránh AI thay đổi ngữ pháp)
            const originalWords = text.toLowerCase().split(/\s+/);
            const correctedWords = correctedText.toLowerCase().split(/\s+/);
            
            // Nếu số từ thay đổi quá nhiều hoặc độ dài khác biệt quá lớn, giữ nguyên
            if (Math.abs(originalWords.length - correctedWords.length) > 1 || 
                Math.abs(text.length - correctedText.length) > text.length * 0.3) {
                console.log(`⚠️ Spell check rejected (too many changes): "${text}" → "${correctedText}"`);
                return text;
            }
            
            // Chỉ áp dụng nếu có thay đổi nhỏ và hợp lý
            if (correctedText !== text && correctedText.length > 0) {
                console.log(`✓ Spell check applied: "${text}" → "${correctedText}"`);
                return correctedText;
            }
            
            return text;
        } else {
            console.warn('Spell check API error:', response.status);
            return text;
        }
    } catch (error) {
        console.warn('Spell check error:', error);
        return text;
    }
}

// Hàm tạo đoạn văn mẫu ngẫu nhiên để luyện tập
async function generateRandomSample() {
    try {
        const sampleTypes = [
            'single_word',
            'phrasal_verb', 
            'idiom',
            'compound_word',
            'simple_phrase',
            'short_sentence',
            'technical_term',
            'daily_conversation',
            'short_paragraph',
            'vocabulary_list'
        ];

        const randomType = sampleTypes[Math.floor(Math.random() * sampleTypes.length)];
          const prompts = {
            single_word: "Generate 1 random English word that is commonly used but not too easy (intermediate level). Return only the word without quotes.",
            
            phrasal_verb: "Generate 1 random English phrasal verb (like give up, look after, turn on). Return only the phrasal verb without quotes.",
            
            idiom: "Generate 1 random English idiom or fixed expression (like break the ice, piece of cake). Return only the idiom without quotes.",
            
            compound_word: "Generate 1 random English compound word or compound noun (like smartphone, coffee shop, ice cream). Return only the compound word without quotes.",
            
            simple_phrase: "Generate 1 random simple English phrase with 2-4 words (like beautiful garden, heavy rain, delicious food). Return only the phrase without quotes.",
            
            short_sentence: "Generate 1 random short English sentence with 5-8 words that is useful for daily life. Return only the sentence without quotes.",
            
            technical_term: "Generate 1 random technical English term from fields like technology, science, or business (like machine learning, data analysis). Return only the term without quotes.",
            
            daily_conversation: "Generate 1 random English phrase commonly used in daily conversation (like How are you, Nice to meet you). Return only the phrase without quotes.",            
            short_paragraph: "Generate a short English paragraph (2-3 sentences, 15-25 words total) about a common daily topic like weather, food, travel, or work. Use simple but useful vocabulary for English learners. IMPORTANT: Keep all punctuation marks (periods, commas) in the paragraph. Return only the complete paragraph with proper punctuation.",
            
            vocabulary_list: "Generate 3-5 related English words from the same topic (like emotions: happy, sad, excited, nervous, calm). Choose from topics like: colors, animals, food, weather, emotions, family, or school. Return only the words separated by commas without quotes."
        };        const prompt = `${prompts[randomType]}

Requirements:
- Must be useful for English learning
- Should be commonly used in real situations
- Avoid overly simple or overly complex terms
- For paragraphs: ALWAYS keep punctuation marks (periods, commas, etc.)
- For single words/phrases: Return clean text without quotes or unnecessary punctuation
- Return ONLY the raw text without quotes, explanations, prefixes, or additional formatting
- Do NOT include explanations, prefixes, or additional text`;

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.8, // Higher for more creativity
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 3000,
                }
            })
        });        if (response.ok) {
            const data = await response.json();
            let sampleText = data.candidates[0].content.parts[0].text.trim();
            
            // Clean up the response - loại bỏ dấu ngoặc kép và các ký tự không cần thiết
            sampleText = sampleText.replace(/^["'`]|["'`]$/g, ''); // Remove quotes and backticks
            sampleText = sampleText.replace(/^\s*[-•]\s*/, ''); // Remove bullet points
            sampleText = sampleText.replace(/^Sample:\s*/i, ''); // Remove "Sample:" prefix
            sampleText = sampleText.replace(/^Answer:\s*/i, ''); // Remove "Answer:" prefix
            sampleText = sampleText.replace(/^Result:\s*/i, ''); // Remove "Result:" prefix
            
            // Chỉ loại bỏ dấu chấm cuối nếu là từ đơn hoặc cụm từ ngắn (không phải đoạn văn)
            if (randomType !== 'short_paragraph' && randomType !== 'short_sentence') {
                sampleText = sampleText.replace(/\.$/, ''); // Remove ending period for single words/phrases
            }
            
            console.log(`🎲 Generated ${randomType} sample: "${sampleText}"`);
            return sampleText;
        } else {
            throw new Error(`Gemini API error: ${response.status}`);
        }
    } catch (error) {
        console.warn('❌ Error generating sample:', error);        // Fallback samples if API fails - Expanded collection
        const fallbackSamples = [
            // Single words - intermediate level
            'achievement', 'opportunity', 'experience', 'environment', 'relationship',
            'challenge', 'knowledge', 'situation', 'development', 'responsibility',
            'communication', 'information', 'organization', 'technology', 'education',
            'performance', 'creativity', 'independence', 'confidence', 'patience',
            'understanding', 'improvement', 'collaboration', 'motivation', 'inspiration',
            
            // Phrasal verbs
            'give up', 'look forward to', 'break down', 'turn on', 'turn off',
            'put on', 'take off', 'look after', 'look for', 'pick up',
            'drop off', 'set up', 'clean up', 'wake up', 'get up',
            'go out', 'come back', 'run into', 'find out', 'figure out',
            'work out', 'hang out', 'show up', 'catch up', 'keep up',
            'bring up', 'grow up', 'cut down', 'slow down', 'calm down',
            
            // Idioms and fixed expressions
            'break the ice', 'piece of cake', 'hit the books', 'under the weather',
            'once in a blue moon', 'spill the beans', 'bite the bullet', 'cost an arm and a leg',
            'it\'s raining cats and dogs', 'kill two birds with one stone', 'let the cat out of the bag',
            'the ball is in your court', 'break a leg', 'better late than never',
            'don\'t count your chickens before they hatch', 'every cloud has a silver lining',
            'when pigs fly', 'you can\'t judge a book by its cover', 'actions speak louder than words',
            
            // Compound words and nouns
            'smartphone', 'coffee shop', 'ice cream', 'homework', 'breakfast',
            'classroom', 'backpack', 'laptop', 'birthday', 'weekend',
            'sunglasses', 'basketball', 'football', 'keyboard', 'toothbrush',
            'bookstore', 'supermarket', 'airport', 'newspaper', 'headphones',
            'raincoat', 'sneakers', 'doorbell', 'playground', 'earthquake',
            
            // Simple phrases (2-4 words)
            'beautiful morning', 'heavy rain', 'delicious food', 'comfortable chair',
            'interesting book', 'difficult question', 'friendly neighbor', 'busy street',
            'clean water', 'fresh air', 'warm weather', 'cold winter',
            'bright light', 'dark room', 'loud music', 'quiet place',
            'fast car', 'slow train', 'big house', 'small apartment',
            'good idea', 'bad news', 'new job', 'old friend',
            
            // Technical terms
            'machine learning', 'artificial intelligence', 'data analysis', 'computer science',
            'software development', 'digital marketing', 'cloud computing', 'cyber security',
            'project management', 'quality control', 'customer service', 'human resources',
            'social media', 'renewable energy', 'climate change', 'sustainable development',
            'virtual reality', 'augmented reality', 'blockchain technology', 'internet of things',
            
            // Daily conversation phrases
            'How are you?', 'Nice to meet you', 'Have a good day', 'See you later',
            'What\'s your name?', 'Where are you from?', 'How old are you?', 'What time is it?',
            'Thank you very much', 'You\'re welcome', 'Excuse me', 'I\'m sorry',
            'Can you help me?', 'I don\'t understand', 'Could you repeat that?', 'No problem',
            'Good morning', 'Good afternoon', 'Good evening', 'Good night',
            'How was your day?', 'What did you do today?', 'I had a great time',
            
            // Short sentences (5-8 words)
            'I love learning new languages every day.', 'The weather is beautiful this morning.',
            'She works at a big company.', 'We went shopping last weekend together.',
            'He enjoys reading books in English.', 'They are planning a vacation trip.',
            'My family likes to eat together.', 'Students study hard for their exams.',
            'I need to buy some groceries.', 'The movie was really interesting tonight.',
            'Can you pass me the salt?', 'I\'m looking forward to tomorrow.',
            'She speaks three languages very well.', 'We should exercise more often.',
              // Short paragraphs with punctuation - Enhanced with diverse tenses
            'The weather is nice today. I want to go for a walk in the park.',
            'Yesterday was a busy day at work. I had many meetings to attend.',
            'I love eating fresh fruit. Apples and oranges are my favorite.',
            'Learning English is fun. Practice makes perfect every single day.',
            'I enjoy reading books. They help me relax and learn new things.',
            'The coffee tastes great. Would you like some more to drink?',
            'My family went to the beach. We had a wonderful time together.',
            'She studies at the university. Her major is computer science and technology.',
            'We visited a new restaurant. The food was delicious and affordable.',
            'I like watching movies. Comedies are my favorite genre to watch.',
            'Exercise is important for health. I go to the gym three times a week.',
            'Reading helps improve vocabulary. I read at least one book every month.',
            'Cooking is a useful skill. I learned many recipes from my grandmother.',
            'Music makes life better. I listen to different genres every day.',
            'Travel broadens the mind. I want to visit many countries someday.',
            
            // Present Perfect & Present Perfect Continuous
            'I have been learning English for three years. It has become much easier now.',
            'She has just finished her homework. She has been working on it all evening.',
            'We have lived in this city since 2020. It has changed dramatically recently.',
            'They have been discussing the project for hours. No decision has been made yet.',
            'He has already eaten lunch. He has been trying to eat healthier lately.',
            'The company has been growing rapidly. They have hired many new employees.',
            'I have never seen such a beautiful sunset. The colors have been amazing tonight.',
            'She has been studying medicine for five years. She has always wanted to help people.',
            
            // Past Perfect & Past Perfect Continuous
            'When I arrived, the meeting had already started. Everyone had been waiting for me.',
            'She realized she had forgotten her keys. She had been rushing all morning.',
            'By the time we got there, the store had closed. We had been driving for hours.',
            'He said he had been working there for ten years. I had never met him before.',
            'The garden looked beautiful because she had been taking care of it all summer.',
            'They had been planning the trip for months before they finally booked it.',
            
            // Future Perfect & Future Perfect Continuous
            'By next year, I will have graduated from university. I will have been studying for four years.',
            'She will have finished the project by Friday. She will have been working on it for weeks.',
            'By the time you arrive, we will have already left. We will have been waiting since morning.',
            'In ten years, technology will have changed everything. People will have been using AI for decades.',
            
            // Mixed tenses with natural flow
            'I was reading a book when the phone rang. I had been enjoying the story immensely.',
            'While she was cooking dinner, her children were playing in the garden. They had been outside all afternoon.',
            'We were planning to go hiking, but it started raining. The weather forecast had predicted sunshine.',
            'I have been thinking about what you said yesterday. You were absolutely right about everything.',
            'She will be traveling to Japan next month. She has been saving money for this trip.',
            'When we were children, we used to play outside every day. Times have certainly changed.',
            
            // Conditional & Subjunctive moods
            'If I were you, I would accept the job offer. It sounds like an amazing opportunity.',
            'I wish I could speak five languages fluently. That would open so many doors.',
            'If she had studied harder, she would have passed the exam. Now she must retake it.',
            'I would have called you sooner if I had your number. I should have asked for it.',
            'If it rains tomorrow, we will stay indoors. We could watch movies instead.',
            
            // Passive voice variations
            'The new building is being constructed downtown. It will be completed next year.',
            'The problem has been solved by our team. Everyone was impressed by the solution.',
            'English is spoken in many countries around the world. It is considered a global language.',
            'The letter was written by my grandmother. It had been kept in a drawer for years.',
            'The presentation will be given by our manager. All employees are expected to attend.',
            
            // Advanced narrative paragraphs
            'As I walked through the ancient forest, sunlight filtered through the tall trees. Birds were singing their morning songs.',
            'The old man sat quietly on the park bench. He had been coming here every day for twenty years.',
            'Scientists have discovered a new species of butterfly. It had been living undetected in the rainforest for centuries.',
            'The artist was painting a masterpiece when inspiration struck. She had been struggling with creativity for months.',
            'Children were laughing and playing in the schoolyard. Their joy reminded me of my own childhood memories.',
            
            // Professional & Academic contexts
            'The research team has been analyzing data for months. Their findings will revolutionize modern medicine.',
            'During the conference, experts shared their latest discoveries. Many breakthrough innovations were presented.',
            'Students have been preparing for final exams intensively. The semester has been challenging but rewarding.',
            'The company announced record profits this quarter. They had been investing in new technology consistently.',
            'Engineers are designing more efficient solar panels. Renewable energy will become increasingly important.',
            
            // Cultural & Social themes
            'People from different cultures bring unique perspectives. Diversity enriches our understanding of the world.',
            'Traditional festivals celebrate our heritage beautifully. They have been passed down through generations.',
            'Social media has transformed how we communicate. People are connecting across continents instantly.',
            'Volunteers have been helping flood victims tirelessly. Their compassion demonstrates humanity at its best.',
            'Art museums preserve history for future generations. Each painting tells a story from the past.',
            
            // Environmental & Science themes
            'Climate change affects every corner of our planet. Scientists have been warning about this for decades.',
            'Ocean temperatures have been rising steadily. Marine life is adapting to these challenging conditions.',
            'Renewable energy sources are becoming more affordable. Solar and wind power will dominate the future.',
            'Deforestation threatens biodiversity worldwide. Conservation efforts must be implemented immediately.',
            'Space exploration continues to amaze humanity. Astronauts are discovering new frontiers constantly.',
              // Personal development & Philosophy
            'Success requires persistence and dedication. Many great achievements started with simple dreams.',
            'Failure teaches valuable lessons about resilience. Every setback contains opportunities for growth.',
            'Mindfulness helps people appreciate present moments. Meditation has been practiced for thousands of years.',
            'Creativity flourishes when we embrace curiosity. Innovation emerges from questioning conventional wisdom.',
            'Friendship enriches life beyond material possessions. True connections transcend time and distance.',
            
            // Literature & Arts - Advanced narrative styles
            'The mysterious stranger had been waiting at the café for hours. Nobody knew why he was there or whom he was expecting.',
            'Shakespeare\'s works have influenced countless writers throughout history. His plays continue to be performed worldwide today.',
            'Abstract art challenges traditional perceptions of beauty. Each observer interprets the meaning differently.',
            'Music transcends cultural boundaries effortlessly. A melody composed centuries ago can still move people to tears.',
            'Poetry captures emotions that prose cannot express. Every word has been carefully chosen for maximum impact.',
            'The novel explores themes of identity and belonging. Its protagonist struggles with questions that define human existence.',
            
            // Technology & Innovation - Future implications
            'Artificial intelligence will transform education fundamentally. Students will learn through personalized adaptive systems.',
            'Virtual reality is revolutionizing medical training. Surgeons can practice complex procedures without risk.',
            'Blockchain technology promises to secure digital transactions. Trust will no longer depend on central authorities.',
            'Quantum computing will solve problems beyond current capabilities. Encryption methods must evolve to remain secure.',
            'Internet of Things connects everyday objects intelligently. Our homes will anticipate our needs automatically.',
            'Machine learning algorithms are becoming increasingly sophisticated. They can now recognize patterns humans miss entirely.',
            
            // History & Civilization - Reflective perspectives
            'Ancient civilizations built monuments that still inspire awe. Their architectural achievements defied the limitations of their time.',
            'The Renaissance marked humanity\'s intellectual awakening. Art, science, and philosophy flourished simultaneously across Europe.',
            'Industrial Revolution changed how people lived and worked. Society transformed from agricultural to manufacturing-based economy.',
            'Two world wars reshaped global politics permanently. Nations learned the importance of international cooperation.',
            'The moon landing represented humanity\'s greatest achievement. It proved that impossible dreams could become reality.',
            'The fall of the Berlin Wall symbolized freedom\'s triumph. Families separated for decades were finally reunited.',
            
            // Psychology & Human Behavior - Insightful observations
            'Memory is not a perfect recording device. Our brains reconstruct past events based on current emotions.',
            'First impressions form within milliseconds of meeting someone. These snap judgments influence all subsequent interactions.',
            'Cognitive biases affect decision-making more than we realize. Rational thinking requires constant self-awareness.',
            'Empathy allows us to understand others\' experiences deeply. It bridges differences that logic alone cannot overcome.',
            'Resilience can be developed through practice and reflection. Difficult experiences often strengthen character.',
            'Creativity emerges from the intersection of knowledge and imagination. Breakthrough ideas combine existing concepts innovatively.',
            
            // Economics & Society - Contemporary challenges
            'Globalization has connected markets across continents. Local decisions now have worldwide consequences.',
            'Income inequality continues to widen in many countries. Governments struggle to balance growth with fairness.',
            'Automation threatens traditional employment patterns. Workers must continuously adapt to technological changes.',
            'Cryptocurrency challenges traditional banking systems. Financial institutions are scrambling to understand its implications.',
            'The gig economy offers flexibility but lacks security. Freelancers enjoy freedom while sacrificing benefits.',
            'Sustainable development requires balancing competing interests. Economic growth must not compromise environmental health.',
            
            // Health & Medicine - Scientific breakthroughs
            'Gene therapy offers hope for treating genetic disorders. Scientists can now edit DNA with unprecedented precision.',
            'Telemedicine has expanded healthcare access dramatically. Patients in remote areas can consult specialists virtually.',
            'Mental health awareness has increased significantly recently. Society is finally recognizing its importance.',
            'Preventive medicine focuses on maintaining wellness proactively. Early intervention saves lives and reduces costs.',
            'Personalized medicine tailors treatments to individual genetics. One-size-fits-all approaches are becoming obsolete.',
            'Medical research has accelerated through artificial intelligence. Computers can analyze vast datasets impossibly quickly.',
            
            // Education & Learning - Modern methodologies
            'Online education has democratized access to knowledge. Students worldwide can attend top universities virtually.',
            'Critical thinking skills matter more than memorization. Information is abundant; wisdom remains precious.',
            'Collaborative learning produces better outcomes than competition. Students learn from each other\'s perspectives.',
            'Lifelong learning has become essential for career success. The half-life of skills continues shrinking rapidly.',
            'Multilingual education opens cognitive and cultural doors. Bilingual children show enhanced problem-solving abilities.',
            'Project-based learning connects theory with practical application. Students solve real problems while mastering concepts.',
            
            // Travel & Cultural Exchange - Transformative experiences
            'International travel broadens perspectives immeasurably. Exposure to different cultures challenges assumptions.',
            'Language immersion accelerates learning exponentially. Living abroad forces practical communication skills.',
            'Cultural festivals showcase humanity\'s rich diversity. Each tradition offers unique wisdom and beauty.',
            'Food tells stories about history and geography. Every dish reflects the climate and culture of its origin.',
            'Architecture reveals societal values and priorities. Buildings reflect the aspirations of their creators.',
            'Hospitality traditions vary but express universal kindness. Welcoming strangers demonstrates shared humanity.',
            
            // Relationships & Communication - Social dynamics
            'Active listening requires full attention and empathy. Most people hear words but miss underlying emotions.',
            'Conflict resolution demands patience and understanding. Successful negotiation seeks win-win solutions.',
            'Body language communicates more than spoken words. Nonverbal cues often contradict verbal messages.',
            'Trust takes years to build but seconds to destroy. Reputation is your most valuable asset.',
            'Emotional intelligence predicts success better than IQ. Understanding feelings guides wise decisions.',
            'Cross-cultural communication requires cultural sensitivity. Assumptions based on one\'s own culture cause misunderstandings.',
            
            // Sports & Competition - Life lessons
            'Olympic athletes train for decades for moments of glory. Their dedication inspires millions worldwide.',
            'Team sports teach cooperation and shared responsibility. Individual talent means nothing without collective effort.',
            'Failure in competition builds character and determination. Champions are made through overcoming setbacks.',
            'Fair play demonstrates respect for opponents and rules. Winning without integrity is hollow victory.',
            'Sports unite people across political and cultural divides. Competition transcends artificial barriers.',
            'Physical fitness contributes to mental well-being significantly. Exercise releases endorphins that improve mood.',
            
            // Vocabulary lists by topic
            'happy, sad, excited, nervous, calm, angry, surprised, confused',
            'red, blue, green, yellow, purple, orange, pink, brown, black, white',
            'dog, cat, bird, fish, rabbit, horse, cow, pig, sheep, chicken',
            'apple, banana, orange, grape, strawberry, watermelon, pineapple, mango',
            'sunny, cloudy, rainy, snowy, windy, foggy, hot, cold, warm, cool',
            'mother, father, sister, brother, grandmother, grandfather, aunt, uncle, cousin',
            'teacher, student, doctor, nurse, engineer, lawyer, chef, artist, musician',
            'book, pen, pencil, notebook, ruler, eraser, calculator, computer, desk, chair',
            'car, bus, train, airplane, bicycle, motorcycle, boat, taxi, subway, truck',
            'breakfast, lunch, dinner, snack, coffee, tea, juice, water, milk, bread',
            
            // Advanced phrases and expressions
            'time management', 'work-life balance', 'personal development', 'team building',
            'problem solving', 'critical thinking', 'public speaking', 'decision making',
            'goal setting', 'stress management', 'conflict resolution', 'creative thinking',
            'leadership skills', 'communication skills', 'analytical thinking', 'strategic planning',
            'cultural diversity', 'global warming', 'environmental protection', 'sustainable living',
            'healthy lifestyle', 'balanced diet', 'regular exercise', 'mental health',
            'social responsibility', 'community service', 'volunteer work', 'charity organization'
        ];
        
        const fallbackSample = fallbackSamples[Math.floor(Math.random() * fallbackSamples.length)];
        console.log(`🔄 Using fallback sample: "${fallbackSample}"`);
        return fallbackSample;
    }
}

// Các hàm này sẽ có sẵn trong global scope cho app.js sử dụng
window.fetchNoteDataWithGemini = fetchNoteDataWithGemini;
window.fetchGeminiTranslation = fetchGeminiTranslation;
window.fetchGeminiSmartAnalysis = fetchGeminiSmartAnalysis;
window.fetchGeminiSpellCheck = fetchGeminiSpellCheck;
window.generateRandomSample = generateRandomSample;
