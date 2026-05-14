import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, doc, setDoc, limit } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json' with { type: "json" };
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

app.use(express.json());

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "Neural Cortex Backend" });
});

// Real-time Discovery: Right Now feed
app.get("/api/discovery/right-now", async (req, res) => {
  const { lat, lng } = req.query;
  try {
    const eventsRef = collection(db, "events");
    const q = query(
      eventsRef, 
      where("confidence", "in", ["verified", "likely"]),
      limit(20)
    );
    const snapshot = await getDocs(q);
    const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    res.json({ events });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch nearby events" });
  }
});

// Webhook for ingested events from Admin Portal (AI logic on frontend)
app.post("/api/admin/ingest-verified", async (req, res) => {
  const { eventData } = req.body;
  try {
    const eventId = `event_${Date.now()}`;
    await setDoc(doc(db, "events", eventId), {
      ...eventData,
      createdAt: new Date().toISOString()
    });
    res.json({ success: true, eventId });
  } catch (error) {
    res.status(500).json({ error: "Storage failed" });
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
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
