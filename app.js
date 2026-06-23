// ================================================================
//  MISSION JEET v2.0 — IIT PREPARATION COMMAND CENTER
//  Firebase Auth + Firestore | Gemini AI | Spaced Repetition
// ================================================================

// === MOCK FIREBASE FOR LOCAL ENVIRONMENT ===
if (window.location.protocol === 'file:') {
  console.log("Mission Jeet: Local file protocol detected. Injecting LocalStorage-based Firebase Mock.");
  
  if (!window.firebase) {
    window.firebase = {};
  }
  
  const mockStorage = {
    getCollectionKey(path) {
      return `mj_mock_${path.replace(/\//g, '_')}`;
    },
    getCollectionData(path) {
      const key = this.getCollectionKey(path);
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : {};
    },
    saveCollectionData(path, data) {
      const key = this.getCollectionKey(path);
      localStorage.setItem(key, JSON.stringify(data));
      this.notify(path);
    },
    getCollection(path, orderByField, orderDir) {
      const data = this.getCollectionData(path);
      let docs = Object.keys(data).map(id => ({ id, ...data[id] }));
      if (orderByField) {
        docs.sort((a, b) => {
          let valA = a[orderByField];
          let valB = b[orderByField];
          if (valA && valA._isFieldValue) valA = valA.epoch;
          if (valB && valB._isFieldValue) valB = valB.epoch;
          if (valA === undefined || valA === null) return 1;
          if (valB === undefined || valB === null) return -1;
          if (typeof valA === 'string' && typeof valB === 'string') {
            return orderDir === 'desc' ? valB.localeCompare(valA) : valA.localeCompare(valB);
          }
          return orderDir === 'desc' ? valB - valA : valA - valB;
        });
      }
      return docs;
    },
    getDoc(collectionPath, docId) {
      const data = this.getCollectionData(collectionPath);
      return data[docId] || null;
    },
    setDoc(collectionPath, docId, data, merge = false) {
      const colData = this.getCollectionData(collectionPath);
      const processedData = { ...data };
      for (const k in processedData) {
        if (processedData[k] && processedData[k]._isFieldValue) {
          if (processedData[k].type === 'serverTimestamp') {
            processedData[k] = new Date().toISOString();
          }
        }
      }
      if (merge && colData[docId]) {
        colData[docId] = { ...colData[docId], ...processedData };
      } else {
        colData[docId] = processedData;
      }
      this.saveCollectionData(collectionPath, colData);
    },
    deleteDoc(collectionPath, docId) {
      const colData = this.getCollectionData(collectionPath);
      if (colData[docId]) {
        delete colData[docId];
        this.saveCollectionData(collectionPath, colData);
      }
    },
    listeners: {},
    addListener(path, id, callback) {
      if (!this.listeners[path]) this.listeners[path] = {};
      this.listeners[path][id] = callback;
    },
    removeListener(path, id) {
      if (this.listeners[path] && this.listeners[path][id]) {
        delete this.listeners[path][id];
      }
    },
    notify(path) {
      if (this.listeners[path]) {
        Object.values(this.listeners[path]).forEach(cb => cb());
      }
    }
  };

  class MockDocRef {
    constructor(collectionPath, docId) {
      this.collectionPath = collectionPath;
      this.id = docId;
    }
    get() {
      const data = mockStorage.getDoc(this.collectionPath, this.id);
      return Promise.resolve({
        id: this.id,
        exists: data !== null,
        data: () => data || {}
      });
    }
    set(data, options = {}) {
      mockStorage.setDoc(this.collectionPath, this.id, data, options.merge);
      return Promise.resolve();
    }
    update(data) {
      mockStorage.setDoc(this.collectionPath, this.id, data, true);
      return Promise.resolve();
    }
    delete() {
      mockStorage.deleteDoc(this.collectionPath, this.id);
      return Promise.resolve();
    }
    collection(name) {
      return new MockCollectionRef(`${this.collectionPath}/${this.id}/${name}`);
    }
  }

  class MockCollectionRef {
    constructor(path) {
      this.path = path;
      this._orderByField = null;
      this._orderByDirection = 'asc';
      this._limit = null;
    }
    doc(id) {
      const docId = id || Math.random().toString(36).substring(2, 15);
      return new MockDocRef(this.path, docId);
    }
    orderBy(field, direction = 'asc') {
      const newQuery = new MockCollectionRef(this.path);
      newQuery._orderByField = field;
      newQuery._orderByDirection = direction;
      newQuery._limit = this._limit;
      return newQuery;
    }
    limit(n) {
      const newQuery = new MockCollectionRef(this.path);
      newQuery._orderByField = this._orderByField;
      newQuery._orderByDirection = this._orderByDirection;
      newQuery._limit = n;
      return newQuery;
    }
    get() {
      let docs = mockStorage.getCollection(this.path, this._orderByField, this._orderByDirection);
      if (this._limit !== null) {
        docs = docs.slice(0, this._limit);
      }
      return Promise.resolve({
        docs: docs.map(doc => ({
          id: doc.id,
          exists: true,
          data: () => doc
        }))
      });
    }
    add(data) {
      const docId = Math.random().toString(36).substring(2, 15);
      mockStorage.setDoc(this.path, docId, data, false);
      return Promise.resolve(new MockDocRef(this.path, docId));
    }
    onSnapshot(onNext, onError) {
      const listenerId = Math.random().toString(36).substring(2, 15);
      const trigger = () => {
        this.get().then(onNext).catch(onError);
      };
      mockStorage.addListener(this.path, listenerId, trigger);
      trigger();
      return () => {
        mockStorage.removeListener(this.path, listenerId);
      };
    }
  }

  const mockAuth = {
    currentUser: null,
    _listeners: [],
    onAuthStateChanged(callback) {
      mockAuth._listeners.push(callback);
      const savedUser = localStorage.getItem('mj_mock_auth_user');
      if (savedUser) {
        const user = JSON.parse(savedUser);
        mockAuth.currentUser = user;
        setTimeout(() => callback(user), 50);
      } else {
        mockAuth.currentUser = null;
        setTimeout(() => callback(null), 50);
      }
      return () => {
        mockAuth._listeners = mockAuth._listeners.filter(cb => cb !== callback);
      };
    },
    signInWithPopup(provider) {
      return new Promise((resolve) => {
        const user = {
          uid: "dev-user-123",
          displayName: "Developer Student",
          email: "dev.student@missionjeet.local",
          photoURL: ""
        };
        mockAuth.currentUser = user;
        localStorage.setItem('mj_mock_auth_user', JSON.stringify(user));
        
        // Notify listeners
        mockAuth._listeners.forEach(cb => cb(user));
        
        setTimeout(() => {
          resolve({ user });
        }, 500);
      });
    },
    signOut() {
      return new Promise((resolve) => {
        mockAuth.currentUser = null;
        localStorage.removeItem('mj_mock_auth_user');
        
        // Notify listeners
        mockAuth._listeners.forEach(cb => cb(null));
        
        setTimeout(() => {
          resolve();
        }, 300);
      });
    }
  };

  // Mock methods on firebase object
  window.firebase = {
    initializeApp: () => {
      console.log("Mock Firebase: initialized");
      return {};
    },
    auth: () => mockAuth,
    firestore: () => ({
      collection: (name) => new MockCollectionRef(name)
    }),
    storage: () => ({
      ref: () => ({
        put: () => Promise.resolve({ ref: { getDownloadURL: () => Promise.resolve('') } })
      })
    })
  };
  window.firebase.auth.GoogleAuthProvider = class {};
  window.firebase.firestore = {
    FieldValue: {
      serverTimestamp: () => ({ _isFieldValue: true, type: 'serverTimestamp' })
    }
  };
}

// === FIREBASE CONFIG ===
const firebaseConfig = {
  apiKey: "AIzaSyB2QPlcQYURBZRURX5pswoYXQ7r8cCoDdY",
  authDomain: "manifestation-55647.firebaseapp.com",
  projectId: "manifestation-55647",
  storageBucket: "manifestation-55647.firebasestorage.app",
  messagingSenderId: "841602297177",
  appId: "1:841602297177:web:0196146d94ed7ae96a7048"
};
if (window.location.protocol !== 'file:') {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();


// === STATE ===
let currentUser = null;
let profile = {}, mission = {};
let tasks = [], tests = [], backlogs = [], revisions = [], chapters = {}, pyqData = {}, studyLogs = [];
let dailyHistory = {}, taskHistory = [];
let chartInstances = {};
let currentMarkTestId = null;
let currentRankMode = 'main';
let timerInterval = null, timerSeconds = 25*60, timerRunning = false, timerMode = 25;
let sectionRendered = {};

// === JEE CHAPTER DATA ===
const JEE_CHAPTERS = {
  physics: [
    'Units & Measurement','Kinematics','Laws of Motion','Work, Energy & Power',
    'System of Particles & Rotational Motion','Gravitation','Properties of Bulk Matter',
    'Thermodynamics','Behaviour of Perfect Gas','Oscillations & Waves',
    'Electric Charges & Fields','Electrostatic Potential','Current Electricity',
    'Moving Charges & Magnetism','Magnetism & Matter','Electromagnetic Induction',
    'Alternating Current','Electromagnetic Waves','Ray Optics','Wave Optics',
    'Dual Nature of Radiation','Atoms','Nuclei','Semiconductor Electronics',
    'Communication Systems','Fluid Mechanics','Circular Motion','Centre of Mass',
    'Modern Physics','Experimental Skills'
  ],
  chemistry: [
    'Some Basic Concepts','Structure of Atom','Classification of Elements',
    'Chemical Bonding','States of Matter','Thermodynamics','Equilibrium',
    'Redox Reactions','Hydrogen','s-Block Elements','p-Block Elements (11th)',
    'Organic Chemistry Basics','Hydrocarbons','Environmental Chemistry',
    'Solid State','Solutions','Electrochemistry','Chemical Kinetics',
    'Surface Chemistry','General Principles & Isolation','p-Block (12th)',
    'd & f Block Elements','Coordination Compounds','Haloalkanes & Haloarenes',
    'Alcohols, Phenols & Ethers','Aldehydes & Ketones','Carboxylic Acids',
    'Amines','Biomolecules'
  ],
  mathematics: [
    'Sets & Relations','Complex Numbers','Quadratic Equations',
    'Sequences & Series','Permutation & Combination','Binomial Theorem',
    'Matrices & Determinants','Limits & Continuity','Differentiability',
    'Applications of Derivatives','Indefinite Integration','Definite Integration',
    'Differential Equations','Straight Lines','Circles','Conic Sections',
    'Vectors','3D Geometry','Statistics & Probability','Trigonometry',
    'Inverse Trigonometry','Mathematical Reasoning','Fundamentals of Math',
    'Mathematical Induction','Height & Distance','Logarithms',
    'Functions','Continuity','Application of Integration','Miscellaneous'
  ]
};

const ACHIEVEMENTS_DEF = [
  {id:'streak3',icon:'ðŸ”¥',name:'First Fire',desc:'3-day study streak',type:'streak',target:3},
  {id:'streak7',icon:'âš¡',name:'Week Warrior',desc:'7-day streak',type:'streak',target:7},
  {id:'streak14',icon:'ðŸ’ª',name:'Fortnight Fighter',desc:'14-day streak',type:'streak',target:14},
  {id:'streak30',icon:'ðŸŒŸ',name:'Monthly Master',desc:'30-day streak',type:'streak',target:30},
  {id:'pyq100',icon:'ðŸ“',name:'PYQ Starter',desc:'100 PYQs solved',type:'pyq',target:100},
  {id:'pyq500',icon:'ðŸ“š',name:'PYQ Veteran',desc:'500 PYQs solved',type:'pyq',target:500},
  {id:'pyq1000',icon:'ðŸ†',name:'PYQ Champion',desc:'1000 PYQs solved',type:'pyq',target:1000},
  {id:'hours100',icon:'â±ï¸',name:'Century Hours',desc:'100 study hours',type:'hours',target:100},
  {id:'hours300',icon:'ðŸŽ¯',name:'Dedicated Scholar',desc:'300 study hours',type:'hours',target:300},
  {id:'hours500',icon:'ðŸš€',name:'IIT Ready',desc:'500 study hours',type:'hours',target:500},
  {id:'tests5',icon:'ðŸ§ª',name:'Test Taker',desc:'5 mock tests',type:'tests',target:5},
  {id:'tests25',icon:'ðŸ…',name:'Mock Master',desc:'25 mock tests',type:'tests',target:25},
];

// === INIT PARTICLES ===
function initParticles() {
  const c = document.getElementById('particles');
  const colors = ['#3b82f6','#7c3aed','#34d399','#fbbf24'];
  for (let i = 0; i < 25; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.cssText = `left:${Math.random()*100}vw;width:${1+Math.random()*2}px;height:${1+Math.random()*2}px;background:${colors[~~(Math.random()*colors.length)]};animation-duration:${10+Math.random()*15}s;animation-delay:${-Math.random()*25}s`;
    c.appendChild(p);
  }
}

// === AUTH ===
function signInWithGoogle() {
  document.getElementById('authLoadingWrap').classList.remove('hidden');
  document.getElementById('googleSignInBtn').style.display = 'none';
  auth.signInWithPopup(new firebase.auth.GoogleAuthProvider())
    .catch(e => {
      document.getElementById('authLoadingWrap').classList.add('hidden');
      document.getElementById('googleSignInBtn').style.display = 'flex';
      toast('âŒ Sign-in failed: ' + e.message, 'error');
    });
}
function signOutUser() {
  auth.signOut().then(() => { sectionRendered = {}; }).catch(e => toast('âŒ ' + e.message, 'error'));
}

auth.onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    initApp();
  } else {
    currentUser = null;
    document.getElementById('authScreen').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
  }
});

// === INIT APP ===
function initApp() {
  // === Hardcode Gemini API key (user-provided) ===
  const BUNDLED_KEY = 'AIzaSyAQ.Ab8RN6KTxPQ8HA_sThQjRz8i5qQi3VBHV6FlXhpdD1TLfEgYDQ';
  localStorage.setItem('mj_gemini_key', BUNDLED_KEY);
  // Pre-fill API key fields
  const kEl1 = document.getElementById('apiKeyInput');
  const kEl2 = document.getElementById('ms-apikey');
  if (kEl1) { kEl1.value = BUNDLED_KEY; kEl1.disabled = true; }
  if (kEl2) { kEl2.value = BUNDLED_KEY; kEl2.disabled = true; }

  initParticles();
  updateTopDate();
  setInterval(updateTopDate, 60000);
  loadProfile();
  loadMission();
  loadTasks();
  loadTests();
  loadDailyHistory();
  loadBacklogs();
  loadRevisions();
  loadStudyLogs();
  // Lazy-load chapters, pyq etc when needed
}

function updateTopDate() {
  const d = new Date();
  document.getElementById('pageDate').textContent = d.toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  document.getElementById('missionDateBadge').textContent = d.toLocaleDateString('en-IN',{month:'short',day:'numeric'});
}

// === HELPERS ===
const uDoc = col => db.collection('users').doc(currentUser.uid).collection(col);
const uRoot = () => db.collection('users').doc(currentUser.uid);
const todayKey = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const dayKey = d => {
  if (d instanceof Date) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return d;
};

