const express = require('express');
const multer = require('multer');
const archiver = require('archiver');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// APK Build endpoint
app.post('/build', upload.array('files'), async (req, res) => {
  try {
    const { appName, packageName, version } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    console.log(`📱 Building APK for: ${appName}`);
    console.log(`📦 Package: ${packageName}`);
    console.log(`📄 Files: ${files.length}`);

    // Create build directory
    const buildId = Date.now();
    const buildDir = path.join(__dirname, 'builds', `build-${buildId}`);
    fs.mkdirSync(buildDir, { recursive: true });

    // Create Android project structure
    const androidDir = path.join(buildDir, 'android');
    fs.mkdirSync(path.join(androidDir, 'app', 'src', 'main'), { recursive: true });

    // Generate AndroidManifest.xml
    const manifestContent = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${packageName}"
    android:versionCode="1"
    android:versionName="${version}">

    <uses-permission android:name="android.permission.INTERNET" />
    
    <application
        android:label="${appName}"
        android:icon="@mipmap/ic_launcher">
        
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;

    fs.writeFileSync(
      path.join(androidDir, 'app', 'src', 'main', 'AndroidManifest.xml'),
      manifestContent
    );

    // Copy web files to assets
    const assetsDir = path.join(androidDir, 'app', 'src', 'main', 'assets', 'www');
    fs.mkdirSync(assetsDir, { recursive: true });

    files.forEach(file => {
      const sourcePath = file.path;
      const destPath = path.join(assetsDir, file.originalname);
      fs.copyFileSync(sourcePath, destPath);
    });

    // Create APK structure (ZIP format)
    const apkPath = path.join(buildDir, `${appName.toLowerCase().replace(/\s+/g, '-')}.apk`);
    const output = fs.createWriteStream(apkPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`✅ APK created: ${apkPath}`);
      
      // Send APK file
      res.download(apkPath, `${appName.toLowerCase().replace(/\s+/g, '-')}.apk`, (err) => {
        if (err) {
          console.error('Download error:', err);
        }
        // Cleanup
        setTimeout(() => {
          fs.rmSync(buildDir, { recursive: true, force: true });
        }, 5000);
      });
    });

    archive.on('error', (err) => {
      console.error('Archive error:', err);
      res.status(500).json({ error: 'APK build failed' });
    });

    archive.pipe(output);

    // Add files to APK
    archive.directory(androidDir, false);
    archive.finalize();

  } catch (error) {
    console.error('Build error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cleanup old uploads
setInterval(() => {
  const uploadDir = path.join(__dirname, 'uploads');
  if (fs.existsSync(uploadDir)) {
    const files = fs.readdirSync(uploadDir);
    files.forEach(file => {
      const filePath = path.join(uploadDir, file);
      const stat = fs.statSync(filePath);
      const now = new Date().getTime();
      const fileAge = now - stat.mtime.getTime();
      
      // Delete files older than 1 hour
      if (fileAge > 3600000) {
        fs.unlinkSync(filePath);
      }
    });
  }
}, 3600000); // Run every hour

// Start server
app.listen(PORT, () => {
  console.log(`🚀 APK Builder server running on port ${PORT}`);
  console.log(`📱 Open http://localhost:${PORT} to use the builder`);
});