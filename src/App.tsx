import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Zap, Calendar, User, Search, Filter, Sparkles, Navigation } from 'lucide-react';
import { db, auth, googleProvider } from './lib/firebase';
import { signInWithPopup } from 'firebase/auth';
import { collection, getDocs, query, where, limit, doc, getDocFromServer } from 'firebase/firestore';
import { itineraryService } from './services/geminiService';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function App() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('discovery');
  const [itinerary, setItinerary] = useState<any[]>([]);

  useEffect(() => {
    // Test Connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    
    testConnection();
    fetchEvents();
    auth.onAuthStateChanged(setUser);
  }, []);

  const fetchEvents = async () => {
    const path = "events";
    try {
      const q = query(collection(db, path), limit(10));
      const snapshot = await getDocs(q);
      setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    } finally {
      setLoading(false);
    }
  };

  const login = () => signInWithPopup(auth, googleProvider);

  const generateItinerary = async () => {
    setLoading(true);
    const it = await itineraryService.buildItinerary(['cocktails', 'live music', 'fine dining'], 'Bangalore');
    setItinerary(it);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between bg-white/80 px-6 py-4 backdrop-blur-md border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-2 rounded-xl">
            <Zap className="text-white size-5 fill-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-indigo-900">Neural Cortex</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <button onClick={() => {}} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
            <Search className="size-5" />
          </button>
          {!user ? (
            <button onClick={login} className="bg-indigo-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
              Sign In
            </button>
          ) : (
            <div className="size-8 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow-sm">
              <img src={user.photoURL} alt="profile" />
            </div>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 pb-32">
        {/* Hero Segment */}
        <section className="mb-10 text-center sm:text-left">
          <h2 className="text-3xl font-extrabold text-slate-900 mb-2 leading-tight">
            Discover what's happening <span className="text-indigo-600 italic">right now.</span>
          </h2>
          <div className="flex items-center gap-2 text-slate-500 justify-center sm:justify-start">
            <MapPin className="size-4" />
            <span className="text-sm">Indiranagar, Bangalore</span>
          </div>
        </section>

        {/* Action Tabs */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <button 
            onClick={() => setActiveTab('discovery')}
            className={`flex flex-col items-center gap-2 p-6 rounded-3xl transition-all shadow-sm border ${activeTab === 'discovery' ? 'bg-indigo-50 border-indigo-100 ring-2 ring-indigo-500/10' : 'bg-white border-slate-100'}`}
          >
            <Sparkles className={`size-6 ${activeTab === 'discovery' ? 'text-indigo-600' : 'text-slate-400'}`} />
            <span className="text-sm font-semibold">Right Now</span>
          </button>
          <button 
            onClick={() => {
              setActiveTab('itinerary');
              if (itinerary.length === 0) generateItinerary();
            }}
            className={`flex flex-col items-center gap-2 p-6 rounded-3xl transition-all shadow-sm border ${activeTab === 'itinerary' ? 'bg-indigo-50 border-indigo-100 ring-2 ring-indigo-500/10' : 'bg-white border-slate-100'}`}
          >
            <Navigation className={`size-6 ${activeTab === 'itinerary' ? 'text-indigo-600' : 'text-slate-400'}`} />
            <span className="text-sm font-semibold">Build Evening</span>
          </button>
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          {activeTab === 'discovery' ? (
            <motion.div 
              key="discovery"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between px-2">
                <h3 className="font-bold text-slate-800">Nearby Experiences</h3>
                <button className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                  <Filter className="size-3" /> Filters
                </button>
              </div>

              {loading ? (
                <div className="flex flex-col gap-4">
                  {[1,2,3].map(i => <div key={i} className="h-48 bg-slate-200 animate-pulse rounded-3xl" />)}
                </div>
              ) : (
                <div className="grid gap-6">
                  {events.length === 0 && (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                       <p className="text-slate-400">Scanning for live signals...</p>
                    </div>
                  )}
                  {events.map((event) => (
                    <div key={event.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 group cursor-pointer hover:shadow-md transition-shadow">
                      <div className="h-48 bg-slate-200 relative">
                        {event.imageUrl && <img src={event.imageUrl} className="w-full h-full object-cover" />}
                        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                          <div className={`size-2 rounded-full ${event.confidence === 'verified' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          <span className="text-[10px] uppercase font-bold tracking-wider">{event.confidence}</span>
                        </div>
                      </div>
                      <div className="p-5">
                         <div className="flex justify-between items-start mb-2">
                           <h4 className="font-bold text-lg">{event.title}</h4>
                           <span className="bg-slate-50 text-slate-500 text-[10px] px-2 py-1 rounded uppercase font-bold tracking-widest">{event.category}</span>
                         </div>
                         <p className="text-slate-500 text-sm line-clamp-2 mb-4">{event.description}</p>
                         <div className="flex items-center gap-4 text-xs text-slate-400">
                           <div className="flex items-center gap-1">
                             <Calendar className="size-3" />
                             {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           </div>
                           <div className="flex items-center gap-1">
                             <MapPin className="size-3" />
                             {event.neighborhood}
                           </div>
                         </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
               key="itinerary"
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               className="bg-indigo-900 rounded-[2.5rem] p-8 text-white min-h-[400px] shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-10 opacity-10">
                <Navigation className="size-64 -rotate-12" />
              </div>
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <Sparkles className="size-6 text-indigo-300" />
                Your Curated Evening
              </h3>
              
              <div className="space-y-8 relative z-10">
                {itinerary.map((item, idx) => (
                  <div key={idx} className="flex gap-6 relative">
                    {idx !== itinerary.length - 1 && (
                      <div className="absolute left-[11px] top-6 bottom-[-20px] w-px bg-white/20" />
                    )}
                    <div className="size-6 rounded-full bg-indigo-500 border-4 border-indigo-900 flex-shrink-0 relative z-20" />
                    <div>
                      <div className="text-indigo-300 font-mono text-[10px] uppercase tracking-widest mb-1">{item.time}</div>
                      <h4 className="font-bold text-lg leading-tight mb-1">{item.activity}</h4>
                      <p className="text-indigo-200/60 text-sm italic mb-2">@ {item.venue}</p>
                      <p className="text-slate-300 text-sm leading-relaxed">{item.vibe}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-xl border border-slate-200 px-8 py-4 rounded-full shadow-2xl flex gap-10 items-center z-50">
        <button label="discover" className="text-indigo-600"><Zap className="size-6" /></button>
        <button label="calendar" className="text-slate-400 hover:text-indigo-600"><Calendar className="size-6" /></button>
        <button label="profile" className="text-slate-400 hover:text-indigo-600"><User className="size-6" /></button>
      </nav>
    </div>
  );
}