// === SECTION NAVIGATION ===
function goSection(sec, btnEl, isMobile) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const target = document.getElementById('sec-' + sec);
  if (target) { target.classList.add('active'); }

  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const matchingNavBtn = document.querySelector(`.nav-btn[data-sec="${sec}"]`);
  if (matchingNavBtn) matchingNavBtn.classList.add('active');

  document.querySelectorAll('.bottom-nav-btn').forEach(b => b.classList.remove('active'));
  const matchingBN = document.querySelector(`.bottom-nav-btn[data-sec="${sec}"]`);
  if (matchingBN) matchingBN.classList.add('active');

  const titles = {dashboard:'Dashboard',tasks:"Today's Tasks",backlogs:'Backlogs',tests:'Test Arsenal',chapters:'Chapter Tracker',revisions:'Revision Engine',pyq:'PYQ Tracker',weakness:'Weakness Detector',rankPredictor:'Rank Predictor',radar:'Mission Radar',analytics:'Study Analytics',achievements:'Achievements',settings:'Settings'};
  document.getElementById('pageTitle').textContent = titles[sec] || sec;

  if (isMobile) closeMobileSidebar();

  // Lazy init static/large lists
  if (!sectionRendered[sec]) {
    sectionRendered[sec] = true;
    if (sec === 'chapters') renderChapters();
    if (sec === 'pyq') renderPYQ();
    if (sec === 'achievements') renderAchievements();
  }
  // Always update dynamic views on tab navigation
  if (sec === 'analytics') { renderAnalytics(); renderHeatmap(); }
  if (sec === 'radar') renderRadar();
  if (sec === 'rankPredictor') updateRankPredictor();
  if (sec === 'weakness') updateWeaknessDetector();
  window.scrollTo({top:0,behavior:'smooth'});
}

// === MOBILE SIDEBAR ===
function openMobileSidebar() {
  document.getElementById('sidebar').classList.add('mobile-open');
  document.getElementById('sidebarOverlay').classList.add('show');
}
function closeMobileSidebar() {
  document.getElementById('sidebar').classList.remove('mobile-open');
  document.getElementById('sidebarOverlay').classList.remove('show');
}

// === SETTINGS TABS ===
function showSettingsTab(tab, btn) {
  document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.settings-tab').forEach(b => b.classList.remove('active'));
  document.getElementById('stab-' + tab).classList.add('active');
  if (btn) btn.classList.add('active');
}

// === MODALS ===
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-bg')) e.target.classList.remove('open');
});

// === TOAST ===
function toast(msg, type = 'info', duration = 3000) {
  const box = document.getElementById('toastBox');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  box.appendChild(el);
  if (duration) setTimeout(() => el.remove(), duration);
}

// === CONFETTI ===
function fireConfetti() {
  const colors = ['#2563eb','#7c3aed','#34d399','#fbbf24','#f87171','#06b6d4'];
  for (let i = 0; i < 20; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.cssText = `left:${20+Math.random()*60}%;top:${20+Math.random()*20}%;background:${colors[~~(Math.random()*colors.length)]};animation-delay:${Math.random()*0.5}s;animation-duration:${0.8+Math.random()*0.6}s`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  }
}

