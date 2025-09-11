import React, { useState, useEffect, useMemo, useRef, forwardRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp, onSnapshot, query } from 'firebase/firestore';
import { 
    getAuth, 
    onAuthStateChanged, 
    GoogleAuthProvider, 
    signInWithPopup,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    RecaptchaVerifier,
    signInWithPhoneNumber
} from 'firebase/auth';
// --- LIBRERÍAS PROFESIONALES (CARGADAS DESDE CDN PARA COMPATIBILIDAD) ---
import { motion, AnimatePresence } from 'https://cdn.skypack.dev/framer-motion';
import { create } from 'https://cdn.skypack.dev/zustand';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'https://cdn.skypack.dev/recharts';


// --- CLAVES Y CONFIGURACIÓN (SIN CAMBIOS) ---
const EXERCISE_DB_API_KEY = '99af603688msh3ee0c9da98116e9p174272jsn3773c31651ff';
const EDAMAM_APP_ID = '3909f263';
const EDAMAM_APP_KEY = 'f4a2577d1045eaae9be42322e59e2d7d';
const GOOGLE_FIT_CLIENT_ID = '99146745221-fgs0u4jhq62io786633bta1gln3kjdkj.apps.googleusercontent.com';
const firebaseConfig = {
  apiKey: "AIzaSyAppsBCeiDUnVqqENzIYU1Te9jO49WsMeY",
  authDomain: "zenith-45e0b.firebaseapp.com",
  projectId: "zenith-45e0b",
  storageBucket: "zenith-45e0b.firebasestorage.app",
  messagingSenderId: "99146745221",
  appId: "1:99146745221:web:e1ad61c561916a0fa970ec",
  measurementId: "G-SKG75K2RD1"
};

// --- ICONOS (TUS IMÁGENES DEFINITIVAS) ---
const ICONS = {
    KETTLEBELL: 'https://i.ibb.co/f2SpwD4/zenit-kettlebell-final.png',
    LEAF: 'https://i.ibb.co/z5pQ4g7/zenit-leaf-final.png',
    WAVES: 'https://i.ibb.co/JqDBK3s/zenit-waves-final.png'
};

// --- GESTIÓN DE ESTADO PROFESIONAL CON ZUSTAND ---
// Se crea un "store" central para manejar el estado global de la app
const useAppStore = create((set) => ({
    activeView: 'inicio',
    modal: { type: null, isOpen: false },
    setActiveView: (view) => set({ activeView: view }),
    openModal: (type) => set({ modal: { type, isOpen: true } }),
    closeModal: () => set({ modal: { type: null, isOpen: false } }),
}));


// --- SISTEMA DE COMPONENTES DE UI PROFESIONAL (INSPIRADO EN SHADCN/UI) ---
const cn = (...classes) => classes.filter(Boolean).join(' ');

const Card = forwardRef(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("rounded-xl border border-slate-800 bg-slate-800/50 text-slate-200 shadow-lg backdrop-blur-sm", className)}
        {...props}
    />
));

const CardHeader = forwardRef(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
));

const CardTitle = forwardRef(({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("font-semibold leading-none tracking-tight", className)} {...props} />
));

const CardDescription = forwardRef(({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-slate-400", className)} {...props} />
));

const CardContent = forwardRef(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));

const Button = forwardRef(({ className, variant, ...props }, ref) => {
    const variants = {
        default: "bg-slate-200 text-slate-900 hover:bg-slate-200/90",
        primary: "bg-blue-600 text-white hover:bg-blue-600/90",
        ghost: "hover:bg-slate-700 hover:text-slate-200",
    };
    return <button className={cn("inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none px-4 py-2", variants[variant] || variants.default, className)} ref={ref} {...props} />;
});


// --- PANTALLA DE BIENVENIDA CON ANIMACIONES FLUIDAS (FRAMER MOTION) ---
const ZenItSplashScreen = () => (
    <motion.div 
        className="fixed inset-0 bg-slate-900 flex flex-col justify-center items-center z-50"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ delay: 3, duration: 0.5 }}
    >
        <motion.div 
            className="flex items-baseline text-7xl font-bold text-slate-200"
            initial="hidden"
            animate="visible"
            variants={{
                visible: { transition: { staggerChildren: 0.2 } }
            }}
        >
            <motion.span variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>Z</motion.span>
            <motion.span variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="font-light">en</motion.span>
            <motion.span variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>I</motion.span>
            <motion.span variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="font-light">t</motion.span>
        </motion.div>
        <motion.div 
            className="flex justify-center gap-10 mt-8"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1, duration: 0.5 }}
        >
            <img src={ICONS.KETTLEBELL} alt="Deporte" className="pillar-icon" />
            <img src={ICONS.LEAF} alt="Nutrición" className="pillar-icon" />
            <img src={ICONS.WAVES} alt="Mindfulness" className="pillar-icon" />
        </motion.div>
    </motion.div>
);


