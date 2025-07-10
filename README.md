# 📚 Note - Smart English Vocabulary Learning App

> **Ứng dụng học từ vựng tiếng Anh thông minh với AI và offline fallback**

Ứng dụng web hoàn toàn miễn phí giúp **học, ghi chú, trình chiếu và luyện tập từ vựng/cụm từ/đoạn văn tiếng Anh** một cách hiệu quả. Tích hợp AI để phân tích ngôn ngữ chi tiết và hệ thống fallback mạnh mẽ khi offline.

## 🎯 Tại sao chọn ứng dụng này?

✅ **Hoạt động offline** - Không cần internet vẫn học được  
✅ **Phân tích ngôn ngữ chuyên sâu** - Phiên âm IPA, loại từ, nghĩa chi tiết  
✅ **Giao diện thân thiện** - Tối ưu cho cả máy tính và TV  
✅ **Hoàn toàn miễn phí** - Không quảng cáo, không thu phí  
✅ **Bảo mật dữ liệu** - Lưu trữ local, không upload lên server  

## 🔥 Demo trực tiếp
- **[Live Demo](file:///path/to/index.html)** - Mở ngay trên trình duyệt
- **Không cần cài đặt** - Chạy trực tiếp từ file HTML

## ⭐ Tính năng chính

### 🧠 **AI-Powered Analysis** 
- **Phiên âm IPA chuẩn quốc tế** `/ˈɪŋɡlɪʃ/`
- **Phân loại từ chi tiết** (noun, verb, adjective...)
- **Dịch nghĩa thông minh** - Hiểu context và cách dùng
- **Spell check tự động** - Sửa lỗi chính tả khi nhập

### 🎲 **Smart Sample Generator**
- **100+ mẫu fallback** từ đơn → cụm từ → đoạn văn
- **Đa dạng thì tiếng Anh** (Present Perfect, Past Continuous, Future Perfect...)
- **Chủ đề phong phú** (Business, Technology, Travel, Culture...)
- **Tự động sinh mẫu** bằng AI khi có mạng

### 💾 **Smart Data Management**
- **Auto-save giao diện** - Ghi nhớ cỡ chữ, vị trí cuộn, trạng thái ẩn/hiện
- **Import/Export** - Sao lưu và chia sẻ ghi chú dễ dàng  
- **Sắp xếp thông minh** - Ghi chú mới nhất luôn ở đầu
- **LocalStorage** - Dữ liệu an toàn, không mất khi tắt trình duyệt

### 🛡️ **Robust Fallback System**
- **3-tier fallback**: AI → Regular Translation → Manual Retry
- **Error recovery** - Nút "Dịch lại" khi có lỗi
- **Offline support** - Hoạt động hoàn toàn không cần mạng
- **No data loss** - Đảm bảo trải nghiệm học liên tục

## � Quick Start

### 1️⃣ **Download & Run**
```bash
# Clone or download repository
git clone [repository-url]
cd Note

# Open in browser (no server needed!)
open index.html
# Or double-click index.html
```

### 2️⃣ **Basic Usage**

| Action | Method |
|--------|--------|
| **Add new word/phrase** | Type + Enter or click "Thêm" |
| **Get random sample** | Click "Mẫu ngẫu nhiên" button |
| **Retry translation** | Click retry icon (🔄) when error |
| **Adjust font size** | Use +/- buttons |
| **Toggle input** | Click hide/show toggle |
| **Export notes** | Click "Xuất file" |
| **Import notes** | Click "Nhập file" |

### 3️⃣ **Example Workflow**
```
1. Type: "machine learning" → Enter
2. App shows: /məˈʃiːn ˈlɜːnɪŋ/ (n) - học máy
3. Click "Mẫu ngẫu nhiên" → Get: "break the ice"
4. Type new phrase → Repeat learning cycle
```

## � Sample Output Examples

### Single Word Analysis
```
Input: "beautiful"
Output: 
📝 beautiful
🔊 /ˈbjuːtɪfəl/ (adj)
🇻🇳 đẹp, xinh đẹp
```

### Phrase Analysis  
```
Input: "break the ice"
Output:
📝 break the ice  
🔊 /breɪk ði aɪs/ (idiom)
🇻🇳 phá tan bầu không khí ngại ngùng
```

### Paragraph Translation
```
Input: "The weather is nice today. I want to go for a walk."
Output:
📝 The weather is nice today. I want to go for a walk.
🇻🇳 Thời tiết hôm nay rất đẹp. Tôi muốn đi dạo.
```

## �️ Tech Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | Pure HTML5, CSS3, Vanilla JavaScript |
| **AI Service** | Google Gemini API (optional) |
| **Storage** | Browser LocalStorage |
| **Fallback** | 100+ pre-built samples |
| **Compatibility** | All modern browsers, TV browsers |

## 📁 Project Structure
```
Note/
├── index.html          # Main application
├── app.js             # Core functionality 
├── AI.js              # AI integration & fallback
├── README.md          # Documentation
└── [exported-notes/]  # User exports (optional)
```

## ⚙️ Configuration (Optional)

### Enable AI Features
1. Get free Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Edit `AI.js` line 1:
```javascript
const GEMINI_API_KEY = 'your-api-key-here';
```
3. Refresh app to use AI analysis

> **Note**: App works perfectly without API key using fallback system

## 🔧 Customization

### Add Custom Fallback Samples
Edit `AI.js`, find `fallbackSamples` array:
```javascript
// Add your custom samples here
'your custom phrase',
'your custom sentence with punctuation.',
```

### Modify UI Styling  
Edit CSS in `index.html` `<style>` section to customize colors, fonts, layout.

## 🌟 Use Cases

| Scenario | Benefit |
|----------|---------|
| **Students** | Vocabulary building, pronunciation practice |
| **Teachers** | Classroom presentation, lesson preparation |
| **Self-learners** | Daily practice, progress tracking |
| **TV Learning** | Large screen display, living room study |
| **Offline Study** | No internet required, reliable fallback |

## ❗ Troubleshooting

### Common Issues
- **AI not working**: Check API key or use without (fallback works great!)
- **Notes not saving**: Enable localStorage in browser settings
- **Font too small**: Use +/- buttons or browser zoom
- **Import fails**: Ensure file is valid JSON export

### Browser Compatibility
- ✅ Chrome/Edge (Recommended)
- ✅ Firefox  
- ✅ Safari
- ✅ TV Browsers (Samsung, LG, etc.)
- ❌ Internet Explorer (not supported)

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### 📝 Content Contributions
- **Add vocabulary samples** - Submit common words/phrases
- **Improve translations** - Better Vietnamese meanings  
- **Add example sentences** - Real-world usage examples
- **Grammar patterns** - More tense variations

### 💻 Code Contributions  
- **Bug fixes** - Report issues, submit patches
- **Feature requests** - Suggest new functionality
- **UI improvements** - Better design, accessibility
- **Performance** - Optimize loading, memory usage

### 📋 How to Contribute
1. Fork this repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is **open source** and available under the [MIT License](LICENSE).

## 🙋‍♀️ Support & Community

- **Issues**: [GitHub Issues](https://github.com/DaiDuong2512/Note/issues)
- **Discussions**: [GitHub Discussions](https://github.com/DaiDuong2512/Note/discussions)  

## 🎉 Acknowledgments

- Google Gemini API for AI language analysis
- IPA phonetic symbols from International Phonetic Association
- Community contributors for vocabulary samples
- Open source JavaScript community

---

<div align="center"> :))</div>


### ⭐ If this app helped you learn English, please star this repository! ⭐

**Made with ❤️ for English learners worldwide**

</div>