// ================================================================
//  PROFILE
// ================================================================
function loadProfile() {
  uRoot().get().then(doc => {
    profile = doc.exists ? doc.data() : {};
    applyProfile();
  }).catch(()=>{});
}
function applyProfile() {
  const name = profile.displayName || currentUser.displayName || 'Student';
  const email = profile.email || currentUser.email || '';
  const photo = localStorage.getItem('mjPhoto_'+currentUser.uid) || currentUser.photoURL || '';
  document.getElementById('sbUserName').textContent = name.split(' ')[0];
  document.getElementById('topbarUser').textContent = name;
  document.getElementById('profileDisplayName').textContent = name;
  document.getElementById('profileDisplayEmail').textContent = email;
  document.getElementById('pf-name').value = name;
  if (profile.targetExam) document.getElementById('pf-exam').value = profile.targetExam;
  if (profile.class) document.getElementById('pf-class').value = profile.class;
  if (profile.school) document.getElementById('pf-school').value = profile.school;
  if (profile.city) document.getElementById('pf-city').value = profile.city;
  if (profile.coaching) document.getElementById('pf-coaching').value = profile.coaching;
  if (profile.batch) document.getElementById('pf-batch').value = profile.batch;
  if (profile.wakeTime) document.getElementById('pf-wake').value = profile.wakeTime;
  if (profile.sleepTime) document.getElementById('pf-sleep').value = profile.sleepTime;
  if (photo) {
    const img = document.getElementById('sbAvatarImg');
    img.src = photo; img.style.display = 'block';
    document.getElementById('sbAvatarFallback').style.display = 'none';
    const pi = document.getElementById('profilePhotoImg');
    pi.src = photo; pi.style.display = 'block';
    document.getElementById('profilePhotoFallback').style.display = 'none';
  }
}
async function saveProfile() {
  const data = {
    displayName: document.getElementById('pf-name').value.trim() || 'Student',
    email: currentUser.email,
    targetExam: document.getElementById('pf-exam').value,
    class: document.getElementById('pf-class').value.trim(),
    school: document.getElementById('pf-school').value.trim(),
    city: document.getElementById('pf-city').value.trim(),
    coaching: document.getElementById('pf-coaching').value.trim(),
    batch: document.getElementById('pf-batch').value.trim(),
    wakeTime: document.getElementById('pf-wake').value,
    sleepTime: document.getElementById('pf-sleep').value,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  try { await uRoot().set(data, {merge:true}); profile = {...profile,...data}; applyProfile(); toast('âœ… Profile saved!','success'); }
  catch(e) { toast('âŒ '+e.message,'error'); }
}
async function uploadProfilePhoto(input) {
  if (!input.files?.[0]) return;
  const file = input.files[0];
  if (file.size > 5*1024*1024) { toast('âŒ Photo must be under 5MB','error'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    const url = e.target.result;
    localStorage.setItem('mjPhoto_'+currentUser.uid, url);
    document.getElementById('sbAvatarImg').src = url;
    document.getElementById('sbAvatarImg').style.display = 'block';
    document.getElementById('sbAvatarFallback').style.display = 'none';
    document.getElementById('profilePhotoImg').src = url;
    document.getElementById('profilePhotoImg').style.display = 'block';
    document.getElementById('profilePhotoFallback').style.display = 'none';
    toast('âœ… Photo saved!','success');
  };
  reader.readAsDataURL(file);
}

// ================================================================
//  MISSION
// ================================================================
function loadMission() {
  uDoc('mission').doc('goals').get().then(doc => {
    mission = doc.exists ? doc.data() : {};
    applyMission();
    updateDashMissionTarget();
  }).catch(()=>{});
}
function applyMission() {
  if (mission.dreamCollege) document.getElementById('ms-college').value = mission.dreamCollege;
  if (mission.dreamBranch) document.getElementById('ms-branch').value = mission.dreamBranch;
  if (mission.targetRank) document.getElementById('ms-rank').value = mission.targetRank;
  if (mission.targetPercentile) document.getElementById('ms-percentile').value = mission.targetPercentile;
  if (mission.studyHours) document.getElementById('ms-hours').value = mission.studyHours;
  if (mission.dailyTasks) document.getElementById('ms-tasks').value = mission.dailyTasks;
}
async function saveMission() {
  const data = {
    dreamCollege: document.getElementById('ms-college').value,
    dreamBranch: document.getElementById('ms-branch').value,
    targetRank: document.getElementById('ms-rank').value,
    targetPercentile: document.getElementById('ms-percentile').value,
    studyHours: parseInt(document.getElementById('ms-hours').value)||8,
    dailyTasks: parseInt(document.getElementById('ms-tasks').value)||10,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  try { await uDoc('mission').doc('goals').set(data,{merge:true}); mission = {...mission,...data}; updateDashMissionTarget(); toast('ðŸš€ Mission saved!','success'); }
  catch(e) { toast('âŒ '+e.message,'error'); }
}
function updateDashMissionTarget() {
  document.getElementById('dash-college').textContent = mission.dreamCollege || 'Not Set';
  document.getElementById('dash-rank').textContent = mission.targetRank || 'Not Set';
  document.getElementById('dash-percentile').textContent = mission.targetPercentile ? mission.targetPercentile + ' percentile' : 'Not Set';
  document.getElementById('dash-hours-goal').textContent = (mission.studyHours || 8) + ' hrs';
}

// ================================================================
//  TASKS
// ================================================================
function loadTasks() {
  uDoc('tasks').orderBy('createdAt').onSnapshot(snap => {
    tasks = snap.docs.map(d => ({id:d.id,...d.data()})).filter(t => t.active !== false);
    renderTasks();
    updateDashboard();
    updateBadges();
    updateAnalyticsIfActive();
  }, e => toast('âŒ Tasks: '+e.message,'error'));
}
function loadDailyHistory() {
  uDoc('history').onSnapshot(snap => {
    dailyHistory = {};
    snap.docs.forEach(d => { dailyHistory[d.id] = d.data(); });
    renderTasks();
    updateDashboard();
    updateSidebarProgress();
    updateAnalyticsIfActive();
  }, ()=>{});
}
function updateAnalyticsIfActive() {
  renderAnalytics();
  renderHeatmap();
}
function renderTasks() {
  const today = todayKey(), hist = dailyHistory[today] || {};
  const done = tasks.filter(t => hist[t.id]).length;
  const pending = tasks.length - done;

  document.getElementById('taskBadge').textContent = pending;
  document.getElementById('taskBadge').style.display = pending > 0 ? 'inline' : 'none';
  document.getElementById('h-pending').textContent = pending;

  const makeTaskHTML = (t, inDash) => {
    const isDone = hist[t.id];
    const subClass = (t.subject||'general').toLowerCase();
    return `<div class="task-item ${isDone?'done':''}" onclick="toggleTask('${t.id}')">
      <div class="task-check">${isDone?'âœ“':''}</div>
      <div class="task-emoji">${t.icon||'âš¡'}</div>
      <div class="task-info">
        <div class="task-name">${t.name}</div>
        <div class="task-meta">${t.subject||''}${t.detail?' Â· '+t.detail:''}</div>
      </div>
      <div class="task-subject-dot ${subClass}"></div>
    </div>`;
  };

  const taskListEl = document.getElementById('taskList');
  if (tasks.length) taskListEl.innerHTML = tasks.map(t => makeTaskHTML(t)).join('');
  else taskListEl.innerHTML = '<div class="empty-state"><span class="empty-state-icon">ðŸ“</span><div class="empty-state-text">No tasks yet. Add your study plan!</div></div>';

  const dashEl = document.getElementById('dashTaskList');
  const pendingTasks = tasks.filter(t => !hist[t.id]);
  if (pendingTasks.length) dashEl.innerHTML = pendingTasks.slice(0,4).map(t => makeTaskHTML(t, true)).join('');
  else dashEl.innerHTML = '<div class="empty-state"><span class="empty-state-icon">ðŸŽ‰</span><div class="empty-state-text">All tasks done! Great work!</div></div>';

  // Manage task table
  const tbody = document.getElementById('manageTaskBody');
  const tbody2 = document.getElementById('settingsTaskBody');
  const rows = tasks.map(t => {
    const isDone = hist[t.id];
    const subColor = t.subject === 'Physics' ? 'blue' : t.subject === 'Chemistry' ? 'green' : t.subject === 'Mathematics' ? 'yellow' : 'blue';
    return `<tr>
      <td style="font-size:18px">${t.icon||'âš¡'}</td>
      <td style="font-weight:700;font-size:12px">${t.name}</td>
      <td><span class="badge badge-${subColor}">${t.subject||'General'}</span></td>
      <td style="font-size:11px;color:var(--txt-2)">${t.detail||'â€”'}</td>
      <td>${isDone?'<span class="badge badge-green">âœ… Done</span>':'<span class="badge badge-yellow">â³ Pending</span>'}</td>
      <td><button class="btn btn-ghost btn-sm" onclick="editTask('${t.id}')">Edit</button> <button class="btn btn-danger btn-sm" onclick="deleteTask('${t.id}')">Del</button></td>
    </tr>`;
  }).join('');
  if (tbody) tbody.innerHTML = rows || '<tr><td colspan="6" style="text-align:center;color:var(--txt-3);padding:20px">No tasks</td></tr>';
  if (tbody2) tbody2.innerHTML = rows || '<tr><td colspan="6" style="text-align:center;color:var(--txt-3);padding:20px">No tasks</td></tr>';

  updateSidebarProgress();
}
async function toggleTask(id) {
  const today = todayKey(), hist = {...(dailyHistory[today]||{})};
  const nowDone = !hist[id];
  hist[id] = nowDone;
  dailyHistory[today] = hist;
  try {
    await uDoc('history').doc(today).set(hist, {merge:true});
    if (nowDone) {
      fireConfetti();
      const task = tasks.find(t => t.id === id);
      if (task) await uDoc('taskEvents').add({taskId:id, name:task.name, subject:task.subject, date:today, ts:firebase.firestore.FieldValue.serverTimestamp()});
    }
    renderTasks();
    updateDashboard();
    checkAchievements();
  } catch(e) { toast('âŒ '+e.message,'error'); }
}
async function resetTasks() {
  const today = todayKey();
  dailyHistory[today] = {};
  try { await uDoc('history').doc(today).set({}); renderTasks(); updateDashboard(); } catch(e) { toast('âŒ '+e.message,'error'); }
}
function openTaskModal() {
  document.getElementById('taskModalTitle').textContent = 'Add Task';
  document.getElementById('t-name').value = '';
  document.getElementById('t-icon').value = 'âš¡';
  document.getElementById('t-subject').value = 'General';
  document.getElementById('t-detail').value = '';
  document.getElementById('t-editId').value = '';
  openModal('taskModal');
}
function editTask(id) {
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  document.getElementById('taskModalTitle').textContent = 'Edit Task';
  document.getElementById('t-name').value = t.name;
  document.getElementById('t-icon').value = t.icon || 'âš¡';
  document.getElementById('t-subject').value = t.subject || 'General';
  document.getElementById('t-detail').value = t.detail || '';
  document.getElementById('t-editId').value = id;
  openModal('taskModal');
}
async function saveTask() {
  const name = document.getElementById('t-name').value.trim();
  if (!name) { toast('âš ï¸ Task name required','error'); return; }
  const data = {name, icon:document.getElementById('t-icon').value, subject:document.getElementById('t-subject').value, detail:document.getElementById('t-detail').value.trim(), active:true, createdAt:firebase.firestore.FieldValue.serverTimestamp()};
  const editId = document.getElementById('t-editId').value;
  try {
    if (editId) await uDoc('tasks').doc(editId).update({name:data.name,icon:data.icon,subject:data.subject,detail:data.detail});
    else await uDoc('tasks').add(data);
    closeModal('taskModal');
    toast('âœ… Task saved!','success');
  } catch(e) { toast('âŒ '+e.message,'error'); }
}
async function deleteTask(id) {
  if (!confirm('Remove this task?')) return;
  try { await uDoc('tasks').doc(id).update({active:false}); toast('ðŸ—‘ï¸ Task removed','info'); }
  catch(e) { toast('âŒ '+e.message,'error'); }
}

// ================================================================
//  TESTS
// ================================================================
let allTests = [], testFilter = 'all';
function loadTests() {
  uDoc('tests').onSnapshot(snap => {
    allTests = snap.docs.map(d => ({id:d.id,...d.data()})).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    tests = allTests;
    renderTests();
    updateDashboard();
    updateWeaknessDetector();
    updateRankPredictor();
    updateAnalyticsIfActive();
    checkAchievements();
  }, e => toast('âŒ Tests: '+e.message,'error'));
}
function isCompleted(t) {
  const norm = normalizeTest(t);
  return norm.pct !== null && norm.pct !== undefined && !isNaN(norm.pct);
}
function renderTests() {
  const filtered = testFilter === 'all'
    ? allTests
    : testFilter === 'upcoming'
      ? allTests.filter(t => !isCompleted(t) && t.date && new Date(t.date) >= new Date())
      : allTests.filter(isCompleted);
  const tbody = document.getElementById('testTableBody');
  if (!filtered.length) { tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--txt-3);padding:30px">No tests found</td></tr>'; return; }
  tbody.innerHTML = filtered.map(t => {
    const norm = normalizeTest(t);
    const pct = norm.pct;
    const completed = pct !== null;
    const statusBadge = completed
      ? `<span class="badge badge-green">âœ… Done</span>`
      : (t.date&&new Date(t.date)<new Date() ? `<span class="badge badge-red">Missed</span>` : `<span class="badge badge-blue">ðŸ“… Upcoming</span>`);
    const action = completed 
      ? `<span style="color:var(--txt-3);font-size:11px">—</span>` 
      : `<button class="btn btn-primary btn-sm" onclick="openMarksModal('${t.id}')">Submit</button> <button class="btn btn-ghost btn-sm" onclick="deleteTest('${t.id}')">Del</button>`;
    const pctColor = (p) => p>=70?'var(--green-l)':p>=50?'var(--yellow-l)':p!==null?'var(--red-l)':'var(--txt-3)';
    const physPct = (t.physicsScore!==undefined&&(t.physicsTotal||0)>0) ? Math.round((t.physicsScore||0)/t.physicsTotal*100) : null;
    const chemPct = (t.chemScore!==undefined&&(t.chemTotal||0)>0) ? Math.round((t.chemScore||0)/t.chemTotal*100) : null;
    const mathPct = (t.mathScore!==undefined&&(t.mathTotal||0)>0) ? Math.round((t.mathScore||0)/t.mathTotal*100) : null;
    const showPct = (p) => p!==null ? `<span style="font-weight:800;color:${pctColor(p)}">${p}%</span>` : 'â€”';
    const testName = t.testNumber||t.subject||'Test';
    return `<tr>
      <td style="font-size:12px;font-weight:700;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${testName}">${testName}</td>
      <td><span class="badge ${t.type==='JEE Main'?'badge-blue':t.type==='JEE Advanced'?'badge-purple':'badge-cyan'}" style="font-size:9px">${t.type||'â€”'}</span></td>
      <td style="font-size:11px;font-family:'JetBrains Mono',monospace">${t.date||'â€”'}</td>
      <td style="font-family:'JetBrains Mono',monospace;text-align:center">${showPct(physPct)}</td>
      <td style="font-family:'JetBrains Mono',monospace;text-align:center">${showPct(chemPct)}</td>
      <td style="font-family:'JetBrains Mono',monospace;text-align:center">${showPct(mathPct)}</td>
      <td style="font-weight:900;color:${pctColor(pct)};font-family:'JetBrains Mono',monospace">${pct!==null?pct+'%':'â€”'}</td>
      <td>${statusBadge}</td>
      <td>${action}</td>
  }).join('');
  if (document.getElementById('historyModal')?.classList.contains('open')) {
    renderHistoryTable();
  }
}
function filterTests(f, btn) {
  testFilter = f;
  document.querySelectorAll('#sec-tests .btn-ghost').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderTests();
}
function openModal_test() { openModal('testModal'); }
function saveTest() {
  const date = document.getElementById('ts-date').value;
  if (!date) { toast('âš ï¸ Select a date','error'); return; }
  const physMax = parseInt(document.getElementById('ts-phys-max').value)||120;
  const chemMax = parseInt(document.getElementById('ts-chem-max').value)||120;
  const mathMax = parseInt(document.getElementById('ts-math-max').value)||120;
  const testNum = (document.getElementById('ts-number').value||'').trim();
  const data = {
    testNumber: testNum || document.getElementById('ts-type').value,
    subject: 'PCM',
    type: document.getElementById('ts-type').value,
    date,
    physicsTotal: physMax,
    chemTotal: chemMax,
    mathTotal: mathMax,
    maxMarks: physMax+chemMax+mathMax,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  uDoc('tests').add(data).then(()=>{ closeModal('testModal'); toast('ðŸ“… Test scheduled!','success'); }).catch(e=>toast('âŒ '+e.message,'error'));
}
function updateTestTotal() {
  const p = parseInt(document.getElementById('ts-phys-max')?.value)||0;
  const c = parseInt(document.getElementById('ts-chem-max')?.value)||0;
  const m = parseInt(document.getElementById('ts-math-max')?.value)||0;
  const el = document.getElementById('tsTotalMarks');
  if (el) el.textContent = p+c+m;
}
function openMarksModal(id) {
  currentMarkTestId = id;
  const t = allTests.find(t=>t.id===id);
  if (!t) return;
  const label = t.testNumber || t.subject || 'Test';
  document.getElementById('marksTestInfo').textContent = `${label} â€” ${t.type||'â€”'} â€” ${t.date||'â€”'}`;
  const physMax = t.physicsTotal||120;
  const chemMax = t.chemTotal||120;
  const mathMax = t.mathTotal||120;
  document.getElementById('m-phys').value = t.physicsScore!==undefined ? t.physicsScore : '';
  document.getElementById('m-phys-max').value = physMax;
  document.getElementById('m-chem').value = t.chemScore!==undefined ? t.chemScore : '';
  document.getElementById('m-chem-max').value = chemMax;
  document.getElementById('m-math').value = t.mathScore!==undefined ? t.mathScore : '';
  document.getElementById('m-math-max').value = mathMax;
  const aiBox = document.getElementById('marksAiBox');
  if (aiBox) { aiBox.style.display='none'; aiBox.innerHTML=''; }
  document.getElementById('marksTotalDisplay').textContent = 'â€” / â€”';
  document.getElementById('marksPctDisplay').textContent = 'â€”%';
  document.getElementById('m-phys-pct').textContent = 'â€”';
  document.getElementById('m-chem-pct').textContent = 'â€”';
  document.getElementById('m-math-pct').textContent = 'â€”';
  updateMarksTotal();
  openModal('marksModal');
}
function updateMarksTotal() {
  const physScore = parseFloat(document.getElementById('m-phys')?.value);
  const physMax = parseFloat(document.getElementById('m-phys-max')?.value)||120;
  const chemScore = parseFloat(document.getElementById('m-chem')?.value);
  const chemMax = parseFloat(document.getElementById('m-chem-max')?.value)||120;
  const mathScore = parseFloat(document.getElementById('m-math')?.value);
  const mathMax = parseFloat(document.getElementById('m-math-max')?.value)||120;
  const colColor = (p) => p>=70?'var(--green-l)':p>=50?'var(--yellow-l)':'var(--red-l)';
  const physHas = document.getElementById('m-phys')?.value !== '';
  const chemHas = document.getElementById('m-chem')?.value !== '';
  const mathHas = document.getElementById('m-math')?.value !== '';
  const pp = physMax>0&&physHas ? Math.round(physScore/physMax*100) : null;
  const cp = chemMax>0&&chemHas ? Math.round(chemScore/chemMax*100) : null;
  const mp = mathMax>0&&mathHas ? Math.round(mathScore/mathMax*100) : null;
  const physPctEl = document.getElementById('m-phys-pct');
  const chemPctEl = document.getElementById('m-chem-pct');
  const mathPctEl = document.getElementById('m-math-pct');
  if (physPctEl) { physPctEl.textContent = pp!==null?pp+'%':'â€”'; if(pp!==null) physPctEl.style.color=colColor(pp); }
  if (chemPctEl) { chemPctEl.textContent = cp!==null?cp+'%':'â€”'; if(cp!==null) chemPctEl.style.color=colColor(cp); }
  if (mathPctEl) { mathPctEl.textContent = mp!==null?mp+'%':'â€”'; if(mp!==null) mathPctEl.style.color=colColor(mp); }
  if (physHas||chemHas||mathHas) {
    const tot = (physHas?physScore:0)+(chemHas?chemScore:0)+(mathHas?mathScore:0);
    const maxTot = (physHas?physMax:0)+(chemHas?chemMax:0)+(mathHas?mathMax:0);
    const totPct = maxTot>0 ? Math.round(tot/maxTot*100) : 0;
    const tEl=document.getElementById('marksTotalDisplay'), pEl=document.getElementById('marksPctDisplay');
    if (tEl) tEl.textContent=`${tot}/${maxTot}`;
    if (pEl) { pEl.textContent=totPct+'%'; pEl.style.color=colColor(totPct); }
  }
}
async function submitMarks() {
  const physicsScore = parseFloat(document.getElementById('m-phys').value);
  const physMax = parseFloat(document.getElementById('m-phys-max').value)||120;
  const chemScore = parseFloat(document.getElementById('m-chem').value);
  const chemMax = parseFloat(document.getElementById('m-chem-max').value)||120;
  const mathScore = parseFloat(document.getElementById('m-math').value);
  const mathMax = parseFloat(document.getElementById('m-math-max').value)||120;
  if ([physicsScore,chemScore,mathScore].some(isNaN)) { toast('âš ï¸ Enter marks for all 3 subjects','error'); return; }
  if (physicsScore>physMax||chemScore>chemMax||mathScore>mathMax) { toast('âš ï¸ Score cannot exceed max marks','error'); return; }
  const totalScore = physicsScore+chemScore+mathScore;
  const totalMax = physMax+chemMax+mathMax;
  const pct = Math.round(totalScore/totalMax*100);
  try {
    await uDoc('tests').doc(currentMarkTestId).update({
      physicsScore, physicsTotal: physMax,
      chemScore, chemTotal: chemMax,
      mathScore, mathTotal: mathMax,
      score: totalScore, total: totalMax, pct,
      scoredAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    closeModal('marksModal');
    toast('âœ… Results saved! AI analyzing...','success');
    updateWeaknessDetector();
    updateRankPredictor();
    generateMentorInsights();
    aiAnalyzeTestResult(physicsScore,physMax,chemScore,chemMax,mathScore,mathMax,pct);
  } catch(e) { toast('âŒ '+e.message,'error'); }
}
async function deleteTest(id) {
  if (!confirm('Delete this test?')) return;
  try { await uDoc('tests').doc(id).delete(); toast('🗑️ Test deleted','info'); } catch(e) { toast('❌ '+e.message,'error'); }
}

// ================================================================
//  BACKLOGS
// ================================================================
function renderBacklogs() {
  const list = document.getElementById('backlogList');
  const pending = backlogs.filter(b => !b.done);
  document.getElementById('backlogBadge').textContent = pending.length;
  document.getElementById('backlogBadge').style.display = pending.length > 0 ? 'inline' : 'none';
  if (!pending.length) { list.innerHTML = '<div class="empty-state"><span class="empty-state-icon">🎉</span><div class="empty-state-text">No backlogs! You\'re all caught up.</div></div>'; return; }
  const pColor = {high:'badge-red', medium:'badge-yellow', low:'badge-green'};
  const makeItem = (b) => `
    <div class="task-item">
      <div class="task-check" onclick="toggleBacklog('${b.id}')" style="cursor:pointer;flex-shrink:0"></div>
      <div class="task-emoji">📚</div>
      <div class="task-info" onclick="toggleBacklog('${b.id}')" style="cursor:pointer">
        <div class="task-name">${b.name} <span class="badge ${pColor[b.priority]||'badge-blue'}" style="margin-left:6px">${b.priority||'medium'}</span></div>
        <div class="task-meta">${b.subject||''}</div>
      </div>
    </div>`;
  list.innerHTML = pending.map(makeItem).join('');
}
async function toggleBacklog(id) {
  const b = backlogs.find(b=>b.id===id);
  if (!b) return;
  if (!confirm(`Are you sure you want to mark the backlog topic "${b.name}" as completed? This will tick and permanently remove it from your list.`)) return;
  try {
    await uDoc('backlogs').doc(id).delete();
    fireConfetti(); 
    toast('✅ Backlog completed and removed!','success');
  } catch(e) { toast('❌ '+e.message,'error'); }
}
function openBacklogModal() {
  document.getElementById('bl-name').value = '';
  document.getElementById('bl-subject').value = 'Physics';
  document.getElementById('bl-priority').value = 'medium';
  openModal('backlogModal');
}
function loadBacklogs() {
  uDoc('backlogs').orderBy('createdAt','desc').onSnapshot(snap => {
    backlogs = snap.docs.map(d => ({id:d.id,...d.data()}));
    renderBacklogs();
    updateBadges();
  }, ()=>{});
}
function saveBacklog() {
  const name = document.getElementById('bl-name').value.trim();
  if (!name) { toast('⚠️ Topic name required','error'); return; }
  const subject = document.getElementById('bl-subject').value;
  const priority = document.getElementById('bl-priority').value;
  
  uDoc('backlogs').add({
    name, 
    subject, 
    priority, 
    done: false, 
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  })
  .then(() => { 
    closeModal('backlogModal'); 
    toast('📚 Backlog added','success'); 
  })
  .catch(e => toast('❌ '+e.message,'error'));
}

// ================================================================
//  CHAPTER TRACKER
// ================================================================
function loadChapters(callback) {
  uDoc('chapters').get().then(snap => {
    chapters = {};
    snap.docs.forEach(d => { chapters[d.id] = d.data(); });
    if (callback) callback();
  }).catch(()=>{ if(callback) callback(); });
}
function renderChapters() {
  loadChapters(() => {
    renderSubjectChapters('physics');
    renderSubjectChapters('chemistry');
    renderSubjectChapters('mathematics');
    updateChapterSummary();
  });
}
function renderSubjectChapters(subject) {
  const container = document.getElementById(`${subject.slice(0,4)}-chapters`);
  if (!container) return;
  const list = JEE_CHAPTERS[subject] || [];
  const subColors = {physics:'var(--blue-l)', chemistry:'var(--green-l)', mathematics:'var(--yellow-l)'};
  const color = subColors[subject] || 'var(--blue-l)';

  container.innerHTML = list.map((ch, i) => {
    const key = `${subject}_${i}`;
    const d = chapters[key] || {};
    const status = d.status || 'none';
    const revStatus = d.revisionStatus || '';
    const isRevDue = d.nextRevision && new Date(d.nextRevision) <= new Date();
    const statusBadge = status === 'done' ? '<span class="badge badge-green">âœ… Done</span>' :
      status === 'progress' ? '<span class="badge badge-yellow">ðŸ”„ In Progress</span>' : '';
    const revBadge = isRevDue ? '<span class="badge badge-red">âš ï¸ Rev Due</span>' :
      d.nextRevision ? '<span class="badge badge-blue">ðŸ“… Scheduled</span>' : '';
    const completion = status === 'done' ? 100 : status === 'progress' ? 50 : 0;
    return `<div class="chapter-card" id="cc-${key}">
      <div class="chapter-card-top">
        <div class="chapter-name">${ch}</div>
        <div class="chapter-status">${statusBadge}${revBadge}</div>
      </div>
      <div class="chapter-bar"><div class="chapter-bar-fill" style="width:${completion}%;background:${color}"></div></div>
      <div class="chapter-actions">
        <button class="chapter-action-btn ${status==='progress'?'active':''}" onclick="setChapterStatus('${key}','progress','${ch}','${subject}',event)">In Progress</button>
        <button class="chapter-action-btn ${status==='done'?'active':''}" onclick="setChapterStatus('${key}','done','${ch}','${subject}',event)">âœ… Done</button>
        ${d.pyqSolved ? `<span style="font-size:9px;color:var(--txt-3)">PYQ: ${d.pyqSolved}</span>` : ''}
      </div>
    </div>`;
  }).join('');

  // Update ring
  const total = list.length;
  const done = list.filter((_, i) => (chapters[`${subject}_${i}`] || {}).status === 'done').length;
  const pct = total > 0 ? Math.round(done/total*100) : 0;
  const circumference = 113.1;
  const offset = circumference - (pct/100 * circumference);
  const prefix = {physics:'phys', chemistry:'chem', mathematics:'math'}[subject];
  const ring = document.getElementById(`${prefix}-ring`);
  const pctEl = document.getElementById(`${prefix}-pct`);
  const summary = document.getElementById(`${prefix}-summary`);
  if (ring) ring.style.strokeDashoffset = offset;
  if (pctEl) pctEl.textContent = pct + '%';
  if (summary) summary.textContent = `${done}/${total}`;
}
function getSubjectPerformance() {
  const perf = { Physics: 70, Chemistry: 70, Mathematics: 70 };
  const completedTests = allTests.filter(t => t.physicsScore !== undefined && t.chemScore !== undefined && t.mathScore !== undefined);
  if (completedTests.length > 0) {
    let pScore = 0, pTotal = 0;
    let cScore = 0, cTotal = 0;
    let mScore = 0, mTotal = 0;
    completedTests.forEach(t => {
      pScore += (t.physicsScore || 0);
      pTotal += (t.physicsTotal || 120);
      cScore += (t.chemScore || 0);
      cTotal += (t.chemTotal || 120);
      mScore += (t.mathScore || 0);
      mTotal += (t.mathTotal || 120);
    });
    if (pTotal > 0) perf.Physics = Math.round(pScore / pTotal * 100);
    if (cTotal > 0) perf.Chemistry = Math.round(cScore / cTotal * 100);
    if (mTotal > 0) perf.Mathematics = Math.round(mScore / mTotal * 100);
  }
  return perf;
}

function addDays(dateStr, days) {
  const parts = dateStr.split('-');
  const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getOptimalDate(baseDateStr, maxRevisionsPerDay = 3) {
  const parts = baseDateStr.split('-');
  let date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  
  const loadMap = {};
  revisions.forEach(r => {
    if (!r.done && r.date) {
      loadMap[r.date] = (loadMap[r.date] || 0) + 1;
    }
  });
  
  for (let i = 0; i < 15; i++) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const checkDateStr = `${y}-${m}-${d}`;
    
    const currentLoad = loadMap[checkDateStr] || 0;
    if (currentLoad < maxRevisionsPerDay) {
      return checkDateStr;
    }
    date.setDate(date.getDate() + 1);
  }
  
  // Fallback: find day with minimum load
  date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  let minLoad = 999;
  let bestDateStr = baseDateStr;
  for (let i = 0; i < 15; i++) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const checkDateStr = `${y}-${m}-${d}`;
    
    const currentLoad = loadMap[checkDateStr] || 0;
    if (currentLoad < minLoad) {
      minLoad = currentLoad;
      bestDateStr = checkDateStr;
    }
    date.setDate(date.getDate() + 1);
  }
  return bestDateStr;
}

async function setChapterStatus(key, status, chapterName, subject, e) {
  e && e.stopPropagation();
  const prev = chapters[key] || {};
  const isNewDone = status === 'done' && prev.status !== 'done';
  const isUndone = status !== 'done' && prev.status === 'done';
  const data = {status, updatedAt: firebase.firestore.FieldValue.serverTimestamp()};
  
  if (isNewDone) {
    data.completedAt = new Date().toISOString().slice(0,10);
    
    // Calculate subject performance & PYQ details
    const perf = getSubjectPerformance();
    const subjectCap = subject.charAt(0).toUpperCase() + subject.slice(1);
    const subPerf = perf[subjectCap] || 70;
    
    const pyq = pyqData[key] || {};
    const pyqAcc = pyq.accuracy !== undefined ? pyq.accuracy : 60;
    const pyqSolved = pyq.solved || 0;
    const pyqTotal = pyq.total || 50;
    
    const spf = subPerf / 100;
    const spf_mod = (spf - 0.6) * 0.5;
    const qaf = pyqAcc / 100;
    const qaf_mod = (qaf - 0.6) * 0.5;
    const qcf = pyqTotal > 0 ? (pyqSolved / pyqTotal) : 0.5;
    const qcf_mod = (qcf - 0.5) * 0.3;
    
    let speedFactor = 1.0 + spf_mod + qaf_mod + qcf_mod;
    speedFactor = Math.max(0.5, Math.min(1.8, speedFactor));
    
    const i1 = Math.max(1, Math.round(1 * speedFactor));
    const i2 = Math.max(i1 + 1, Math.round(7 * speedFactor));
    const i3 = Math.max(i2 + 5, Math.round(30 * speedFactor));
    
    const d1Str = addDays(data.completedAt, i1);
    const d2Str = addDays(data.completedAt, i2);
    const d3Str = addDays(data.completedAt, i3);
    
    const date1 = getOptimalDate(d1Str, 3);
    const date2 = getOptimalDate(d2Str, 3);
    const date3 = getOptimalDate(d3Str, 3);
    
    data.nextRevision = date1;
    
    await scheduleRevision(chapterName, subject, date1, i1);
    await scheduleRevision(chapterName, subject, date2, i2);
    await scheduleRevision(chapterName, subject, date3, i3);
    
    toast(`ðŸ¤– AI scheduled revisions for ${chapterName} on Days ${i1}, ${i2}, ${i3}!`, 'success');
    fireConfetti();
  } else if (isUndone) {
    try {
      const pendingRevs = revisions.filter(r => !r.done && r.chapterName === chapterName && r.subject === subject);
      const deletePromises = pendingRevs.map(r => uDoc('revisions').doc(r.id).delete());
      await Promise.all(deletePromises);
      data.nextRevision = null;
      data.completedAt = null;
      toast(`ðŸ—‘ï¸ Cleared pending revisions for ${chapterName}`, 'info');
    } catch(e) {}
  }
  
  chapters[key] = {...prev, ...data};
  try { await uDoc('chapters').doc(key).set(data, {merge:true}); }
  catch(e2) { toast('âŒ '+e2.message,'error'); return; }
  renderSubjectChapters(subject);
  updateChapterSummary();
  updateWeaknessDetector();
  updateRadar();
  checkAchievements();
}

async function scheduleRevision(chapterName, subject, date, interval) {
  try {
    await uDoc('revisions').add({chapterName, subject, date, interval, done:false, createdAt:firebase.firestore.FieldValue.serverTimestamp()});
  } catch(e) {}
}
function toggleSubjectPanel(subject) {
  const prefix = {physics:'phys', chemistry:'chem', mathematics:'math'}[subject];
  const grid = document.getElementById(`${subject.slice(0,4)}-chapters`);
  const chevron = document.getElementById(`${prefix}-chevron`);
  if (!grid) return;
  const isOpen = grid.classList.contains('open');
  grid.classList.toggle('open');
  if (chevron) chevron.classList.toggle('open');
}
function updateChapterSummary() {
  const all = Object.values(chapters);
  const done = all.filter(c => c.status === 'done').length;
  const progress = all.filter(c => c.status === 'progress').length;
  const revDue = all.filter(c => c.nextRevision && new Date(c.nextRevision) <= new Date()).length;
  const doneEl = document.getElementById('chaptersDone');
  const progEl = document.getElementById('chaptersProgress');
  const revEl = document.getElementById('chaptersRevDue');
  if (doneEl) doneEl.textContent = `${done} Complete`;
  if (progEl) progEl.textContent = `${progress} In Progress`;
  if (revEl) revEl.textContent = `${revDue} Rev. Due`;
}

// ================================================================
//  REVISIONS
// ================================================================
function loadRevisions() {
  uDoc('revisions').orderBy('date').onSnapshot(snap => {
    revisions = snap.docs.map(d => ({id:d.id,...d.data()}));
    renderRevisions();
    updateRevBadges();
  }, ()=>{});
}
function renderRevisions() {
  const today = todayKey();
  const overdue = revisions.filter(r => !r.done && r.date < today);
  const dueToday = revisions.filter(r => !r.done && r.date === today);
  const upcoming = revisions.filter(r => !r.done && r.date > today).slice(0,10);
  const done = revisions.filter(r => r.done);

  document.getElementById('revOverdue').textContent = overdue.length;
  document.getElementById('revDueToday').textContent = dueToday.length;
  document.getElementById('revUpcoming').textContent = upcoming.length;
  document.getElementById('revDone').textContent = done.length;

  const makeRevItem = r => {
    const cls = r.date < today ? 'overdue' : r.date === today ? 'due-today' : '';
    const intCls = r.interval <= 3 ? 'd1' : r.interval <= 10 ? 'd7' : 'd30';
    return `<div class="rev-item ${r.done?'done':''} ${cls}" onclick="toggleRevision('${r.id}')">
      <div class="rev-check">${r.done?'âœ“':''}</div>
      <div class="rev-info">
        <div class="rev-name">${r.chapterName}</div>
        <div class="rev-meta">${r.subject||''} â€¢ Due: ${r.date}</div>
      </div>
      <span class="rev-interval ${intCls}">Day ${r.interval}</span>
    </div>`;
  };

  const overdueEl = document.getElementById('revOverdueList');
  overdueEl.innerHTML = overdue.length ? overdue.map(makeRevItem).join('') : '<div class="empty-state"><span class="empty-state-icon">ðŸŽ‰</span><div class="empty-state-text">No overdue revisions!</div></div>';
  const todayEl = document.getElementById('revTodayList');
  todayEl.innerHTML = dueToday.length ? dueToday.map(makeRevItem).join('') : '<div class="empty-state"><span class="empty-state-icon">âœ…</span><div class="empty-state-text">No revisions due today</div></div>';
  const upEl = document.getElementById('revUpcomingList');
  upEl.innerHTML = upcoming.length ? upcoming.map(makeRevItem).join('') : '<div class="empty-state"><span class="empty-state-icon">ðŸ“…</span><div class="empty-state-text">No upcoming revisions</div></div>';
}
async function toggleRevision(id) {
  const r = revisions.find(r => r.id === id);
  if (!r) return;
  const newDone = !r.done;
  try {
    await uDoc('revisions').doc(id).update({done:newDone, doneAt:newDone?firebase.firestore.FieldValue.serverTimestamp():null});
    if (newDone) { toast('âœ… Revision marked done!','success'); fireConfetti(); }
    updateRevBadges();
  } catch(e) { toast('âŒ '+e.message,'error'); }
}
function updateRevBadges() {
  const today = todayKey();
  const pending = revisions.filter(r => !r.done && r.date <= today).length;
  const revBadge = document.getElementById('revBadge');
  const bnRevBadge = document.getElementById('bnRevBadge');
  if (revBadge) { revBadge.textContent = pending; revBadge.style.display = pending > 0 ? 'inline' : 'none'; }
  if (bnRevBadge) { bnRevBadge.textContent = pending; bnRevBadge.style.display = pending > 0 ? 'block' : 'none'; }
  document.getElementById('h-revisions').textContent = pending;
}

// ================================================================
//  PYQ TRACKER
// ================================================================
function loadPYQData(callback) {
  uDoc('pyq').get().then(snap => {
    pyqData = {};
    snap.docs.forEach(d => { pyqData[d.id] = d.data(); });
    if (callback) callback();
  }).catch(()=>{ if(callback) callback(); });
}
function renderPYQ() {
  loadPYQData(() => {
    ['physics','chemistry','mathematics'].forEach(sub => renderPYQSubject(sub));
    updatePYQStats();
  });
}
function renderPYQSubject(subject) {
  const listId = {physics:'pyqPhysList', chemistry:'pyqChemList', mathematics:'pyqMathList'}[subject];
  const container = document.getElementById(listId);
  if (!container) return;
  const chapters = JEE_CHAPTERS[subject] || [];
  const subColor = {physics:'blue', chemistry:'green', mathematics:'yellow'}[subject];
  container.innerHTML = chapters.map((ch, i) => {
    const key = `${subject}_${i}`;
    const d = pyqData[key] || {};
    const solved = d.solved || 0, total = d.total || 50;
    const pct = total > 0 ? Math.round(solved/total*100) : 0;
    const acc = d.accuracy || 0;
    return `<div class="pyq-chapter-row">
      <div class="pyq-chapter-name">${ch}</div>
      <div class="pyq-bar"><div class="pyq-bar-fill" style="width:${pct}%"></div></div>
      <div class="pyq-chapter-solved">${solved}/${total}</div>
      <div class="pyq-chapter-acc">${acc}%</div>
      <button class="pyq-add-btn" onclick="openPYQModal('${key}','${ch}','${subject}')">Log</button>
    </div>`;
  }).join('');
  const badgeId = {physics:'pyqPhysBadge', chemistry:'pyqChemBadge', mathematics:'pyqMathBadge'}[subject];
  const totalSolved = chapters.reduce((sum,_,i) => sum + (pyqData[`${subject}_${i}`]?.solved||0), 0);
  const badge = document.getElementById(badgeId);
  if (badge) badge.textContent = `${totalSolved} solved`;
}
function togglePYQSubject(subject) {
  const listId = {physics:'pyqPhysList', chemistry:'pyqChemList', mathematics:'pyqMathList'}[subject];
  const el = document.getElementById(listId);
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}
function openPYQModal(key, chapter, subject) {
  const d = pyqData[key] || {};
  document.getElementById('pyqModalTitle').textContent = 'Log: ' + chapter;
  document.getElementById('pyq-chapter').value = chapter;
  document.getElementById('pyq-solved').value = d.solved || '';
  document.getElementById('pyq-total').value = d.total || 50;
  document.getElementById('pyq-accuracy').value = d.accuracy || '';
  document.getElementById('pyq-subject').value = subject;
  document.getElementById('pyq-chapterId').value = key;
  openModal('pyqModal');
}
async function savePYQ() {
  const key = document.getElementById('pyq-chapterId').value;
  const subject = document.getElementById('pyq-subject').value;
  const data = {
    solved: parseInt(document.getElementById('pyq-solved').value)||0,
    total: parseInt(document.getElementById('pyq-total').value)||50,
    accuracy: parseInt(document.getElementById('pyq-accuracy').value)||0,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  try {
    await uDoc('pyq').doc(key).set(data, {merge:true});
    pyqData[key] = {...(pyqData[key]||{}), ...data};
    closeModal('pyqModal');
    renderPYQSubject(subject);
    updatePYQStats();
    toast('âœ… PYQ progress saved!','success');
    checkAchievements();
  } catch(e) { toast('âŒ '+e.message,'error'); }
}
function updatePYQStats() {
  const all = Object.values(pyqData);
  const totalSolved = all.reduce((s,d) => s + (d.solved||0), 0);
  const avgAcc = all.length > 0 ? Math.round(all.reduce((s,d) => s + (d.accuracy||0), 0) / all.length) : 0;
  const pending = ['physics','chemistry','mathematics'].reduce((sum, sub) => {
    const chs = JEE_CHAPTERS[sub] || [];
    return sum + chs.filter((_,i) => !(pyqData[`${sub}_${i}`]?.solved)).length;
  }, 0);
  const el1 = document.getElementById('pyqTotalSolved');
  const el2 = document.getElementById('pyqAccuracy');
  const el3 = document.getElementById('pyqPending');
  if (el1) el1.textContent = totalSolved;
  if (el2) el2.textContent = avgAcc + '%';
  if (el3) el3.textContent = pending;
}

// ================================================================
//  WEAKNESS DETECTOR
// ================================================================
function updateWeaknessDetector() {
  try {
    const completedTests = getCompletedNormalized();
    const subjectScores = {};
    completedTests.forEach(t => {
      if (t.physicsScore!==undefined && t.chemScore!==undefined && t.mathScore!==undefined) {
        // New format: extract per-subject percentages
        const pp=(t.physicsTotal||0)>0?Math.round((t.physicsScore||0)/(t.physicsTotal||120)*100):0;
        const cp=(t.chemTotal||0)>0?Math.round((t.chemScore||0)/(t.chemTotal||120)*100):0;
        const mp=(t.mathTotal||0)>0?Math.round((t.mathScore||0)/(t.mathTotal||120)*100):0;
        if(!subjectScores['Physics'])subjectScores['Physics']=[];
        if(!subjectScores['Chemistry'])subjectScores['Chemistry']=[];
        if(!subjectScores['Mathematics'])subjectScores['Mathematics']=[];
        subjectScores['Physics'].push(pp);
        subjectScores['Chemistry'].push(cp);
        subjectScores['Mathematics'].push(mp);
      } else {
        const sub=t.subject;
        if (!subjectScores[sub]) subjectScores[sub]=[];
        subjectScores[sub].push(t.pct);
      }
    });

    // Build weakness data per subject
    const weakData = [];
    Object.entries(subjectScores).forEach(([sub, scores]) => {
      const avg = Math.round(scores.reduce((a,b)=>a+b,0)/scores.length);
      const category = avg < 40 ? 'danger' : avg < 60 ? 'caution' : 'good';
      weakData.push({name:sub, score:avg, category, count:scores.length, rec:getWeaknessRec(sub,avg,category)});
    });

    // Also add from chapters with low completion
    const chapterWeak = Object.entries(chapters).filter(([k,v]) => v.status !== 'done').slice(0,5).map(([k,v]) => {
      const [sub, i] = k.split('_');
      const ch = JEE_CHAPTERS[sub]?.[parseInt(i)];
      return ch ? {name:ch, score:v.status==='progress'?40:10, category:v.status==='progress'?'caution':'danger', count:0, rec:'Complete this chapter to strengthen your fundamentals.'} : null;
    }).filter(Boolean);

    const danger = weakData.filter(w => w.category === 'danger');
    const caution = weakData.filter(w => w.category === 'caution');
    const good = weakData.filter(w => w.category === 'good');

    const el1 = document.getElementById('weakDangerCount');
    const el2 = document.getElementById('weakCautionCount');
    const el3 = document.getElementById('weakGoodCount');
    if (el1) el1.textContent = danger.length;
    if (el2) el2.textContent = caution.length;
    if (el3) el3.textContent = good.length;

    const makeWCard = (w) => `<div class="weakness-card ${w.category}">
      <div class="weakness-name">${w.name}</div>
      <div class="weakness-score" style="color:${w.category==='danger'?'var(--red-l)':w.category==='caution'?'var(--yellow-l)':'var(--green-l)'}">${w.score}%</div>
      <div class="weakness-bar"><div class="weakness-bar-fill" style="width:${w.score}%;background:${w.category==='danger'?'var(--red-l)':w.category==='caution'?'var(--yellow-l)':'var(--green-l)'}"></div></div>
      <div class="weakness-rec">${w.rec}</div>
      ${w.count > 0 ? `<div style="font-size:10px;color:var(--txt-3);margin-top:6px">Based on ${w.count} test(s)</div>` : ''}
    </div>`;

    const dEl = document.getElementById('weakDangerList');
    const cEl = document.getElementById('weakCautionList');
    const gEl = document.getElementById('weakGoodList');
    if (dEl) dEl.innerHTML = danger.length ? danger.map(makeWCard).join('') : '<div class="empty-state"><span class="empty-state-icon">ðŸ†</span><div class="empty-state-text">No danger zones!</div></div>';
    if (cEl) cEl.innerHTML = caution.length ? caution.map(makeWCard).join('') : '<div class="empty-state"><span class="empty-state-icon">âœ¨</span><div class="empty-state-text">No caution zones!</div></div>';
    if (gEl) gEl.innerHTML = good.length ? good.map(makeWCard).join('') : '<div class="empty-state"><span class="empty-state-icon">ðŸ“š</span><div class="empty-state-text">Complete chapters and tests to see strong areas.</div></div>';
  } catch (e) {
    console.error('âŒ Error in updateWeaknessDetector:', e);
  }
}
function getWeaknessRec(sub, score, cat) {
  if (cat === 'danger') return `Critical: Score ${score}%. Focus on ${sub} fundamentals immediately. Solve 20+ problems daily.`;
  if (cat === 'caution') return `Needs work: ${score}% average. Revise weak topics and practice mixed problems.`;
  return `Strong performance at ${score}%. Maintain with weekly mock tests.`;
}

// ================================================================
//  RANK PREDICTOR
// ================================================================
function setRankMode(mode, btn) {
  currentRankMode = mode;
  document.querySelectorAll('.rank-toggle-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  updateRankPredictor();
}
function updateRankPredictor() {
  try {
    const completedTests = getCompletedNormalized();
    console.log('ðŸ“Š [DEBUG] updateRankPredictor | completedTests:', completedTests.length);
    const avgPct = completedTests.length > 0
      ? Math.round(completedTests.reduce((s,t) => s + t.pct, 0) / completedTests.length) : 0;

    // JEE Main percentile estimation based on score percentage
    let percentile = 0, rankEstimate = 0;
    if (currentRankMode === 'main') {
      // Approximate mapping (score% â†’ percentile)
      if (avgPct >= 95) percentile = 99.7;
      else if (avgPct >= 90) percentile = 99.2;
      else if (avgPct >= 85) percentile = 98.5;
      else if (avgPct >= 80) percentile = 97.5;
      else if (avgPct >= 75) percentile = 96;
      else if (avgPct >= 70) percentile = 93;
      else if (avgPct >= 65) percentile = 88;
      else if (avgPct >= 60) percentile = 82;
      else if (avgPct >= 55) percentile = 75;
      else if (avgPct >= 50) percentile = 65;
      else if (avgPct >= 40) percentile = 50;
      else percentile = Math.max(10, avgPct * 1.2);
      // JEE Main ~12 lakh candidates
      rankEstimate = Math.round((1 - percentile/100) * 1200000);
    } else {
      // JEE Advanced â€” ~2.5 lakh appear
      if (avgPct >= 90) percentile = 99.5;
      else if (avgPct >= 80) percentile = 98;
      else if (avgPct >= 70) percentile = 95;
      else if (avgPct >= 60) percentile = 88;
      else if (avgPct >= 50) percentile = 75;
      else if (avgPct >= 40) percentile = 55;
      else percentile = Math.max(5, avgPct);
      rankEstimate = Math.round((1 - percentile/100) * 250000);
    }

    const targetRankNum = parseInt(mission.targetRank) || 5000;
    const targetPct = parseFloat(mission.targetPercentile) || 99;

    // Update gauge
    const ring = document.getElementById('rankGaugeRing');
    const circumference = 452.4;
    if (ring) { ring.style.strokeDashoffset = circumference - (percentile/100 * circumference); ring.style.stroke = percentile >= 95 ? '#059669' : percentile >= 80 ? '#2563eb' : percentile >= 60 ? '#d97706' : '#dc2626'; }
    const pctEl = document.getElementById('rankPctVal');
    if (pctEl) pctEl.textContent = completedTests.length ? percentile.toFixed(1) : 'â€”';
    const estEl = document.getElementById('rankEstimate');
    if (estEl) estEl.textContent = completedTests.length ? `Based on ${completedTests.length} test(s) avg ${avgPct}%` : 'No test data yet';

    const rankCurEl = document.getElementById('rankCurrent');
    const rankTargEl = document.getElementById('rankTarget');
    const rankGapEl = document.getElementById('rankGap');
    const rankScoreEl = document.getElementById('rankScore');
    if (rankCurEl) rankCurEl.textContent = completedTests.length ? (rankEstimate > 0 ? rankEstimate.toLocaleString() : 'â€”') : 'â€”';
    if (rankTargEl) rankTargEl.textContent = targetRankNum ? targetRankNum.toLocaleString() : 'Not Set';
    if (rankGapEl) {
      const gap = rankEstimate - targetRankNum;
      rankGapEl.textContent = gap > 0 ? `${gap.toLocaleString()} ranks` : gap < 0 ? 'âœ… Ahead!' : 'â€”';
      rankGapEl.style.color = gap > 0 ? 'var(--red-l)' : gap < 0 ? 'var(--green-l)' : 'var(--txt-2)';
    }

    // Gap analysis by subject â€” handles both new per-subject and old single-subject format
    const srForRank = {Physics:[],Chemistry:[],Mathematics:[]};
    completedTests.forEach(t => {
      if (t.physicsScore!==undefined&&t.chemScore!==undefined&&t.mathScore!==undefined) {
        const pp=(t.physicsTotal||0)>0?Math.round((t.physicsScore||0)/(t.physicsTotal||120)*100):0;
        const cp=(t.chemTotal||0)>0?Math.round((t.chemScore||0)/(t.chemTotal||120)*100):0;
        const mp=(t.mathTotal||0)>0?Math.round((t.mathScore||0)/(t.mathTotal||120)*100):0;
        srForRank.Physics.push(pp);srForRank.Chemistry.push(cp);srForRank.Mathematics.push(mp);
      } else if (['Physics','Chemistry','Mathematics'].includes(t.subject)&&t.pct!==null) {
        srForRank[t.subject].push(t.pct);
      }
    });
    const subjectData={};
    Object.entries(srForRank).forEach(([sub,scores])=>{ if(scores.length>0) subjectData[sub]=Math.round(scores.reduce((a,b)=>a+b,0)/scores.length); });

    const gapEl = document.getElementById('rankGapAnalysis');
    if (gapEl) {
      if (Object.keys(subjectData).length) {
        gapEl.innerHTML = Object.entries(subjectData).map(([sub, pct]) => {
          const target = 75;
          const gap = Math.max(0, target - pct);
          return `<div class="rank-gap-item">
            <div class="rank-gap-label">${sub}</div>
            <div class="rank-gap-bar-wrap">
              <div class="rank-gap-bar-target" style="width:${target}%"></div>
              <div class="rank-gap-bar-current" style="width:${pct}%">${pct}%</div>
            </div>
            <div class="rank-gap-number" style="color:${gap>0?'var(--red-l)':'var(--green-l)'}">${gap>0?'+'+gap+'%':'âœ…'}</div>
          </div>`;
        }).join('');
      } else {
        gapEl.innerHTML = '<div class="empty-state"><span class="empty-state-icon">ðŸŽ¯</span><div class="empty-state-text">Take mock tests to see gap analysis</div></div>';
      }
    }

    const adviceEl = document.getElementById('rankAdvice');
    if (adviceEl && mission.targetRank) {
      const neededPct = mission.targetRank == '100' ? 99.8 : mission.targetRank == '500' ? 99.5 : mission.targetRank == '1000' ? 99.2 : mission.targetRank == '2500' ? 98.5 : mission.targetRank == '5000' ? 97 : 90;
      const gap = neededPct - percentile;
      adviceEl.innerHTML = gap > 0 ?
        `<div class="warning-notice">You need <strong>${neededPct}+ percentile</strong> for ${mission.targetRank}. Current: ${percentile.toFixed(1)}%. Gap: ${gap.toFixed(1)}%</div>
         <div style="font-size:13px;color:var(--txt-2);line-height:1.6">â€¢ Focus on accuracy over speed in mock tests<br>â€¢ Target 75%+ in all 3 subjects<br>â€¢ Complete all PYQs for weak chapters<br>â€¢ Schedule 2 full mocks per week</div>` :
        `<div style="background:rgba(5,150,105,0.1);border:1px solid rgba(5,150,105,0.2);border-radius:var(--r-sm);padding:12px 16px;font-size:13px;color:var(--green-l)">ðŸŽ‰ You're performing above your target rank level! Maintain consistency and don't let up.</div>`;
    } else if (adviceEl) {
      adviceEl.innerHTML = '<div class="info-notice">Set your target rank in Settings â†’ Mission to get personalized advice.</div>';
    }
  } catch (e) {
    console.error('âŒ Error in updateRankPredictor:', e);
  }
}

// ================================================================
//  MISSION RADAR
// ================================================================
function renderRadar() {
  const completedTests = getCompletedNormalized();
  const avgPct = completedTests.length ? Math.round(completedTests.reduce((s,t)=>s+t.pct,0)/completedTests.length) : 0;
  const today = todayKey(), hist = dailyHistory[today] || {};
  const tasksDone = tasks.filter(t => hist[t.id]).length;
  const taskCompletion = tasks.length ? Math.round(tasksDone/tasks.length*100) : 0;
  const revDone = revisions.filter(r => r.done).length;
  const revTotal = revisions.length;
  const revScore = revTotal > 0 ? Math.round(revDone/revTotal*100) : 0;
  const pyqAll = Object.values(pyqData);
  const pyqScore = pyqAll.length ? Math.round(pyqAll.reduce((s,d)=>s+(d.accuracy||0),0)/pyqAll.length) : 0;
  const chapAll = Object.values(chapters);
  const chapDone = chapAll.filter(c => c.status === 'done').length;
  const chapTotal = 89; // total JEE chapters
  const chapScore = Math.round(chapDone/chapTotal*100);
  const streak = calcStreak();
  const streakScore = Math.min(100, streak * 3.3);

  const scores = {
    'Test Score': avgPct,
    'Consistency': streakScore,
    'Chapter Completion': chapScore,
    'Revision': revScore,
    'PYQ Accuracy': pyqScore,
    'Task Completion': taskCompletion
  };
  const missionScore = Math.round(Object.values(scores).reduce((a,b)=>a+b,0)/6);

  const mScoreEl = document.getElementById('missionScoreVal');
  const mFillEl = document.getElementById('missionScoreFill');
  if (mScoreEl) mScoreEl.textContent = missionScore;
  if (mFillEl) mFillEl.style.width = missionScore + '%';

  const radarGrid = document.getElementById('radarScoreGrid');
  const scoreColors = ['var(--blue-l)','var(--green-l)','var(--yellow-l)','var(--purple-l)','var(--cyan)','var(--neon)'];
  if (radarGrid) {
    radarGrid.innerHTML = Object.entries(scores).map(([k,v],i) => `
      <div class="radar-score-card">
        <div class="radar-score-name">${k}</div>
        <div class="radar-score-val" style="color:${scoreColors[i]}">${Math.round(v)}%</div>
        <div class="radar-score-bar"><div class="radar-score-fill" style="width:${v}%;background:${scoreColors[i]}"></div></div>
      </div>`).join('');
  }

  if (chartInstances.radar) { chartInstances.radar.destroy(); }
  const ctx = document.getElementById('radarChart');
  if (ctx) {
    chartInstances.radar = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: Object.keys(scores),
        datasets: [{
          label: 'Current',
          data: Object.values(scores),
          backgroundColor: 'rgba(37,99,235,0.15)',
          borderColor: '#3b82f6',
          borderWidth: 2,
          pointBackgroundColor: '#3b82f6',
          pointRadius: 4
        },{
          label: 'Target (75)',
          data: Array(6).fill(75),
          backgroundColor: 'rgba(5,150,105,0.05)',
          borderColor: 'rgba(5,150,105,0.4)',
          borderWidth: 1,
          borderDash: [4,4],
          pointRadius: 0
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {r: {min:0, max:100, ticks:{display:false, stepSize:25}, grid:{color:'rgba(255,255,255,0.06)'}, pointLabels:{color:'rgba(238,242,255,0.6)',font:{size:11,weight:'700'}}, angleLines:{color:'rgba(255,255,255,0.05)'}}},
        plugins: {legend:{labels:{color:'rgba(238,242,255,0.6)',font:{size:11}}}}
      }
    });
  }
}
function updateRadar() { if (sectionRendered.radar) renderRadar(); }

// ================================================================
//  STUDY ANALYTICS
// ================================================================
function loadStudyLogs() {
  uDoc('studyLogs').orderBy('date','desc').limit(30).onSnapshot(snap => {
    studyLogs = snap.docs.map(d => ({id:d.id,...d.data()}));
    updateHoursWidget();
    updateAnalyticsIfActive();
  }, ()=>{});
}
function updateHoursWidget() {
  const today = todayKey();
  const week = new Date(); week.setDate(week.getDate()-7);
  const todayLog = studyLogs.filter(l => l.date === today).reduce((s,l)=>s+(l.hours||0),0);
  const weekLog = studyLogs.filter(l => new Date(l.date) >= week).reduce((s,l)=>s+(l.hours||0),0);
  const todayEl = document.getElementById('todayHours');
  const weekEl = document.getElementById('weekHours');
  if (todayEl) todayEl.textContent = todayLog.toFixed(1);
  if (weekEl) weekEl.textContent = weekLog.toFixed(1);
  if (document.getElementById('historyModal')?.classList.contains('open')) {
    renderHistoryTable();
  }
}
async function logStudySession() {
  const hours = parseFloat(document.getElementById('logHoursInput').value);
  if (isNaN(hours) || hours <= 0) { toast('âš ï¸ Enter valid hours','error'); return; }
  try {
    await uDoc('studyLogs').add({date:todayKey(), hours, ts:firebase.firestore.FieldValue.serverTimestamp()});
    document.getElementById('logHoursInput').value = '';
    toast(`âœ… ${hours}h logged!`,'success');
    checkAchievements();
    sectionRendered.analytics = false;
  } catch(e) { toast('âŒ '+e.message,'error'); }
}
// ================================================================
//  TEST NORMALIZATION â€” Handles all data structure variants
// ================================================================
function normalizeTest(t) {
  let score = null, total = 100, pct = null;

  // NEW FORMAT: per-subject scores
  if (t.physicsScore!==undefined && t.chemScore!==undefined && t.mathScore!==undefined) {
    score = (t.physicsScore||0)+(t.chemScore||0)+(t.mathScore||0);
    total = (t.physicsTotal||120)+(t.chemTotal||120)+(t.mathTotal||120);
    pct = total>0 ? Math.round(score/total*100) : null;
  } else {
    // OLD FORMAT: single score field
    const rawScore = t.score??t.marks??(t.percentage!==undefined?t.percentage:undefined);
    const rawTotal = t.total??t.maxMarks??100;
    if (rawScore!==undefined&&rawScore!==null) score=Number(String(rawScore).replace('%','').trim());
    if (isNaN(score)) score=null;
    total=(rawTotal!==undefined&&rawTotal!==null)?Number(String(rawTotal).trim()):100;
    if (isNaN(total)||total<=0) total=100;
    if (t.pct!==undefined&&t.pct!==null) pct=Number(String(t.pct).replace('%','').trim());
    else if (t.percentage!==undefined&&t.percentage!==null) pct=Number(String(t.percentage).replace('%','').trim());
    else if (score!==null&&total>0) pct=Math.round(score/total*100);
    if (isNaN(pct)) pct=null;
  }

  const rawSub=(t.subject||'General').trim();
  const subjectMap={
    'physics':'Physics','physics test':'Physics','phy':'Physics','ph':'Physics',
    'chemistry':'Chemistry','chemistry test':'Chemistry','chem':'Chemistry','ch':'Chemistry',
    'mathematics':'Mathematics','mathematics test':'Mathematics','maths':'Mathematics',
    'math':'Mathematics','maths test':'Mathematics','ma':'Mathematics',
    'pcm combined':'PCM Combined','pcm':'Full Mock','pcm combined':'PCM Combined',
    'full mock':'Full Mock','mock':'Full Mock','full syllabus':'Full Mock',
    'jee main':'Full Mock','jee advanced':'Full Mock','mock test':'Full Mock',
    'biology':'Biology','bio':'Biology'
  };
  const subject=subjectMap[rawSub.toLowerCase()]||rawSub;
  let date=t.date;
  if (!date&&t.createdAt) {
    try { const d=t.createdAt.toDate?t.createdAt.toDate():new Date(t.createdAt); date=d.toISOString().slice(0,10); }
    catch(e) { date=new Date().toISOString().slice(0,10); }
  }
  date=date||new Date().toISOString().slice(0,10);
  return {...t,score,total,pct,subject,date,_normalized:true};
}

// Returns all tests that have a valid score/percentage (completed)
function getCompletedNormalized() {
  const normalized = allTests.map(normalizeTest);
  console.log('ðŸ“Š Analytics | Total Tests in Arsenal:', allTests.length);
  console.log('ðŸ“Š Analytics | Normalized:', normalized.length);
  console.log('ðŸ“Š Analytics | Source:', JSON.stringify(normalized.map(t=>({sub:t.subject,pct:t.pct,date:t.date}))));
  return normalized
    .filter(t => t.pct !== null && t.pct !== undefined && !isNaN(t.pct))
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
}

function renderAnalytics() {
  try {
    const completedTests = getCompletedNormalized();
    const streak = calcStreak();
    const totalHours = studyLogs.reduce((s,l)=>s+(l.hours||0),0);
    const avgPct = completedTests.length
      ? Math.round(completedTests.reduce((s,t) => s + t.pct, 0) / completedTests.length)
      : 0;

    console.log('ðŸ“Š [DEBUG] renderAnalytics calls');
    console.log('ðŸ“Š [DEBUG] allTests length:', allTests.length);
    console.log('ðŸ“Š [DEBUG] completedTests length:', completedTests.length);

    // === KPIs ===
    const kpiTestsEl = document.getElementById('kpiTests');
    const kpiAvgEl   = document.getElementById('kpiAvgScore');
    const kpiStreakEl = document.getElementById('kpiStreak');
    const kpiHoursEl = document.getElementById('kpiHours');
    if (kpiTestsEl) kpiTestsEl.textContent = completedTests.length || allTests.length;
    if (kpiAvgEl)   kpiAvgEl.textContent   = completedTests.length ? avgPct + '%' : 'â€”';
    if (kpiStreakEl) kpiStreakEl.textContent = streak;
    if (kpiHoursEl) kpiHoursEl.textContent  = Math.round(totalHours);

    // Trend
    if (completedTests.length >= 4) {
      const recent4 = completedTests.slice(-4).map(t => t.pct);
      const half1 = (recent4[0]+recent4[1])/2, half2 = (recent4[2]+recent4[3])/2;
      const trendEl = document.getElementById('kpiAvgTrend');
      if (trendEl) {
        trendEl.textContent  = half2 > half1 ? 'â†‘ Improving' : half2 < half1 ? 'â†“ Declining' : 'â†’ Stable';
        trendEl.className = 'kpi-trend ' + (half2 > half1 ? 'up' : half2 < half1 ? 'down' : 'flat');
      }
    }

    // === TEST SCORE TREND CHART ===
    if (chartInstances.testTrend) { try { chartInstances.testTrend.destroy(); } catch(e){} delete chartInstances.testTrend; }
    const tCanvas = document.getElementById('chartTestTrend');
    const tEmptyEl = document.getElementById('chartTestTrendEmpty');
    if (tCanvas) {
      if (completedTests.length === 0) {
        tCanvas.classList.add('hidden');
        if (tEmptyEl) tEmptyEl.classList.remove('hidden');
      } else {
        tCanvas.classList.remove('hidden');
        if (tEmptyEl) tEmptyEl.classList.add('hidden');
        const last10 = completedTests.slice(-10);
        chartInstances.testTrend = new Chart(tCanvas, {
          type: 'line',
          data: {
            labels: last10.map(t => {
              const d = t.date || '';
              return d.length >= 7 ? d.slice(5).replace('-','/') : d;
            }),
            datasets: [{
              label: 'Score %',
              data: last10.map(t => t.pct),
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59,130,246,0.12)',
              borderWidth: 2.5,
              pointRadius: 5,
              pointBackgroundColor: last10.map(t => t.pct >= 70 ? '#34d399' : t.pct >= 50 ? '#fbbf24' : '#f87171'),
              pointBorderColor: '#0c1528',
              pointBorderWidth: 2,
              tension: 0.4,
              fill: true
            }]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: { callbacks: { label: ctx => ` Score: ${ctx.raw}%` } }
            },
            scales: {
              x: { ticks: { color: 'rgba(255,255,255,0.45)', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
              y: { min: 0, max: 100, ticks: { color: 'rgba(255,255,255,0.45)', callback: v => v+'%' }, grid: { color: 'rgba(255,255,255,0.05)' } }
            }
          }
        });
      }
    }

    // === SUBJECT BALANCE CHART ===
    if (chartInstances.subjectBal) { try { chartInstances.subjectBal.destroy(); } catch(e){} delete chartInstances.subjectBal; }
    const sCanvas = document.getElementById('chartSubjectBalance');
    const sEmptyEl = document.getElementById('chartSubjectBalanceEmpty');
    let pScore = 0, pTotal = 0;
    let cScore = 0, cTotal = 0;
    let mScore = 0, mTotal = 0;
    completedTests.forEach(t => {
      if (t.physicsScore !== undefined && t.chemScore !== undefined && t.mathScore !== undefined) {
        pScore += (t.physicsScore || 0);
        pTotal += (t.physicsTotal || 120);
        cScore += (t.chemScore || 0);
        cTotal += (t.chemTotal || 120);
        mScore += (t.mathScore || 0);
        mTotal += (t.mathTotal || 120);
      } else {
        const s = t.subject || 'Other';
        if (s === 'Physics') { pScore += (t.score || 0); pTotal += (t.total || 100); }
        else if (s === 'Chemistry') { cScore += (t.score || 0); cTotal += (t.total || 100); }
        else if (s === 'Mathematics' || s === 'Maths' || s === 'Math') { mScore += (t.score || 0); mTotal += (t.total || 100); }
      }
    });
    const subAvgPerf = {
      'Physics': pTotal > 0 ? Math.round(pScore / pTotal * 100) : 0,
      'Chemistry': cTotal > 0 ? Math.round(cScore / cTotal * 100) : 0,
      'Mathematics': mTotal > 0 ? Math.round(mScore / mTotal * 100) : 0
    };
    if (sCanvas) {
      if (completedTests.length === 0) {
        sCanvas.classList.add('hidden');
        if (sEmptyEl) sEmptyEl.classList.remove('hidden');
      } else {
        sCanvas.classList.remove('hidden');
        if (sEmptyEl) sEmptyEl.classList.add('hidden');
        const labels = Object.keys(subAvgPerf);
        const palette = {
          'Physics': 'rgba(59,130,246,0.85)',
          'Chemistry': 'rgba(52,211,153,0.85)',
          'Mathematics': 'rgba(251,191,36,0.85)',
          'PCM Combined': 'rgba(167,139,250,0.85)',
          'Full Mock': 'rgba(6,182,212,0.85)',
          'Biology': 'rgba(251,113,133,0.85)',
          'Other': 'rgba(148,163,184,0.85)'
        };
        chartInstances.subjectBal = new Chart(sCanvas, {
          type: 'doughnut',
          data: {
            labels,
            datasets: [{
              data: labels.map(k => subAvgPerf[k]),
              backgroundColor: labels.map(k => palette[k] || 'rgba(148,163,184,0.85)'),
              borderWidth: 0,
              hoverOffset: 8
            }]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
              legend: { labels: { color: 'rgba(255,255,255,0.6)', font: { size: 11 }, padding: 14 } },
              tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw}% Avg Score` } },
              layout: { padding: 4 }
            },
            cutout: '60%'
          }
        });
      }
    }

    // === STUDY HOURS CHART (last 14 days) ===
    if (chartInstances.studyHours) { try { chartInstances.studyHours.destroy(); } catch(e){} delete chartInstances.studyHours; }
    const hCanvas = document.getElementById('chartStudyHours');
    const last14 = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const hrs = studyLogs.filter(l => l.date === key).reduce((s,l) => s + (l.hours || 0), 0);
      last14.push({ date: d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }), hours: Number(hrs.toFixed(1)) });
    }
    if (hCanvas) {
      chartInstances.studyHours = new Chart(hCanvas, {
        type: 'bar',
        data: {
          labels: last14.map(d => d.date),
          datasets: [{
            label: 'Hours',
            data: last14.map(d => d.hours),
            backgroundColor: last14.map(d => d.hours >= 8 ? 'rgba(52,211,153,0.8)' : d.hours >= 4 ? 'rgba(59,130,246,0.7)' : 'rgba(255,255,255,0.12)'),
            borderRadius: 5,
            borderSkipped: false
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: ctx => ` ${ctx.raw}h studied` } }
          },
          scales: {
            x: { ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 10 } }, grid: { display: false } },
            y: { min: 0, ticks: { color: 'rgba(255,255,255,0.4)', callback: v => v+'h' }, grid: { color: 'rgba(255,255,255,0.05)' } }
          }
        }
      });
    }

    // Temporary debug logs for audit
    const normalizedTests = allTests.map(normalizeTest);
    const recentPerformanceData = completedTests.slice(-5).reverse();
    const testTrendData = completedTests.slice(-10);
    const gapAnalysisData = {};
    ['Physics','Chemistry','Mathematics','PCM Combined','Full Mock'].forEach(sub => {
      const subTests = completedTests.filter(t => t.subject === sub);
      if (subTests.length > 0) {
        gapAnalysisData[sub] = Math.round(subTests.reduce((s,t) => s + t.pct, 0) / subTests.length);
      }
    });
    const subjectBalanceData = subAvgPerf;

    console.log("allTests", allTests);
    console.log("completedTests", completedTests);
    console.log("normalizedTests", normalizedTests);
    console.log("Recent Performance Data", recentPerformanceData);
    console.log("Subject Balance Data", subjectBalanceData);
    console.log("Test Trend Data", testTrendData);
    console.log("Gap Analysis Data", gapAnalysisData);

  } catch (e) {
    console.error('âŒ Error in renderAnalytics:', e);
  }
}