// --- COMPONENTE PRINCIPAL DE LA APP (REFORMADO) ---
export default function App() {
    const [showSplash, setShowSplash] = useState(true);
    const [user, setUser] = useState(null);
    const [authReady, setAuthReady] = useState(false);
    
    useEffect(() => {
        const timer = setTimeout(() => setShowSplash(false), 3500);
        const app = initializeApp(firebaseConfig);
        const authInstance = getAuth(app);
        
        const unsubscribe = onAuthStateChanged(authInstance, (firebaseUser) => {
            setUser(firebaseUser);
            setAuthReady(true);
        });

        return () => {
            clearTimeout(timer);
            unsubscribe();
        };
    }, []);

    if (showSplash) return <ZenItSplashScreen />;
    if (!authReady) return <div className="fixed inset-0 bg-slate-900 flex items-center justify-center"><p>Cargando...</p></div>;
    if (!user) return <LoginScreen />;

    return <AppShell />;
}

// --- CONTENEDOR PRINCIPAL DE LA APP (SHELL) ---
function AppShell() {
    const { activeView, modal, openModal, closeModal } = useAppStore();
    const [greeting, setGreeting] = useState('');

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Buenos días');
        else if (hour < 21) setGreeting('Buenas tardes');
        else setGreeting('Buenas noches');
    }, []);

    const screens = {
        inicio: <DashboardScreen greeting={greeting} />,
        planes: <PlanesScreen />,
        progreso: <ProgressScreen />,
        perfil: <ProfileScreen />,
    };

    return (
        <div className="max-w-md mx-auto h-screen flex flex-col bg-slate-900 text-slate-200 font-sans">
            <main className="flex-grow p-6 overflow-y-auto">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeView}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        {screens[activeView]}
                    </motion.div>
                </AnimatePresence>
            </main>
            <NavBar />
            
            {/* Sistema de modales centralizado */}
            {modal.isOpen && modal.type === 'add_choice' && <AddModal />}
        </div>
    );
}

// --- VISTAS PRINCIPALES (SEPARADAS EN COMPONENTES) ---

