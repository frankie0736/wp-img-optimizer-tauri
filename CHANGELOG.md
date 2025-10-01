# Changelog

## [1.0.2] - 2025-10-01

### ✨ New Features

1. **WordPress Site Editing**
   - ✅ Added Edit button for each WordPress site
   - ✅ Click Edit icon to modify site settings
   - ✅ All fields editable: URL, username, password, context, WebP, quality, max width
   - ✅ Save Changes or Cancel buttons
   - ✅ Edit form has highlighted background for better visibility
   - ✅ Auto-close edit form when adding new site (and vice versa)

### 🎨 UI Improvements

- Edit and Delete icons side-by-side for better organization
- Edit form uses highlighted background (`bg-muted/50`)
- Consistent button styling across add/edit operations
- Clear visual feedback for edit vs. view mode

### 📝 Usage

**To Edit a WordPress Site:**
1. Go to Settings tab
2. Find the site you want to edit
3. Click the Edit icon (pencil) next to the site
4. Modify any fields you need
5. Click "Save Changes" or "Cancel"
6. Don't forget to click "Save Configuration" at the bottom to persist changes

---

## [1.0.1] - 2025-10-01

### 🐛 Bug Fixes

1. **WordPress Site Settings Enhancement**
   - ✅ Added WebP conversion toggle option (Yes/No)
   - ✅ Added Quality control (1-100)
   - ✅ Added Max Width setting (100-4000px)
   - Display current settings on site cards for quick reference

2. **Drag-and-Drop Upload Fix**
   - ✅ Fixed drag-and-drop functionality not working
   - ✅ Added proper event handling with `preventDefault()` and `stopPropagation()`
   - ✅ Added `onDragEnter` event handler
   - ✅ Improved visual feedback during drag operation

3. **Intelligent Filename Generation**
   - ✅ AI now generates SEO-friendly filenames (e.g., `sunset-beach-waves.webp`)
   - ✅ Filenames use lowercase slugs with hyphens
   - ✅ Automatically include `.webp` extension when converting to WebP
   - ✅ MIME type automatically detected based on filename extension

4. **English-Only SEO Metadata**
   - ✅ Updated OpenAI prompt to generate **ENGLISH ONLY** content
   - ✅ All fields now in English: filename, title, alt_text, description, tags
   - ✅ Enhanced prompt with specific character limits:
     - Filename: 40-60 characters, lowercase slug
     - Title: 40-60 characters
     - Alt text: 100-125 characters
     - Description: 150-200 characters
     - Tags: 5-8 relevant keywords
   - ✅ Context from WordPress site settings integrated into AI prompt

### 📝 Technical Changes

**Backend (Rust):**
- Modified `ImageAnalysis` struct to include `filename` field
- Updated `analyze_image()` function with new English-only prompt
- Enhanced `upload_to_wordpress()` to use AI-generated filename
- Added MIME type detection based on file extension

**Frontend (React):**
- Enhanced `Settings.tsx` with WebP/Quality/Max Width controls
- Fixed drag-and-drop event handlers in `ImageUploader.tsx`
- Improved visual display of site settings
- Added better placeholder hints in form inputs

### 🎯 Usage Notes

**New Settings Configuration:**
```json
{
  "wordpress_sites": [
    {
      "id": "my-site",
      "site_url": "https://example.com",
      "username": "admin",
      "app_password": "xxxx xxxx xxxx xxxx",
      "context": "A travel blog focused on Asian cuisine and scenery",
      "convert_to_webp": true,
      "quality": 85,
      "max_width": 1920
    }
  ]
}
```

**AI-Generated Filename Example:**
- Original: `IMG_1234.jpg`
- AI Generated: `sunset-mountain-landscape-golden-hour.webp`

**SEO Metadata Example:**
```json
{
  "filename": "beautiful-cherry-blossoms-spring-japan.webp",
  "title": "Beautiful Cherry Blossoms in Spring - Japan Travel",
  "alt_text": "Pink cherry blossom trees blooming along a traditional Japanese street during spring season in Kyoto",
  "description": "Stunning view of cherry blossom trees in full bloom along a historic street in Kyoto, Japan. The delicate pink flowers create a magical canopy over the traditional architecture during peak spring season.",
  "tags": ["cherry blossoms", "japan", "spring", "kyoto", "travel", "nature", "sakura", "asia"]
}
```

### ✅ Testing Checklist

- [x] WordPress site settings display correctly
- [x] WebP/Quality/Max Width options work as expected
- [x] Drag-and-drop accepts image files
- [x] AI generates English filenames
- [x] AI generates English SEO metadata
- [x] Context from site settings influences AI output
- [x] Frontend builds without errors
- [x] Backend compiles successfully

---

## [1.0.0] - 2025-10-01

### 🎉 Initial Release

- ✅ Complete Tauri desktop application
- ✅ React + TypeScript frontend
- ✅ Rust backend with Tauri v2
- ✅ OpenAI Vision API integration
- ✅ WordPress REST API upload
- ✅ Drag-and-drop image upload
- ✅ Batch processing (up to 50 images)
- ✅ Real-time progress tracking
- ✅ Image optimization (WebP conversion, compression, resizing)
- ✅ Multi-site WordPress management
- ✅ Modern UI with Tailwind CSS
- ✅ Cross-platform support (macOS, Windows)