// ================================================================
//  HEATMAP
// ================================================================
function renderHeatmap() {
  try {
    const grid = document.getElementById('heatmapGrid');
    const monthLabelsEl = document.getElementById('heatmapMonthLabels');
    if (!grid || !monthLabelsEl) return;

    const today = new Date();
    today.setHours(0,0,0,0);
    // Build 13 weeks (91 days) displayed as columns of 7.
    // To ensure the current week (including today) is always fully visible as the rightmost column,
    // we align the end date to the Sunday of the current week, then go back 90 days to find the Monday start date.
    const WEEKS = 13;
    const DAYS = WEEKS * 7;
    const todayDow = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const daysToSunday = todayDow === 0 ? 0 : 7 - todayDow;
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + daysToSunday);
    endDate.setHours(0,0,0,0);

    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - (DAYS - 1));
    startDate.setHours(0,0,0,0);

    // Study log lookup
    const studyByDate = {};
    studyLogs.forEach(l => { studyByDate[l.date] = (studyByDate[l.date]||0) + (l.hours||0); });

    // Render day labels column and grid
    const dayLabels = ['Mon','','Wed','','Fri','','Sun'];
    let gridHtml = '<div class="heatmap-day-labels">';
    dayLabels.forEach(d => { gridHtml += `<div class="heatmap-day-label">${d}</div>`; });
    gridHtml += '</div>';

    const weekCols = [];
    for (let w = 0; w < WEEKS; w++) {
      const colCells = [];
      let monthLabel = '';
      for (let d = 0; d < 7; d++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + w * 7 + d);
        date.setHours(0,0,0,0);
        if (date > today) { colCells.push('<div class="heatmap-cell" style="opacity:0;pointer-events:none"></div>'); continue; }
        const key = dayKey(date);
        const hist = dailyHistory[key] || {};
        const taskCount = Object.values(hist).filter(v => v).length;
        const hrs = studyByDate[key] || 0;
        const activity = taskCount + (hrs > 0 ? 1 : 0);
        const lvl = activity === 0 ? '' : activity < 3 ? 'lvl1' : activity < 6 ? 'lvl2' : activity < 9 ? 'lvl3' : 'lvl4';
        const tip = `${key}: ${taskCount} task(s)${hrs > 0 ? ', '+hrs.toFixed(1)+'h study' : ''}`;
        colCells.push(`<div class="heatmap-cell ${lvl}" data-tip="${tip}"></div>`);
        // Month label on first day of month
        if (date.getDate() === 1 || (w === 0 && d === 0)) {
          monthLabel = date.toLocaleDateString('en-IN', {month:'short'});
        }
      }
      weekCols.push({ cells: colCells, month: monthLabel });
    }

    // Render month labels aligned with grid columns
    let monthsHtml = '';
    let lastMonth = '';
    weekCols.forEach((col, i) => {
      if (col.month && col.month !== lastMonth) {
        monthsHtml += `<div class="heatmap-month-label" style="min-width:24px">${col.month}</div>`;
        lastMonth = col.month;
      } else {
        monthsHtml += `<div class="heatmap-month-label" style="min-width:24px"></div>`;
      }
    });
    monthLabelsEl.innerHTML = monthsHtml;

    // Render grid columns
    weekCols.forEach(col => {
      gridHtml += '<div class="heatmap-col">' + col.cells.join('') + '</div>';
    });
    grid.innerHTML = gridHtml;
  } catch (e) {
    console.error('âŒ Error in renderHeatmap:', e);
  }
}

