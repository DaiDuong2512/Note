// Configuration file for API settings
// This file should be kept secure and not uploaded to public repositories

const appConfig = {
    // Gemini API Configuration
    GEMINI_API_KEY: 'AIzaSyDOauJlzUdsUsOadS8_waJGWrLtjbjVNmE',
    GEMINI_API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent',
    
    // API Settings
    API_TIMEOUT: 30000, // 30 seconds
    MAX_RETRIES: 3,
    
    // Generation Config Defaults
    DEFAULT_TEMPERATURE: 0.1,
    DEFAULT_TOP_K: 1,
    DEFAULT_TOP_P: 1,
    MAX_OUTPUT_TOKENS: 3000
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = appConfig;
} else {
    window.config = appConfig; // Keep window.config for compatibility
}