const DashboardScreen = ({ greeting }) => {
    // Aquí iría la lógica para obtener datos del usuario
    const userName = getAuth().currentUser?.displayName?.split(' ')[0] || 'Zen';
    
    return (
        <div>
            <h1 className="text-3xl font-bold text-white mb-1">{greeting}, {userName}!</h1>
            <p className="text-slate-400 mb-8">¿Listo para dar lo mejor de ti?</p>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><img src={ICONS.KETTLEBELL} className="h-5 w-5 pillar-icon"/>Actividad Hoy</CardTitle>
                        <CardDescription>Tu resumen de movimiento diario.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <p className="text-center text-slate-500 text-sm">Aún no hay datos de actividad.</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><img src={ICONS.LEAF} className="h-5 w-5 pillar-icon"/>Nutrición</CardTitle>
                        <CardDescription>Resumen de tu ingesta calórica.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <p className="text-center text-slate-500 text-sm">No has registrado comidas hoy.</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><img src={ICONS.WAVES} className="h-5 w-5 pillar-icon"/>Mindfulness</CardTitle>
                        <CardDescription>Tu momento de calma.</CardDescription>
                    </CardHeader>
                     <CardContent>
                       <p className="text-lg text-slate-300 italic">"La paz viene de dentro. No la busques fuera."</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

const PlanesScreen = () => (
    <div>
        <h1 className="text-3xl font-bold text-white mb-6">Mis Planes</h1>
        <Card><CardContent><p className="text-slate-400 text-center">Aquí aparecerán tus rutinas y planes de comidas.</p></CardContent></Card>
    </div>
);

const ProgressScreen = () => {
    // Datos de ejemplo para los gráficos
    const weightData = [
        { name: 'Jul', peso: 85 }, { name: 'Ago', peso: 83 }, { name: 'Sep', peso: 82 }
    ];
    const activityData = [
        { name: 'Lun', pasos: 4000 }, { name: 'Mar', pasos: 6000 }, { name: 'Mié', pasos: 5000 },
        { name: 'Jue', pasos: 8000 }, { name: 'Vie', pasos: 7500 }, { name: 'Sáb', pasos: 12000 },
    ];
    return (
        <div>
            <h1 className="text-3xl font-bold text-white mb-6">Tu Progreso</h1>
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Evolución del Peso</CardTitle>
                    <CardDescription>Últimos 3 meses</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={weightData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="name" stroke="#94a3b8" />
                            <YAxis stroke="#94a3b8" />
                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                            <Legend />
                            <Line type="monotone" dataKey="peso" stroke="#38bdf8" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
            <Card>
                 <CardHeader>
                    <CardTitle>Pasos de la Semana</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={activityData}>
                             <XAxis dataKey="name" stroke="#94a3b8" />
                             <YAxis stroke="#94a3b8" />
                             <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} cursor={{fill: '#334155'}}/>
                             <Bar dataKey="pasos" fill="#38bdf8" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
};

const ProfileScreen = () => {
    const auth = getAuth();
    return (
        <div>
            <h1 className="text-3xl font-bold text-white mb-6">Perfil</h1>
            <Card>
                <CardContent className="pt-6">
                    <div className="text-center">
                        <p className="font-semibold">{auth.currentUser?.displayName}</p>
                        <p className="text-sm text-slate-400">{auth.currentUser?.email}</p>
                        <Button variant="primary" className="mt-4" onClick={() => auth.signOut()}>Cerrar Sesión</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// --- COMPONENTES DE NAVEGACIÓN Y MODALES (REFORMADOS) ---

const NavBar = () => {
    const { activeView, setActiveView, openModal } = useAppStore();
    const navItems = [
        { id: 'inicio', label: 'Inicio', icon: <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/> },
        { id: 'planes', label: 'Planes', icon: <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/> },
        { id: 'progreso', label: 'Progreso', icon: <path d="M18 20V4"/><path d="M12 20V10"/><path d="M6 20V14"/> },
        { id: 'perfil', label: 'Perfil', icon: <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/> }
    ];
    return (
         <nav className="bg-slate-800/80 border-t border-slate-700 grid grid-cols-5 items-center sticky bottom-0 backdrop-blur-md">
            {navItems.slice(0, 2).map(item => <NavButton key={item.id} item={item} isActive={activeView === item.id} onClick={() => setActiveView(item.id)} />)}
            
            <button onClick={() => openModal('add_choice')} className="flex items-center justify-center">
                <motion.div whileTap={{ scale: 0.9 }} className="bg-blue-600 rounded-full h-16 w-16 flex items-center justify-center -mt-8 shadow-lg shadow-blue-500/50">
                    <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                </motion.div>
            </button>
            
            {navItems.slice(2, 4).map(item => <NavButton key={item.id} item={item} isActive={activeView === item.id} onClick={() => setActiveView(item.id)} />)}
        </nav>
    );
};

const NavButton = ({ item, isActive, onClick }) => (
    <button onClick={onClick} className={`flex flex-col items-center justify-center p-3 transition-colors ${isActive ? 'text-blue-500' : 'text-slate-400 hover:text-blue-500'}`}>
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">{item.icon}</svg>
        <span className="text-xs font-medium">{item.label}</span>
    </button>
);

const AddModal = () => {
    const { closeModal } = useAppStore();
    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 bg-black/70 flex items-center justify-center z-40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeModal}
            >
                <motion.div 
                    className="bg-slate-800 rounded-xl p-6 w-11/12 max-w-sm text-center border border-slate-700"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    onClick={e => e.stopPropagation()}
                >
                    <h2 className="text-xl font-bold text-white mb-6">¿Qué quieres registrar hoy?</h2>
                     <div className="space-y-4">
                        <Button variant="ghost" className="w-full h-20 text-lg flex flex-col items-center justify-center gap-2"><img src={ICONS.KETTLEBELL} className="h-8 w-8 pillar-icon-modal"/>Entrenamiento</Button>
                        <Button variant="ghost" className="w-full h-20 text-lg flex flex-col items-center justify-center gap-2"><img src={ICONS.LEAF} className="h-8 w-8 pillar-icon-modal"/>Comida</Button>
                        <Button variant="ghost" className="w-full h-20 text-lg flex flex-col items-center justify-center gap-2"><img src={ICONS.WAVES} className="h-8 w-8 pillar-icon-modal"/>Reflexión</Button>
                     </div>
                     <Button onClick={closeModal} variant="ghost" className="mt-6 text-slate-400">Cancelar</Button>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};


// --- PANTALLA DE LOGIN (SIN CAMBIOS FUNCIONALES, SOLO ESTÉTICOS) ---
const LoginScreen = () => {
    const auth = getAuth();
    const handleGoogleSignIn = async () => {
        try {
            await signInWithPopup(auth, new GoogleAuthProvider());
        } catch (error) {
            console.error("Error con Google Sign In:", error);
        }
    };
    return (
        <div className="max-w-md mx-auto h-screen flex flex-col justify-center items-center bg-slate-900 p-8">
            <h1 className="text-6xl font-semibold text-white mb-4"><span className="font-bold">Z</span>en<span className="font-bold">I</span>t</h1>
            <p className="text-slate-400 text-center mb-12">El equilibrio es el nuevo objetivo.</p>
            <Button variant="default" className="w-full text-lg" onClick={handleGoogleSignIn}>
                <svg className="w-6 h-6 mr-3" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path><path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"></path><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"></path><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.012 36.49 44 30.861 44 24c0-1.341-.138-2.65-.389-3.917z"></path></svg>
                Continuar con Google
            </Button>
        </div>
    );
};


// --- ESTILOS GLOBALES (INYECTADOS EN EL HEAD) ---
const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    body { font-family: 'Inter', sans-serif; -webkit-tap-highlight-color: transparent; }
    
    .pillar-icon, .pillar-icon-modal {
        width: 40px;
        height: 40px;
        filter: invert(80%) sepia(10%) saturate(300%) hue-rotate(180deg) brightness(90%) contrast(90%);
    }
    .pillar-icon-modal {
        width: 32px;
        height: 32px;
    }
`;

const styleSheet = document.createElement("style");
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