// ================================================================
//  ACHIEVEMENTS
// ================================================================
function renderAchievements() {
  loadAchievements(() => {
    const grid = document.getElementById('achievementsGrid');
    if (!grid) return;
    grid.innerHTML = ACHIEVEMENTS_DEF.map(a => {
      const unlocked = achievements[a.id];
      const progress = getAchievementProgress(a);
      const pct = Math.min(100, Math.round(progress.current/a.target*100));
      return `<div class="achievement-card ${unlocked?'unlocked':''}">
        ${!unlocked ? '<span class="achievement-lock">ðŸ”’</span>' : ''}
        <span class="achievement-icon">${a.icon}</span>
        <div class="achievement-name">${a.name}</div>
        <div class="achievement-desc">${a.desc}</div>
        ${unlocked ? `<div class="achievement-date" style="color:var(--green-l)">âœ… Unlocked!</div>` :
          `<div class="achievement-progress-text">${progress.current} / ${a.target}</div>
           <div class="achievement-progress-bar"><div class="achievement-progress-fill" style="width:${pct}%"></div></div>`}
      </div>`;
    }).join('');
  });
}
let achievements = {};
function loadAchievements(cb) {
  uDoc('achievements').get().then(snap => {
    achievements = {};
    snap.docs.forEach(d => { achievements[d.id] = true; });
    if (cb) cb();
  }).catch(()=>{ if(cb) cb(); });
}
function getAchievementProgress(a) {
  if (a.type === 'streak') return {current: calcStreak()};
  if (a.type === 'pyq') return {current: Object.values(pyqData).reduce((s,d)=>s+(d.solved||0),0)};
  if (a.type === 'hours') return {current: Math.round(studyLogs.reduce((s,l)=>s+(l.hours||0),0))};
  if (a.type === 'tests') return {current: allTests.filter(t=>t.score!==undefined).length};
  return {current:0};
}
async function checkAchievements() {
  loadAchievements(() => {
    ACHIEVEMENTS_DEF.forEach(async a => {
      if (achievements[a.id]) return;
      const prog = getAchievementProgress(a);
      if (prog.current >= a.target) {
        try {
          await uDoc('achievements').doc(a.id).set({unlockedAt:firebase.firestore.FieldValue.serverTimestamp()});
          achievements[a.id] = true;
          toast(`ðŸ… Achievement Unlocked: ${a.name}!`,'success',5000);
          fireConfetti();
          if (sectionRendered.achievements) renderAchievements();
        } catch(e) {}
      }
    });
  });
}

