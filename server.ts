import express from "express";
import { createServer as createViteServer } from "vite";
import session from "express-session";
import cookieParser from "cookie-parser";
import axios from "axios";
import multer from "multer";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;
const upload = multer({ dest: "uploads/" });

app.use(express.json());
app.use(cookieParser());
app.use(
  session({
    secret: "buzzline-secret",
    resave: false,
    saveUninitialized: true,
    cookie: { 
      secure: process.env.NODE_ENV === "production",
      sameSite: "none" 
    },
  })
);

const TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const TIKTOK_CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;

// TikTok OAuth URL
app.get("/api/auth/tiktok/url", (req, res) => {
  const redirectUri = `${process.env.APP_URL}/api/auth/tiktok/callback`;
  const scope = "user.info.basic,video.upload,video.publish";
  const state = Math.random().toString(36).substring(7);
  
  const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${TIKTOK_CLIENT_KEY}&scope=${scope}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  
  res.json({ url: authUrl });
});

// TikTok OAuth Callback
app.get("/api/auth/tiktok/callback", async (req, res) => {
  const { code } = req.query;
  const redirectUri = `${process.env.APP_URL}/api/auth/tiktok/callback`;

  try {
    const response = await axios.post(
      "https://open.tiktokapis.com/v2/oauth/token/",
      new URLSearchParams({
        client_key: TIKTOK_CLIENT_KEY!,
        client_secret: TIKTOK_CLIENT_SECRET!,
        code: code as string,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { access_token, open_id } = response.data;
    (req as any).session.tiktokToken = access_token;
    (req as any).session.tiktokOpenId = open_id;

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'TIKTOK_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. You can close this window.</p>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error("TikTok Auth Error:", error.response?.data || error.message);
    res.status(500).send("Authentication failed");
  }
});

// Check TikTok Auth Status
app.get("/api/auth/tiktok/status", (req, res) => {
  res.json({ connected: !!(req as any).session.tiktokToken });
});

// Post to TikTok
app.post("/api/tiktok/post", upload.single("video"), async (req, res) => {
  const token = (req as any).session.tiktokToken;
  if (!token) {
    return res.status(401).json({ error: "Not connected to TikTok" });
  }

  const videoFile = (req as any).file;
  if (!videoFile) {
    return res.status(400).json({ error: "No video file provided" });
  }

  const { title, description } = req.body;

  try {
    // TikTok Content Posting API v2
    // Step 1: Initialize upload
    const initResponse = await axios.post(
      "https://open.tiktokapis.com/v2/post/publish/video/init/",
      {
        post_info: {
          title: title || "Buzzline News",
          privacy_level: "PUBLIC_TO_EVERYONE",
          disable_duet: false,
          disable_stitch: false,
          disable_comment: false,
          video_ad_tag: false,
        },
        source_info: {
          source: "FILE_UPLOAD",
          video_size: videoFile.size,
          chunk_size: videoFile.size,
          total_chunk_count: 1,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const { publish_id, upload_url } = initResponse.data.data;

    // Step 2: Upload the video file
    const videoData = fs.readFileSync(videoFile.path);
    await axios.put(upload_url, videoData, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Range": `bytes 0-${videoFile.size - 1}/${videoFile.size}`,
      },
    });

    // Cleanup
    fs.unlinkSync(videoFile.path);

    res.json({ success: true, publish_id });
  } catch (error: any) {
    console.error("TikTok Upload Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to post to TikTok", details: error.response?.data });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