// ================================================================
//  DASHBOARD UPDATE
// ================================================================
function updateDashboard() {
  try {
    const today = todayKey(), hist = dailyHistory[today] || {};
    const done = tasks.filter(t => hist[t.id]).length;
    const pending = tasks.length - done;
    document.getElementById('h-pending').textContent = pending;

    // Upcoming tests
    const upcoming = allTests.filter(t => !isCompleted(t) && t.date && new Date(t.date) >= new Date()).sort((a,b)=>(a.date || '').localeCompare(b.date || ''));
    document.getElementById('h-tests').textContent = upcoming.length;
    const upEl = document.getElementById('dashUpcomingTests');
    if (upEl) {
      if (upcoming.length) {
        upEl.innerHTML = upcoming.slice(0,3).map(t => {
          const days = Math.ceil((new Date(t.date || new Date())-new Date())/(1000*60*60*24));
          return `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.04)">
            <div><div style="font-size:12px;font-weight:700">${t.subject} â€” ${t.type}</div><div style="font-size:10px;color:var(--txt-3)">${t.date || 'â€”'}</div></div>
            <span class="badge ${days<=2?'badge-red':days<=7?'badge-yellow':'badge-blue'}">${days===0?'Today':days===1?'Tomorrow':isNaN(days)?'â€”':days+' days'}</span>
          </div>`;
        }).join('');
      } else {
        upEl.innerHTML = '<div class="empty-state"><span class="empty-state-icon">ðŸ§ª</span><div class="empty-state-text">No tests scheduled</div></div>';
      }
    }

    // Streak
    const streak = calcStreak();
    document.getElementById('h-streak').textContent = streak;
    document.getElementById('topbarStreakVal').textContent = streak;

    // Recent performance
    updateRecentPerformance();
    generateMentorInsights();
    updateJourneyStatus();
  } catch (e) {
    console.error('âŒ Error in updateDashboard:', e);
  }
}
function calcStreak() {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today); d.setDate(d.getDate()-i);
    const k = d.toISOString().slice(0,10);
    const hist = dailyHistory[k] || {};
    const done = Object.values(hist).filter(v=>v).length;
    if (done > 0) streak++;
    else if (i > 0) break;
  }
  return streak;
}
function updateRecentPerformance() {
  try {
    // Use normalizeTest so all data structures work (score/marks/percentage)
    const all = getCompletedNormalized();
    console.log('ðŸ“Š [DEBUG] updateRecentPerformance | completedTests:', all.length);
    const completed = all.slice(-5).reverse(); // last 5, newest first
    const listEl = document.getElementById('recentPerfList');
    if (!listEl) return;

    if (!completed.length) {
      listEl.innerHTML = '<div class="empty-state"><span class="empty-state-icon">ðŸ§ª</span><div class="empty-state-text">No test results yet.<br>Add your first test to see performance.</div></div>';
      return;
    }

    const avgPct = Math.round(completed.reduce((s,t) => s + t.pct, 0) / completed.length);

    // Subject color palette
    const subColors = {
      'Physics':     'var(--blue-l)',
      'Chemistry':   'var(--green-l)',
      'Mathematics': 'var(--yellow-l)',
      'PCM Combined':'var(--purple-l)',
      'Full Mock':   'var(--cyan)'
    };

    listEl.innerHTML = completed.map(t => {
      const pct   = t.pct;
      const color = pct >= 70 ? 'var(--green-l)' : pct >= 50 ? 'var(--yellow-l)' : 'var(--red-l)';
      const subColor = subColors[t.subject] || 'var(--txt-3)';
      const label = t.name || t.subject || 'Test';
      const shortLabel = label.length > 14 ? label.slice(0,13)+'â€¦' : label;
      const dateStr = t.date ? t.date.slice(5).replace('-','/') : '';
      return `<div class="perf-row">
        <div style="min-width:0;flex:1">
          <div style="font-size:12px;font-weight:700;color:var(--txt-1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${shortLabel}</div>
          <div style="font-size:10px;color:${subColor};margin-top:1px">${t.subject || 'General'}${dateStr ? ' Â· '+dateStr : ''}</div>
        </div>
        <div class="perf-score-bar"><div class="perf-score-fill" style="width:${pct}%;background:${color}"></div></div>
        <div style="font-size:13px;font-weight:900;font-family:'JetBrains Mono',monospace;color:${color};min-width:40px;text-align:right">${pct}%</div>
      </div>`;
    }).join('');

    // Summary badges
    const el1 = document.getElementById('perfAvgScore');
    const el2 = document.getElementById('perfAccuracy');
    const el3 = document.getElementById('perfTrend');
    const el4 = document.getElementById('perfAvgBadge');
    if (el1) el1.textContent = avgPct + '%';
    if (el2) el2.textContent = avgPct + '%';
    if (el4) el4.textContent = 'Avg: ' + avgPct + '%';

    if (el3 && completed.length >= 2) {
      // completed[0] = newest, completed[1] = second newest
      const newest = completed[0].pct, prev = completed[1].pct;
      el3.textContent  = newest > prev ? 'â†‘' : newest < prev ? 'â†“' : 'â†’';
      el3.style.color  = newest > prev ? 'var(--green-l)' : newest < prev ? 'var(--red-l)' : 'var(--txt-2)';
    }
  } catch (e) {
    console.error('âŒ Error in updateRecentPerformance:', e);
  }
}

function updateJourneyStatus() {
  const el = document.getElementById('journeyStatus');
  if (!el) return;
  const completedTests = getCompletedNormalized();
  const avgPct = completedTests.length ? Math.round(completedTests.reduce((s,t)=>s+t.pct,0)/completedTests.length) : 0;
  const today = todayKey(), hist = dailyHistory[today]||{};
  const tasksDone = tasks.filter(t=>hist[t.id]).length;
  const taskCompletion = tasks.length ? Math.round(tasksDone/tasks.length*100) : 0;
  if (!mission.dreamCollege && !mission.targetRank) { el.className = 'badge badge-blue'; el.style.width='100%';el.style.justifyContent='center';el.style.padding='8px';el.style.fontSize='12px'; el.textContent = 'ðŸŽ¯ Set your mission in Settings'; return; }
  if (avgPct >= 75 && taskCompletion >= 70) { el.className = 'badge badge-green'; el.style.cssText='width:100%;justify-content:center;padding:8px;font-size:12px'; el.textContent = 'âœ… On Track â€” Great Performance!'; }
  else if (avgPct >= 55 || taskCompletion >= 50) { el.className = 'badge badge-yellow'; el.style.cssText='width:100%;justify-content:center;padding:8px;font-size:12px'; el.textContent = 'âš¡ Needs Improvement'; }
  else { el.className = 'badge badge-red'; el.style.cssText='width:100%;justify-content:center;padding:8px;font-size:12px'; el.textContent = 'âš ï¸ Falling Behind â€” Push harder!'; }
}

// ================================================================
//  AACHARYA AI MENTOR â€” Gemini-Powered
// ================================================================
async function generateMentorInsights(forceRefresh = false) {
  const completedTests = getCompletedNormalized();
  const avgPct = completedTests.length ? Math.round(completedTests.reduce((s,t)=>s+t.pct,0)/completedTests.length) : 0;
  const today = todayKey(), hist = dailyHistory[today]||{};
  const tasksDone = tasks.filter(t=>hist[t.id]).length;
  const streak = calcStreak();
  const revPending = revisions.filter(r=>!r.done&&r.date<=today).length;
  const chapAll = Object.values(chapters);
  const chapDone = chapAll.filter(c=>c.status==='done').length;
  const totalHours = studyLogs.reduce((s,l)=>s+(l.hours||0),0);
  const pyqSolved = Object.values(pyqData).reduce((s,d)=>s+(d.solved||0),0);

  // Per-subject averages
  const subjectAvgs = {};
  ['Physics','Chemistry','Mathematics'].forEach(sub => {
    const s = completedTests.filter(t=>t.subject===sub);
    if (s.length) subjectAvgs[sub] = Math.round(s.reduce((a,t)=>a+t.pct,0)/s.length);
  });

  const apiKey = localStorage.getItem('mj_gemini_key') || '';
  if (!apiKey) { renderRuleMentorInsights(avgPct, tasksDone, streak, revPending); return; }

  const mentorStatusEl = document.getElementById('mentorStatus');
  const thinkingEl = document.getElementById('mentorThinking');
  const insightsEl = document.getElementById('mentorInsights');
  if (thinkingEl) thinkingEl.style.display = 'flex';
  if (insightsEl) insightsEl.innerHTML = '';
  if (mentorStatusEl) mentorStatusEl.textContent = 'Aacharya is thinking...';

  const subStr = Object.entries(subjectAvgs).map(([k,v])=>`${k}: ${v}%`).join(', ') || 'No test data yet';

  const prompt = `You are Aacharya, an elite IIT JEE mentor â€” brutally honest, data-driven, caring. Analyze this student's EXACT data and give exactly 3 ultra-specific, actionable insights. Never be generic.

STUDENT DATA:
- Overall mock average: ${avgPct}% across ${completedTests.length} test(s)
- Subject-wise: ${subStr}
- Chapters completed: ${chapDone}/89 total JEE chapters
- PYQs solved: ${pyqSolved}
- Today's tasks: ${tasksDone}/${tasks.length} done
- Study streak: ${streak} consecutive days
- Revisions overdue: ${revPending}
- Total study hours logged: ${Math.round(totalHours)}h
- Target: ${mission.dreamCollege||'Not set'} | Rank: ${mission.targetRank||'Not set'}

FORMAT â€” strictly 3 insights:
[EMOJI] **Label**: One sharp sentence referencing specific numbers above + one concrete next action.

Rules:
- Reference actual student numbers (e.g. "Your Physics at 45% needs...")
- Concrete actions with specific numbers ("solve 20 problems", "revise 3 chapters")
- Brutal honesty + motivation
- Max 150 words total`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({contents:[{parts:[{text:prompt}]}], generationConfig:{temperature:0.75,maxOutputTokens:350}})
    });
    const data = await res.json();
    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      const text = data.candidates[0].content.parts[0].text;
      const lines = text.split('\n').filter(l=>l.trim().length > 10).slice(0,3);
      if (thinkingEl) thinkingEl.style.display = 'none';
      if (mentorStatusEl) mentorStatusEl.textContent = 'âœ¨ Gemini AI â€¢ Live analysis';
      if (insightsEl) {
        insightsEl.innerHTML = '';
        lines.forEach((line, idx) => {
          const el = document.createElement('div');
          el.className = 'mentor-insight';
          el.style.cssText = 'opacity:0;transform:translateY(10px)';
          // Parse **Bold** labels
          const boldMatch = line.match(/\*\*(.*?)\*\*:?\s*(.*)/);
          const emojiMatch = line.match(/^([^\w\s*]+)\s*/);
          const emoji = emojiMatch ? emojiMatch[1] : 'ðŸ’¡';
          let label = '', body = line.replace(/^[^\w\s*]+\s*/,'');
          if (boldMatch) { label = boldMatch[1]; body = boldMatch[2]; }
          el.innerHTML = `<span style="font-size:17px;flex-shrink:0">${emoji}</span><span><strong>${label}${label?':':''}</strong> ${body}</span>`;
          insightsEl.appendChild(el);
          setTimeout(() => {
            el.style.transition = 'all 0.45s cubic-bezier(.34,1.56,.64,1)';
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
          }, idx * 220 + 100);
        });
      }
      // Quick dashboard tip
      const quickText = lines[0] ? lines[0].replace(/\*\*(.*?)\*\*/g,'$1').replace(/^[^\w\s]+\s*/,'').trim().slice(0,130) : 'Stay focused on your daily tasks.';
      const dashMentorEl = document.getElementById('dashMentorText');
      if (dashMentorEl) dashMentorEl.textContent = quickText;
    } else { throw new Error('Invalid response'); }
  } catch(e) {
    if (thinkingEl) thinkingEl.style.display = 'none';
    renderRuleMentorInsights(avgPct, tasksDone, streak, revPending);
  }
}

function renderRuleMentorInsights(avgPct, tasksDone, streak, revPending) {
  const thinkingEl = document.getElementById('mentorThinking');
  const insightsEl = document.getElementById('mentorInsights');
  const mentorStatusEl = document.getElementById('mentorStatus');
  const dashMentorEl = document.getElementById('dashMentorText');
  if (thinkingEl) thinkingEl.style.display = 'none';
  if (mentorStatusEl) mentorStatusEl.textContent = 'Smart rule-based insights';

  const insights = [];
  if (avgPct < 50) insights.push({icon:'âš ï¸', label:'Test Performance', text:`Your average is ${avgPct}% â€” below the IIT cutoff zone. Focus on NCERT fundamentals and solve 15 problems per chapter before any mock tests.`});
  else if (avgPct < 70) insights.push({icon:'ðŸ“Š', label:'Performance', text:`${avgPct}% average â€” improving! Target 75%+ in next 3 tests by focusing on your weakest subject each morning.`});
  else insights.push({icon:'ðŸ”¥', label:'Excellent', text:`${avgPct}% average is IIT-level! Maintain it with harder problem sets and maintain your revision schedule strictly.`});

  if (streak >= 7) insights.push({icon:'ðŸ’ª', label:'Streak', text:`${streak}-day streak is elite discipline! IIT toppers study 7 days a week â€” you're already building that habit.`});
  else if (streak >= 3) insights.push({icon:'ðŸŽ¯', label:'Momentum', text:`${streak}-day streak started. Hit 7 days to build true momentum â€” complete just 3 tasks today to keep it alive.`});
  else insights.push({icon:'âš¡', label:'Start Now', text:`Start your streak today â€” even completing 2-3 small tasks creates the daily habit that separates rankers from dreamers.`});

  if (revPending > 0) insights.push({icon:'ðŸ“…', label:'Revisions Overdue', text:`${revPending} revision(s) overdue â€” do them before any new study today. Spaced repetition is 3x more effective than re-reading.`});
  else insights.push({icon:'âœ…', label:'Revision Clear', text:`Revisions all clear â€” great! Mark more chapters complete to keep building your spaced revision pipeline.`});

  if (insightsEl) {
    insightsEl.innerHTML = '';
    insights.forEach((ins, idx) => {
      const el = document.createElement('div');
      el.className = 'mentor-insight';
      el.style.cssText = 'opacity:0;transform:translateY(8px)';
      el.innerHTML = `<span style="font-size:17px;flex-shrink:0">${ins.icon}</span><span><strong>${ins.label}:</strong> ${ins.text}</span>`;
      insightsEl.appendChild(el);
      setTimeout(() => {
        el.style.transition = 'all 0.4s ease';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, idx * 200);
    });
  }
  if (dashMentorEl) dashMentorEl.textContent = insights[0] ? insights[0].text.slice(0,130) : 'Complete your tasks consistently every day.';
}

// ================================================================
//  AI â€” TEST RESULT ANALYZER
// ================================================================
async function aiAnalyzeTestResult(physScore,physMax,chemScore,chemMax,mathScore,mathMax,totalPct) {
  const apiKey=localStorage.getItem('mj_gemini_key')||'';
  if (!apiKey) return;
  const pp=physMax>0?Math.round(physScore/physMax*100):0;
  const cp=chemMax>0?Math.round(chemScore/chemMax*100):0;
  const mp=mathMax>0?Math.round(mathScore/mathMax*100):0;
  const prompt=`JEE test result: Physics ${pp}% (${physScore}/${physMax}), Chemistry ${cp}% (${chemScore}/${chemMax}), Mathematics ${mp}% (${mathScore}/${mathMax}). Total: ${totalPct}%.

Give ONE sharp 2-sentence insight: identify the weakest subject's specific gap and give ONE concrete action before the next test. Reference exact percentages. Max 40 words.`;
  try {
    const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.65,maxOutputTokens:80}})});
    const d=await res.json();
    const text=d.candidates?.[0]?.content?.parts?.[0]?.text||'';
    if (text) {
      const box=document.getElementById('marksAiBox');
      if (box) { box.style.display='block'; box.innerHTML=`<div class="ai-panel-title">âœ¨ Aacharya's Analysis</div>${text.trim()}`; }
      toast(`ðŸ¤– ${text.trim().slice(0,100)}`,'info',9000);
    }
  } catch(e){}
}

// ================================================================
//  AI â€” REVISION SCHEDULER OPTIMIZER
// ================================================================
async function aiOptimizeAllRevisions() {
  const tip = document.getElementById('revisionAiTip');
  if (tip) {
    tip.style.display = 'block';
    tip.innerHTML = `<div class="ai-loading"><span class="thinking-dots"><span>â—</span><span>â—</span><span>â—</span></span>&nbsp; AI calculating optimal schedule and load balancing...</div>`;
  }
  
  // Calculate subject performances
  const perf = getSubjectPerformance();
  
  // Find all completed chapters
  const completedList = [];
  for (const key in chapters) {
    if (chapters[key] && chapters[key].status === 'done') {
      const [subject, indexStr] = key.split('_');
      const index = parseInt(indexStr);
      const chapterName = JEE_CHAPTERS[subject]?.[index];
      if (chapterName) {
        completedList.push({
          key,
          subject,
          chapterName,
          completedAt: chapters[key].completedAt || new Date().toISOString().slice(0,10)
        });
      }
    }
  }
  
  if (completedList.length === 0) {
    if (tip) tip.style.display = 'none';
    toast('âš ï¸ No completed chapters to optimize!', 'warning');
    return;
  }
  
  try {
    // 1. Delete all current undone revisions for these chapters
    const pendingRevs = revisions.filter(r => !r.done);
    const deletePromises = pendingRevs.map(r => uDoc('revisions').doc(r.id).delete());
    await Promise.all(deletePromises);
    
    // We also temporarily clear local revisions that were not done
    revisions = revisions.filter(r => r.done);
    
    let scheduledCount = 0;
    const intervalSummary = [];
    
    // 2. Reschedule each completed chapter's revisions using dynamic intervals and load balancing
    for (const ch of completedList) {
      const subjectCap = ch.subject.charAt(0).toUpperCase() + ch.subject.slice(1);
      const subPerf = perf[subjectCap] || 70;
      
      const pyq = pyqData[ch.key] || {};
      const pyqAcc = pyq.accuracy !== undefined ? pyq.accuracy : 60;
      const pyqSolved = pyq.solved || 0;
      const pyqTotal = pyq.total || 50;
      
      const spf = subPerf / 100;
      const spf_mod = (spf - 0.6) * 0.5;
      const qaf = pyqAcc / 100;
      const qaf_mod = (qaf - 0.6) * 0.5;
      const qcf = pyqTotal > 0 ? (pyqSolved / pyqTotal) : 0.5;
      const qcf_mod = (qcf - 0.5) * 0.3;
      
      let speedFactor = 1.0 + spf_mod + qaf_mod + qcf_mod;
      speedFactor = Math.max(0.5, Math.min(1.8, speedFactor));
      
      const i1 = Math.max(1, Math.round(1 * speedFactor));
      const i2 = Math.max(i1 + 1, Math.round(7 * speedFactor));
      const i3 = Math.max(i2 + 5, Math.round(30 * speedFactor));
      
      const d1Str = addDays(ch.completedAt, i1);
      const d2Str = addDays(ch.completedAt, i2);
      const d3Str = addDays(ch.completedAt, i3);
      
      const date1 = getOptimalDate(d1Str, 3);
      const date2 = getOptimalDate(d2Str, 3);
      const date3 = getOptimalDate(d3Str, 3);
      
      await scheduleRevision(ch.chapterName, ch.subject, date1, i1);
      await scheduleRevision(ch.chapterName, ch.subject, date2, i2);
      await scheduleRevision(ch.chapterName, ch.subject, date3, i3);
      
      scheduledCount += 3;
      intervalSummary.push(`<strong>${ch.chapterName}</strong> (${subjectCap}): Days ${i1}, ${i2}, ${i3}`);
    }
    
    if (tip) {
      tip.innerHTML = `
        <div class="ai-panel-title">ðŸ¤– AI Spaced Repetition Optimizer</div>
        <p style="margin: 4px 0 8px; font-size: 12px; color: var(--txt-2)">
          Re-scheduled <strong>${scheduledCount}</strong> revisions across <strong>${completedList.length}</strong> completed chapters.
        </p>
        <div style="font-size: 11px; color: var(--txt-3); max-height: 120px; overflow-y: auto; padding-right: 4px">
          <strong>Subject performance context:</strong> Physics ${perf.Physics}%, Chemistry ${perf.Chemistry}%, Math ${perf.Mathematics}%<br>
          <strong style="display:block;margin-top:6px">Optimized intervals:</strong>
          ${intervalSummary.map(s => `â€¢ ${s}`).join('<br>')}
        </div>
      `;
    }
    
    toast('ðŸŽ‰ AI Auto-Scheduler successfully balanced all revisions!', 'success');
    fireConfetti();
  } catch(e) {
    if (tip) tip.style.display = 'none';
    toast('âŒ Error: ' + e.message, 'error');
  }
}


// ================================================================
//  SIDEBAR PROGRESS
// ================================================================
function updateSidebarProgress() {
  const today = todayKey(), hist = dailyHistory[today]||{};
  const done = tasks.filter(t=>hist[t.id]).length;
  const pct = tasks.length > 0 ? Math.round(done/tasks.length*100) : 0;
  const fillEl = document.getElementById('sbProgressFill');
  const pctEl = document.getElementById('sbProgressPct');
  if (fillEl) fillEl.style.width = pct + '%';
  if (pctEl) pctEl.textContent = pct + '%';
}
function updateBadges() {
  const today = todayKey(), hist = dailyHistory[today]||{};
  const pending = tasks.filter(t=>!hist[t.id]).length;
  const tb = document.getElementById('taskBadge');
  if (tb) { tb.textContent = pending; tb.style.display = pending > 0 ? 'inline' : 'none'; }
  const blPending = backlogs.filter(b=>!b.done).length;
  const bb = document.getElementById('backlogBadge');
  if (bb) { bb.textContent = blPending; bb.style.display = blPending > 0 ? 'inline' : 'none'; }
}

// ================================================================
//  FOCUS TIMER
// ================================================================
function setTimerMode(minutes, btn) {
  document.querySelectorAll('.timer-mode-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  timerMode = minutes;
  if (minutes === 0) {
    const m = parseInt(prompt('Custom duration (minutes):', '45')||'45');
    timerSeconds = m * 60;
  } else {
    timerSeconds = minutes * 60;
  }
  timerRunning = false;
  clearInterval(timerInterval);
  updateTimerDisplay();
  document.getElementById('timerStartBtn').textContent = 'â–¶ Start';
  document.getElementById('timerLabel').textContent = minutes === 25 ? 'POMODORO' : minutes === 50 ? 'DEEP WORK' : 'CUSTOM';
}
function toggleTimer() {
  if (timerRunning) {
    clearInterval(timerInterval);
    timerRunning = false;
    document.getElementById('timerStartBtn').textContent = 'â–¶ Resume';
  } else {
    timerRunning = true;
    document.getElementById('timerStartBtn').textContent = 'â¸ Pause';
    timerInterval = setInterval(() => {
      timerSeconds--;
      updateTimerDisplay();
      if (timerSeconds <= 0) {
        clearInterval(timerInterval);
        timerRunning = false;
        document.getElementById('timerStartBtn').textContent = 'â–¶ Start';
        toast('â±ï¸ Session complete! Take a break.','success',5000);
        const hrs = timerMode > 0 ? timerMode/60 : 0.75;
        uDoc('studyLogs').add({date:todayKey(), hours:hrs, ts:firebase.firestore.FieldValue.serverTimestamp()}).catch(()=>{});
        setTimerMode(timerMode, null);
      }
    }, 1000);
  }
}
function resetTimer() {
  clearInterval(timerInterval);
  timerRunning = false;
  timerSeconds = timerMode > 0 ? timerMode * 60 : 45 * 60;
  updateTimerDisplay();
  document.getElementById('timerStartBtn').textContent = 'â–¶ Start';
}
function updateTimerDisplay() {
  const m = Math.floor(timerSeconds/60).toString().padStart(2,'0');
  const s = (timerSeconds%60).toString().padStart(2,'0');
  const el = document.getElementById('timerDisplay');
  if (el) el.textContent = `${m}:${s}`;
}

// ================================================================
//  MISCELLANEOUS
// ================================================================
initParticles();

// Auto-generate test modal date to today
document.addEventListener('DOMContentLoaded', () => {
  const dateEl = document.getElementById('ts-date');
  if (dateEl) dateEl.value = new Date().toISOString().slice(0,10);
});
document.getElementById('ts-date').value = new Date().toISOString().slice(0,10);

// ================================================================
//  STORED DATA HISTORY (ANALYTICS UTILITY)
// ================================================================
let activeHistoryTab = 'tests';

function openHistoryModal(tab = 'tests') {
  activeHistoryTab = tab;
  setHistoryTab(tab);
  openModal('historyModal');
}

function setHistoryTab(tab) {
  activeHistoryTab = tab;
  const tabTests = document.getElementById('tab-hist-tests');
  const tabStudy = document.getElementById('tab-hist-study');
  if (tabTests) tabTests.classList.toggle('active', tab === 'tests');
  if (tabStudy) tabStudy.classList.toggle('active', tab === 'study');
  renderHistoryTable();
}

function renderHistoryTable() {
  const container = document.getElementById('historyContent');
  if (!container) return;
  
  if (activeHistoryTab === 'tests') {
    const completed = allTests.filter(t => isCompleted(t));
    if (!completed.length) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-text">No test records stored.</div></div>';
      return;
    }
    const rows = completed.map(t => {
      const norm = normalizeTest(t);
      const physPct = (t.physicsScore!==undefined&&(t.physicsTotal||0)>0) ? Math.round(t.physicsScore/t.physicsTotal*100) : 0;
      const chemPct = (t.chemScore!==undefined&&(t.chemTotal||0)>0) ? Math.round(t.chemScore/t.chemTotal*100) : 0;
      const mathPct = (t.mathScore!==undefined&&(t.mathTotal||0)>0) ? Math.round(t.mathScore/t.mathTotal*100) : 0;
      return `<tr>
        <td style="font-weight:700">${t.testNumber||'Test'}</td>
        <td style="font-size:11px;font-family:'JetBrains Mono',monospace">${t.date||'—'}</td>
        <td><span class="badge badge-blue" style="font-size:9px">${t.type||'—'}</span></td>
        <td style="text-align:center">${physPct}%</td>
        <td style="text-align:center">${chemPct}%</td>
        <td style="text-align:center">${mathPct}%</td>
        <td style="text-align:center;font-weight:800;color:var(--neon)">${norm.pct}%</td>
        <td>
          <button class="btn btn-danger btn-sm" onclick="deleteHistoryTest('${t.id}')" style="padding:4px 8px;font-size:11px">🗑️</button>
        </td>
      </tr>`;
    }).join('');
    
    container.innerHTML = `
      <table class="tbl" style="width:100%;font-size:12px">
        <thead>
          <tr>
            <th>Test Name</th>
            <th>Date</th>
            <th>Type</th>
            <th style="text-align:center">P%</th>
            <th style="text-align:center">C%</th>
            <th style="text-align:center">M%</th>
            <th style="text-align:center">Overall</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  } else {
    if (!studyLogs.length) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-text">No study sessions logged.</div></div>';
      return;
    }
    const rows = studyLogs.map(l => {
      return `<tr>
        <td style="font-family:'JetBrains Mono',monospace">${l.date}</td>
        <td style="font-weight:700;text-align:center;color:var(--green-l)">${l.hours} hrs</td>
        <td>
          <button class="btn btn-danger btn-sm" onclick="deleteStudyLog('${l.id}')" style="padding:4px 8px;font-size:11px">🗑️</button>
        </td>
      </tr>`;
    }).join('');
    
    container.innerHTML = `
      <table class="tbl" style="width:100%;font-size:12px">
        <thead>
          <tr>
            <th>Date</th>
            <th style="text-align:center">Duration</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }
}

async function deleteHistoryTest(id) {
  if (!confirm('Delete this test record permanently?')) return;
  try {
    await uDoc('tests').doc(id).delete();
    toast('🗑️ Test record deleted', 'info');
    renderHistoryTable();
  } catch(e) {
    toast('❌ Error: ' + e.message, 'error');
  }
}

async function deleteStudyLog(id) {
  if (!confirm('Delete this study session log permanently?')) return;
  try {
    await uDoc('studyLogs').doc(id).delete();
    toast('🗑️ Study session log deleted', 'info');
    renderHistoryTable();
  } catch(e) {
    toast('❌ Error: ' + e.message, 'error');
  }
}

