import React, { useState, useEffect, useMemo } from 'react';
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

// --- Claves de API (Insertadas directamente para el despliegue inicial) ---
const EXERCISE_DB_API_KEY = '99af603688msh3ee0c9da98116e9p174272jsn3773c31651ff';
const EDAMAM_APP_ID = '3909f263';
const EDAMAM_APP_KEY = 'f4a2577d1045eaae9be42322e59e2d7d';
const GOOGLE_FIT_CLIENT_ID = '99146745221-fgs0u4jhq62io786633bta1gln3kjdkj.apps.googleusercontent.com';


// --- Configuración de Firebase (NOTA: El proyecto sigue siendo el original de "zenith") ---
const firebaseConfig = {
  apiKey: "AIzaSyAppsBCeiDUnVqqENzIYU1Te9jO49WsMeY",
  authDomain: "zenith-45e0b.firebaseapp.com",
  projectId: "zenith-45e0b",
  storageBucket: "zenith-45e0b.firebasestorage.app",
  messagingSenderId: "99146745221",
  appId: "1:99146745221:web:e1ad61c561916a0fa970ec",
  measurementId: "G-SKG75K2RD1"
};


// --- Iconos SVG Profesionales (Solución Definitiva) ---
const ICONS = {
    KETTLEBELL: (props) => (
        <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6.5 6.5a2.5 2.5 0 0 1 5 0V7h-5v-.5Z"/><path d="M12.5 6.5a2.5 2.5 0 0 1 5 0V7h-5v-.5Z"/><path d="M9 7v2.8a6.5 6.5 0 0 0-5 6.2 6.5 6.5 0 0 0 6.5 6.5h3A6.5 6.5 0 0 0 20 16a6.5 6.5 0 0 0-5-6.2V7"/><path d="M9 7h6"/>
        </svg>
    ),
    LEAF: (props) => (
        <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 22c4.42-4.42 4.42-11.58 0-16C6.42-2.42 13.58-2.42 18 2c4.42 4.42 4.42 11.58 0 16-4.42 4.42-11.58 4.42-16 0Z"/><path d="m15 9-6 6"/><path d="M16 14c.5-.5 1-1.5.5-2.5s-2-1-2.5.5"/>
        </svg>
    ),
    WAVES: (props) => (
        <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12h.01"/><path d="M7 12h.01"/><path d="M11 12h.01"/><path d="M15 12h.01"/><path d="M19 12h.01"/>
        </svg>
    )
};


// --- Pantalla de Bienvenida con Animación React (Solución Definitiva) ---
const ZenItSplashScreen = () => {
    const [visibleElements, setVisibleElements] = useState([]);

    useEffect(() => {
        const elements = ['Z', 'en', 'I', 't', 'icons'];
        const timers = elements.map((el, index) => 
            setTimeout(() => {
                setVisibleElements(prev => [...prev, el]);
            }, 300 * (index + 1))
        );
        return () => timers.forEach(clearTimeout);
    }, []);

    return (
        <div className="fixed inset-0 bg-slate-900 flex flex-col justify-center items-center z-50 animate-splashFadeOut">
            <div className="flex items-baseline text-7xl font-semibold text-slate-200">
                <span className={`splash-letter ${visibleElements.includes('Z') ? 'visible' : ''}`}>Z</span>
                <span className={`splash-letter splash-thin ${visibleElements.includes('en') ? 'visible' : ''}`}>en</span>
                <span className={`splash-letter ${visibleElements.includes('I') ? 'visible' : ''}`}>I</span>
                <span className={`splash-letter splash-thin ${visibleElements.includes('t') ? 'visible' : ''}`}>t</span>
            </div>
            <div className={`flex justify-center gap-10 mt-8 transition-opacity duration-700 ${visibleElements.includes('icons') ? 'opacity-100' : 'opacity-0'}`}>
                <ICONS.KETTLEBELL className="pillar-icon" />
                <ICONS.LEAF className="pillar-icon" />
                <ICONS.WAVES className="pillar-icon" />
            </div>
        </div>
    );
};


// --- Componente Principal de la App ---
export default function App() {
    const [activeView, setActiveView] = useState('inicio');
    const [modal, setModal] = useState({ type: null, isOpen: false });
    const [greeting, setGreeting] = useState('');
    const [showSplash, setShowSplash] = useState(true);
    
    const [auth, setAuth] = useState(null);
    const [db, setDb] = useState(null);
    const [user, setUser] = useState(null);
    const [authReady, setAuthReady] = useState(false);
    
    const [connections, setConnections] = useState({ googleFit: false, strava: false });
    const [routines, setRoutines] = useState([]);
    
    const [activityData, setActivityData] = useState({
        steps: 0,
        calories: 0,
        exerciseTime: 0,
        isLoading: true,
    });

    useEffect(() => {
        // Duración de la animación: 3.5 segundos
        const timer = setTimeout(() => setShowSplash(false), 3500);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (firebaseConfig && firebaseConfig.apiKey) {
            const app = initializeApp(firebaseConfig);
            const authInstance = getAuth(app);
            const dbInstance = getFirestore(app);
            setAuth(authInstance);
            setDb(dbInstance);

            onAuthStateChanged(authInstance, (firebaseUser) => {
                setUser(firebaseUser);
                setAuthReady(true); 
                
                if (firebaseUser) {
                    const qRoutines = query(collection(dbInstance, `users/${firebaseUser.uid}/routines`));
                    onSnapshot(qRoutines, (querySnapshot) => {
                        const routinesData = [];
                        querySnapshot.forEach((doc) => {
                            routinesData.push({ id: doc.id, ...doc.data() });
                        });
                        setRoutines(routinesData);
                    });
                     setActivityData(prev => ({...prev, isLoading: false}));
                } else {
                    setRoutines([]);
                }
            });
        } else {
             console.warn("Configuración de Firebase no encontrada.");
             setAuthReady(true);
        }
    }, []);

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Buenos días');
        else if (hour < 21) setGreeting('Buenas tardes');
        else setGreeting('Buenas noches');
    }, []);
    
    const openModal = (type) => setModal({ type, isOpen: true });
    const closeModal = () => setModal({ type: null, isOpen: false });

    if (showSplash) return <ZenItSplashScreen />;
    if (!authReady) return <div className="fixed inset-0 bg-slate-900 flex items-center justify-center z-50"><p className="text-white">Cargando...</p></div>;
    if (!user) return <LoginScreen auth={auth} />;

    return (
        <div className="max-w-md mx-auto h-screen flex flex-col bg-slate-900 text-slate-200 font-sans">
            <MainContent 
                activeView={activeView} 
                greeting={greeting} 
                connections={connections} 
                setConnections={setConnections} 
                openModal={openModal} 
                routines={routines} 
                userName={user?.displayName}
                activityData={activityData}
                setActivityData={setActivityData}
            />
            <NavBar activeView={activeView} setActiveView={setActiveView} onAddClick={() => openModal('add_choice')} />
            
            {modal.isOpen && modal.type === 'add_choice' && <AddModal onClose={closeModal} openModal={openModal} />}
            {modal.isOpen && modal.type === 'reflection' && <ReflectionModal onClose={closeModal} db={db} user={user} />}
            {modal.isOpen && modal.type === 'routine_builder' && <RoutineBuilderModal onClose={closeModal} db={db} user={user} />}
            {modal.isOpen && modal.type === 'food_search' && <FoodSearchModal onClose={closeModal} />}
        </div>
    );
}

// --- PANTALLA DE LOGIN (ACTUALIZADA)---
const LoginScreen = ({ auth }) => {
    const [loginView, setLoginView] = useState('options');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [confirmationResult, setConfirmationResult] = useState(null);

    const handleGoogleSignIn = async () => {
        if (!auth) {
            setError("Firebase no está inicializado.");
            return;
        }
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Error con Google Sign In:", error);
            setError("No se pudo iniciar sesión con Google.");
        }
    };

    const handleEmailSignUp = async (e) => {
        e.preventDefault();
        setError('');
        if (!auth) {
             setError("Firebase no está inicializado.");
             return;
        }
        try {
            await createUserWithEmailAndPassword(auth, email, password);
        } catch (error) {
            setError("Error al registrarse: " + error.message);
        }
    };

    const handleEmailSignIn = async (e) => {
        e.preventDefault();
        setError('');
         if (!auth) {
             setError("Firebase no está inicializado.");
             return;
        }
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            setError("Error al iniciar sesión: " + error.message);
        }
    };
    
    const setupRecaptcha = () => {
        if (!auth) {
            setError("Firebase no está inicializado.");
            return;
        }
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          'size': 'invisible',
          'callback': (response) => {}
        });
    }

    const handlePhoneSignIn = async (e) => {
        e.preventDefault();
        setError('');
        setupRecaptcha();
        const appVerifier = window.recaptchaVerifier;
        const formattedPhone = `+34${phone}`;
        try {
            const result = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
            setConfirmationResult(result);
        } catch (error) {
            console.error("Error con SMS:", error);
            setError("No se pudo enviar el SMS. ¿El número es correcto?");
        }
    }

    const handleOtpSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!confirmationResult) return;
        try {
            await confirmationResult.confirm(otp);
        } catch (error) {
            setError("Código incorrecto. Inténtalo de nuevo.");
        }
    }

    return (
        <div className="max-w-md mx-auto h-screen flex flex-col justify-center items-center bg-slate-900 p-8">
            <h1 className="text-6xl font-semibold text-white mb-4">
                <span className="font-bold">Z</span>en<span className="font-bold">I</span>t
            </h1>
            <p className="text-slate-400 text-center mb-12">Empieza tu viaje hacia una mejor versión de ti mismo.</p>
            
            {error && <p className="bg-red-900/50 text-red-300 p-3 rounded-md mb-4 text-center">{error}</p>}
            <div id="recaptcha-container"></div>

            {loginView === 'options' && (
                <div className="w-full space-y-4">
                    <button onClick={handleGoogleSignIn} className="w-full flex items-center justify-center bg-white text-slate-800 font-medium py-3 px-4 rounded-lg hover:bg-slate-200 transition-colors">
                        <svg className="w-6 h-6 mr-3" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path><path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"></path><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"></path><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.012 36.49 44 30.861 44 24c0-1.341-.138-2.65-.389-3.917z"></path></svg>
                        Continuar con Google
                    </button>
                    <button onClick={() => setLoginView('email')} className="w-full bg-slate-700 text-white font-medium py-3 px-4 rounded-lg hover:bg-slate-600 transition-colors">Usar Correo Electrónico</button>
                    <button onClick={() => setLoginView('phone')} className="w-full bg-slate-700 text-white font-medium py-3 px-4 rounded-lg hover:bg-slate-600 transition-colors">Usar Teléfono</button>
                </div>
            )}

            {loginView === 'email' && (
                <form className="w-full space-y-4">
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Correo electrónico" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Contraseña (mín. 6 caracteres)" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    <div className="flex space-x-4">
                        <button onClick={handleEmailSignIn} className="w-full bg-purple-600 text-white font-medium py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors">Iniciar Sesión</button>
                        <button onClick={handleEmailSignUp} className="w-full bg-slate-700 text-white font-medium py-3 px-4 rounded-lg hover:bg-slate-600 transition-colors">Registrarse</button>
                    </div>
                    <button onClick={() => setLoginView('options')} className="w-full text-slate-400 mt-4 text-sm">Volver a otras opciones</button>
                </form>
            )}

            {loginView === 'phone' && !confirmationResult && (
                 <form onSubmit={handlePhoneSignIn} className="w-full space-y-4">
                    <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-3 focus-within:ring-2 focus-within:ring-purple-500">
                        <span className="text-slate-400 pr-2 border-r border-slate-600">+34</span>
                        <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Número de teléfono" className="w-full bg-transparent pl-2 text-white focus:outline-none" />
                    </div>
                    <button type="submit" className="w-full bg-purple-600 text-white font-medium py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors">Enviar SMS</button>
                    <button onClick={() => setLoginView('options')} className="w-full text-slate-400 mt-4 text-sm">Volver a otras opciones</button>
                </form>
            )}

            {loginView === 'phone' && confirmationResult && (
                 <form onSubmit={handleOtpSubmit} className="w-full space-y-4">
                    <p className="text-slate-400 text-sm text-center">Introduce el código de 6 dígitos que te hemos enviado.</p>
                    <input type="text" value={otp} onChange={e => setOtp(e.target.value)} placeholder="Código de verificación" className="w-full text-center tracking-[0.5em] bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    <button type="submit" className="w-full bg-purple-600 text-white font-medium py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors">Verificar</button>
                    <button onClick={() => setConfirmationResult(null)} className="w-full text-slate-400 mt-4 text-sm">Volver a introducir el número</button>
                </form>
            )}
        </div>
    );
};


// --- MODALES (CON ICONOS SVG PROFESIONALES) ---
const AddModal = ({ onClose, openModal }) => (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-40" onClick={onClose}>
        <div className="bg-slate-800 rounded-lg p-6 w-11/12 max-w-sm text-center" onClick={e => e.stopPropagation()}>
             <h2 className="text-xl font-bold text-white mb-6">¿Qué quieres registrar?</h2>
             <div className="space-y-4">
                <button className="w-full flex flex-col items-center justify-center bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 px-4 rounded-lg transition-colors border-b-4 border-blue-500">
                     <ICONS.KETTLEBELL className="h-10 w-10 mb-2" />
                     Entrenamiento
                </button>
                <button onClick={() => { onClose(); openModal('food_search'); }} className="w-full flex flex-col items-center justify-center bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 px-4 rounded-lg transition-colors border-b-4 border-green-500">
                    <ICONS.LEAF className="h-10 w-10 mb-2" />
                    Comida
                </button>
                <button onClick={() => { onClose(); openModal('reflection'); }} className="w-full flex flex-col items-center justify-center bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 px-4 rounded-lg transition-colors border-b-4 border-purple-500">
                    <ICONS.WAVES className="h-10 w-10 mb-2" />
                    Reflexión
                </button>
             </div>
             <button onClick={onClose} className="mt-8 text-slate-400">Cancelar</button>
        </div>
    </div>
);
const ReflectionModal = ({ onClose, db, user }) => {
    const [text, setText] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const wordCount = useMemo(() => text.trim() === '' ? 0 : text.trim().split(/\s+/).length, [text]);

    const handleSave = async () => {
        if (text.trim() === '' || !db || !user) return;
        setIsSaving(true);
        try {
            await addDoc(collection(db, `users/${user.uid}/reflections`), {
                text: text,
                createdAt: serverTimestamp(),
                wordCount: wordCount
            });
            onClose();
        } catch (error) {
            console.error("Error al guardar la reflexión: ", error);
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-95 flex flex-col p-4 z-50 animate-viewFadeIn">
            <div className="flex justify-between items-center mb-4">
                 <h2 className="text-2xl font-bold text-white">Tu Reflexión</h2>
                 <button onClick={onClose} className="text-slate-400 text-2xl">&times;</button>
            </div>
            <textarea 
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Escribe aquí tus pensamientos..."
                className="flex-grow w-full bg-slate-800 border border-slate-700 rounded-lg p-4 text-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <div className="flex justify-between items-center mt-4">
                <span className="text-sm text-slate-500">{wordCount} palabra(s)</span>
                <button 
                    onClick={handleSave}
                    disabled={isSaving || text.trim() === ''}
                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition-colors">
                    {isSaving ? 'Guardando...' : 'Guardar'}
                </button>
            </div>
        </div>
    );
};
const RoutineBuilderModal = ({ onClose, db, user }) => {
    const [routineName, setRoutineName] = useState('');
    const [selectedExercises, setSelectedExercises] = useState([]);
    const [exercises, setExercises] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchExercises = async () => {
            setIsLoading(true);
            setError(null);
            const options = {
                method: 'GET',
                headers: {
                    'X-RapidAPI-Key': EXERCISE_DB_API_KEY,
                    'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com'
                }
            };
            try {
                const response = await fetch('https://exercisedb.p.rapidapi.com/exercises?limit=1300', options);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                setExercises(data);
            } catch (err) {
                console.error("Error al cargar ejercicios:", err);
                setError('No se pudo conectar con la base de datos de ejercicios.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchExercises();
    }, []);

    const addExercise = (exercise) => {
        if (!selectedExercises.find(e => e.id === exercise.id)) {
            setSelectedExercises([...selectedExercises, { ...exercise, sets: 3, reps: 10 }]);
        }
    };
    
    const removeExercise = (exerciseId) => setSelectedExercises(selectedExercises.filter(ex => ex.id !== exerciseId));

    const handleSaveRoutine = async () => {
        if (!routineName.trim() || selectedExercises.length === 0 || !db || !user) return;
        
        setIsSaving(true);
        const routineData = {
            name: routineName,
            exercises: selectedExercises.map(({ id, name, gifUrl, bodyPart, equipment, sets, reps }) => ({ id, name, gifUrl, bodyPart, equipment, sets, reps })),
            createdAt: serverTimestamp(),
        };

        try {
            await addDoc(collection(db, `users/${user.uid}/routines`), routineData);
            onClose();
        } catch (error) {
            console.error("Error al guardar la rutina:", error);
            alert("No se pudo guardar la rutina.");
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-slate-900 flex flex-col z-50 animate-viewFadeIn">
            <div className="p-4 flex justify-between items-center border-b border-slate-700">
                 <h2 className="text-2xl font-bold text-white">Crear Rutina</h2>
                 <button onClick={onClose} className="text-slate-400 text-2xl">&times;</button>
            </div>
            <div className="flex-grow flex flex-col md:flex-row overflow-hidden">
                <div className="w-full md:w-1/2 flex flex-col p-4 overflow-y-auto">
                    <h3 className="text-lg font-semibold text-white mb-4">Biblioteca de Ejercicios</h3>
                    <input type="text" placeholder="Buscar ejercicio (en inglés)..." className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 mb-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    {isLoading && <p className="text-slate-500 text-center mt-8">Cargando más de 1.300 ejercicios...</p>}
                    {error && <p className="text-amber-400 text-center mt-8 text-sm p-2 bg-amber-900/50 rounded-md">{error}</p>}
                    <div className="space-y-3 mt-4">
                        {exercises.slice(0, 50).map(ex => (
                            <div key={ex.id} className="bg-slate-800 p-3 rounded-lg flex items-center justify-between">
                                <div className="flex items-center min-w-0">
                                    <img src={ex.gifUrl} alt={ex.name} className="w-14 h-14 rounded-md mr-4 bg-slate-700 flex-shrink-0" />
                                    <div className="min-w-0">
                                        <p className="font-bold text-white capitalize truncate">{ex.name}</p>
                                        <p className="text-sm text-slate-400 capitalize">{ex.bodyPart}</p>
                                    </div>
                                </div>
                                <button onClick={() => addExercise(ex)} className="bg-blue-600 rounded-full h-8 w-8 flex items-center justify-center text-white text-xl hover:bg-blue-700 flex-shrink-0 ml-2">+</button>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="w-full md:w-1/2 flex flex-col p-4 bg-slate-800 border-t md:border-t-0 md:border-l border-slate-700 overflow-y-auto">
                     <h3 className="text-lg font-semibold text-white mb-4">Tu Nueva Rutina</h3>
                     <input type="text" value={routineName} onChange={(e) => setRoutineName(e.target.value)} placeholder="Nombre (ej. Día de Pecho)" className="w-full bg-slate-700 border border-slate-600 rounded-lg p-2 mb-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                     <div className="space-y-3">
                        {selectedExercises.map((ex) => (
                            <div key={ex.id} className="bg-slate-700 p-3 rounded-lg flex items-center justify-between">
                                <div className="min-w-0">
                                    <p className="font-bold text-white capitalize truncate">{ex.name}</p>
                                    <p className="text-sm text-slate-400">{`${ex.sets} series x ${ex.reps} reps`}</p>
                                </div>
                                <button onClick={() => removeExercise(ex.id)} className="text-slate-500 hover:text-red-500 text-xl font-bold flex-shrink-0 ml-2">&times;</button>
                            </div>
                        ))}
                     </div>
                </div>
            </div>
            <div className="p-4 border-t border-slate-700">
                <button 
                    onClick={handleSaveRoutine}
                    disabled={!routineName || selectedExercises.length === 0 || isSaving} 
                    className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg disabled:bg-slate-700 disabled:cursor-not-allowed">
                    {isSaving ? 'Guardando...' : 'Guardar Rutina'}
                </button>
            </div>
        </div>
    );
};
const FoodSearchModal = ({ onClose }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (searchTerm.trim() === '') return;
        setIsLoading(true);
        setError(null);
        
        const url = `https://api.edamam.com/api/food-database/v2/parser?app_id=${EDAMAM_APP_ID}&app_key=${EDAMAM_APP_KEY}&ingr=${encodeURIComponent(searchTerm)}&nutrition-type=logging`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Error: ${response.statusText}`);
            const data = await response.json();
            setResults(data.hints.map(item => item.food));
            if (data.hints.length === 0) setError('No se encontraron resultados para tu búsqueda.');
        } catch (err) {
            console.error("Error al buscar alimentos:", err);
            setError('No se pudo conectar con la base de datos de alimentos.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900 flex flex-col z-50 animate-viewFadeIn">
            <div className="p-4 flex justify-between items-center border-b border-slate-700">
                 <h2 className="text-2xl font-bold text-white">Registrar Comida</h2>
                 <button onClick={onClose} className="text-slate-400 text-2xl">&times;</button>
            </div>
            <div className="p-4"><form onSubmit={handleSearch}><input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Busca un alimento (ej. Manzana)" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500"/></form></div>
            <div className="flex-grow overflow-y-auto p-4">
                {isLoading && <p className="text-slate-500 text-center mt-8">Buscando...</p>}
                {error && <p className="text-amber-400 text-center mt-8 text-sm p-2 bg-amber-900/50 rounded-md">{error}</p>}
                <div className="space-y-3">
                    {results.map(food => (
                        <div key={food.foodId} className="bg-slate-800 p-3 rounded-lg flex items-center justify-between">
                            <div><p className="font-bold text-white capitalize">{food.label}</p><p className="text-sm text-green-400">{Math.round(food.nutrients.ENERC_KCAL)} kcal por 100g</p></div>
                            <button className="bg-green-600 rounded-full h-8 w-8 flex items-center justify-center text-white text-xl hover:bg-green-700">+</button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
const MainContent = ({ activeView, greeting, connections, setConnections, openModal, routines, userName, activityData, setActivityData }) => (
    <main className="flex-grow p-6 overflow-y-auto">
        {activeView === 'inicio' && <DashboardView greeting={greeting} userName={userName} activityData={activityData} />}
        {activeView === 'planes' && <PlanesView onAddRoutine={() => openModal('routine_builder')} routines={routines} />}
        {activeView === 'progreso' && <ProgressView />}
        {activeView === 'perfil' && <ProfileView connections={connections} setConnections={setConnections} setActivityData={setActivityData} />}
    </main>
);
const PlanesView = ({ onAddRoutine, routines }) => {
    return (
        <div className="animate-viewFadeIn">
            <div className="flex justify-between items-center mb-6">
                 <h1 className="text-3xl font-bold text-white">Mis Planes</h1>
                 <button onClick={onAddRoutine} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg flex items-center hover:bg-blue-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                    Crear Rutina
                </button>
            </div>
            {routines.length === 0 ? (
                <div className="bg-slate-800 p-6 rounded-lg text-center"><p className="text-slate-400">Aún no has creado ninguna rutina.</p></div>
            ) : (
                <div className="space-y-4">
                    {routines.map(routine => (
                        <div key={routine.id} className="bg-slate-800 p-4 rounded-lg">
                            <h3 className="text-lg font-bold text-white">{routine.name}</h3>
                            <p className="text-sm text-slate-400">{routine.exercises.length} ejercicio(s)</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
const ProgressView = () => (
    <div className="animate-viewFadeIn"><h1 className="text-3xl font-bold text-white mb-6">Progreso</h1><div className="space-y-6"><div className="bg-slate-800 p-6 rounded-lg text-center"><p className="text-slate-400">Gráficos de Entrenamiento y Nutrición.</p></div><div className="bg-slate-800 p-6 rounded-lg"><h2 className="text-sm font-semibold text-purple-400 mb-2">RESUMEN MENTAL MENSUAL</h2><div className="aspect-video bg-slate-700 rounded-md flex items-center justify-center"><p className="text-slate-500 text-sm">Tu mosaico de palabras aparecerá aquí.</p></div></div></div></div>
);
const DashboardView = ({ greeting, userName, activityData }) => (
    <div className="animate-viewFadeIn">
        <h1 className="text-3xl font-bold text-white mb-1">{greeting}, {userName ? userName.split(' ')[0] : '¡vamos allá'}!</h1>
        <p className="text-slate-400 mb-8">Aquí tienes el resumen de tu día.</p>
        <div className="space-y-6">
            <MindfulnessWidget />
            <ActivityWidget activityData={activityData} />
            <NutritionWidget />
        </div>
    </div>
);
const ProfileView = ({ connections, setConnections, setActivityData }) => {
    
    const fetchGoogleFitData = async (token) => {
        setActivityData(prev => ({ ...prev, isLoading: true }));
        const now = new Date();
        const startTimeMillis = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const endTimeMillis = now.getTime();

        try {
            const response = await fetch(`https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    aggregateBy: [{ dataTypeName: "com.google.step_count.delta" }],
                    bucketByTime: { durationMillis: 86400000 },
                    startTimeMillis: startTimeMillis,
                    endTimeMillis: endTimeMillis
                })
            });

            if (!response.ok) {
                throw new Error(`Google Fit API error! status: ${response.status}`);
            }

            const data = await response.json();
            let steps = 0;
            if (data.bucket && data.bucket.length > 0 && data.bucket[0].dataset[0].point.length > 0) {
                steps = data.bucket[0].dataset[0].point[0].value[0].intVal || 0;
            }
            setActivityData({ steps, calories: Math.round(steps * 0.04), exerciseTime: 0, isLoading: false });
        } catch (error) {
            console.error("Error fetching Google Fit data:", error);
            setActivityData(prev => ({ ...prev, isLoading: false }));
        }
    };

    const handleGoogleFitConnect = () => {
        const loadGapiScript = (callback) => {
            const existingScript = document.getElementById('google-api-script');
            if (!existingScript) {
                const script = document.createElement('script');
                script.src = 'https://apis.google.com/js/api.js';
                script.id = 'google-api-script';
                document.body.appendChild(script);
                script.onload = () => {
                    setTimeout(() => {
                        if(window.gapi) {
                           window.gapi.load('client', callback);
                        }
                    }, 500);
                };
            }
            if (existingScript && callback) callback();
        };

        const initClient = () => {
             const tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_FIT_CLIENT_ID,
                scope: 'https://www.googleapis.com/auth/fitness.activity.read',
                callback: (tokenResponse) => {
                    if (tokenResponse && tokenResponse.access_token) {
                        setConnections(prev => ({ ...prev, googleFit: true }));
                        fetchGoogleFitData(tokenResponse);
                    }
                },
            });
            tokenClient.requestAccessToken();
        };

        loadGapiScript(() => {
            const gsiScript = document.getElementById('google-gsi-script');
            if (!gsiScript) {
                const script = document.createElement('script');
                script.src = 'https://accounts.google.com/gsi/client';
                script.id = 'google-gsi-script';
                script.onload = initClient;
                document.body.appendChild(script);
            } else {
                initClient();
            }
        });
    };

    const handleStravaConnect = () => {
        console.log("Iniciando conexión con Strava...");
        setConnections(prev => ({ ...prev, strava: !prev.strava }));
    };

    return (
        <div className="animate-viewFadeIn">
            <h1 className="text-3xl font-bold text-white mb-6">Perfil</h1>
            <div className="bg-slate-800 p-6 rounded-lg mb-6 text-center"><p className="text-slate-400">Aquí estará tu información personal.</p></div>
            <h2 className="text-xl font-bold text-white mb-4">Mis Conexiones</h2>
            <div className="bg-slate-800 rounded-lg">
                <div className="flex items-center justify-between p-4 border-b border-slate-700">
                    <div className="flex items-center"><img src="https://placehold.co/24x24/FFFFFF/000000?text=G" alt="Google Fit" className="h-6 mr-4 bg-white p-1 rounded-full"/><span className="font-medium text-white">Google Fit</span></div>
                    <button onClick={handleGoogleFitConnect} className={`px-4 py-1.5 text-sm font-semibold rounded-full ${connections.googleFit ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white`}>{connections.googleFit ? 'Desconectar' : 'Conectar'}</button>
                </div>
                <div className="flex items-center justify-between p-4">
                     <div className="flex items-center"><svg className="h-6 w-6 mr-4 text-[#FC4C02]" viewBox="0 0 24 24" fill="currentColor"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.599h3.482L11.821 0 7.33 9.745h3.049z"/></svg><span className="font-medium text-white">Strava</span></div>
                     <button onClick={handleStravaConnect} className={`px-4 py-1.5 text-sm font-semibold rounded-full ${connections.strava ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white`}>{connections.strava ? 'Desconectar' : 'Conectar'}</button>
                </div>
            </div>
        </div>
    );
};
const MindfulnessWidget = () => (
    <div className="bg-slate-800 p-6 rounded-lg"><h2 className="text-sm font-semibold text-purple-400 mb-2">PENSAMIENTO DEL DÍA</h2><p className="text-lg text-slate-300 italic">"La única vez que fallas es cuando no lo intentas."</p></div>
);
const ActivityWidget = ({ activityData }) => {
    const { steps, calories, exerciseTime, isLoading } = activityData;

    if (isLoading) {
        return (
            <div className="bg-slate-800 p-6 rounded-lg">
                <h2 className="text-sm font-semibold text-blue-400 mb-4">ACTIVIDAD DE HOY</h2>
                <div className="text-center text-slate-400">Cargando datos...</div>
            </div>
        );
    }

    return (
        <div className="bg-slate-800 p-6 rounded-lg">
            <h2 className="text-sm font-semibold text-blue-400 mb-4">ACTIVIDAD DE HOY</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
                <ProgressRing value={steps} goal={10000} label="Pasos" color="text-blue-500" displayValue={(steps / 1000).toFixed(1) + 'k'} />
                <ProgressRing value={calories} goal={600} label="Kcal Quemadas" color="text-red-500" displayValue={calories} />
                <ProgressRing value={exerciseTime} goal={60} label="Ejercicio" color="text-green-500" displayValue={exerciseTime + ' min'} />
            </div>
        </div>
    );
};
const NutritionWidget = () => (
     <div className="bg-slate-800 p-6 rounded-lg"><div className="flex justify-between items-center mb-2"><h2 className="text-sm font-semibold text-green-400">NUTRICIÓN</h2><span className="text-sm font-medium text-slate-300">Aún sin registros</span></div><div className="w-full bg-slate-700 rounded-full h-2.5"><div className="bg-green-500 h-2.5 rounded-full" style={{ width: '0%' }}></div></div></div>
);
const ProgressRing = ({ value, goal, label, color, displayValue }) => {
    const radius = 34;
    const circumference = 2 * Math.PI * radius;
    const offset = goal > 0 ? circumference - (value / goal) * circumference : circumference;
    return (
        <div>
            <div className="relative inline-flex items-center justify-center">
                <svg className="w-20 h-20"><circle className="text-slate-700" strokeWidth="6" stroke="currentColor" fill="transparent" r={radius} cx="40" cy="40" /><circle className={`progress-ring__circle ${color}`} strokeWidth="6" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" stroke="currentColor" fill="transparent" r={radius} cx="40" cy="40" /></svg>
                <span className="absolute text-sm font-bold text-white">{displayValue}</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">{label}</p>
        </div>
    );
};
const NavBar = ({ activeView, setActiveView, onAddClick }) => {
    const navItems = [
        { id: 'inicio', label: 'Inicio', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /> },
        { id: 'planes', label: 'Planes', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /> },
        { id: 'add', label: 'Add', isCentral: true },
        { id: 'progreso', label: 'Progreso', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /> },
        { id: 'perfil', label: 'Perfil', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /> }
    ];
    return (
         <nav className="bg-slate-800 border-t border-slate-700 grid grid-cols-5 items-center sticky bottom-0">
            {navItems.map(item => {
                if (item.isCentral) {
                    return (<button key={item.id} onClick={onAddClick} className="flex items-center justify-center"><div className="bg-blue-600 rounded-full h-16 w-16 flex items-center justify-center -mt-8 shadow-lg shadow-blue-500/50 transform hover:scale-110 transition-transform"><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg></div></button>);
                }
                const isActive = activeView === item.id;
                return (<button key={item.id} onClick={() => setActiveView(item.id)} className={`flex flex-col items-center justify-center p-3 transition-colors hover:bg-slate-700 ${isActive ? 'text-blue-500' : 'text-slate-400'}`}><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">{item.icon}</svg><span className="text-xs font-medium">{item.label}</span></button>);
            })}
        </nav>
    );
};

// --- Estilos de Animación (inyectados en el head) ---
const styles = `
    body { font-family: 'Poppins', sans-serif; -webkit-tap-highlight-color: transparent; }
    .animate-viewFadeIn { animation: viewFadeIn 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
    @keyframes viewFadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
    .progress-ring__circle { transition: stroke-dashoffset 0.5s; transform: rotate(-90deg); transform-origin: 50% 50%; }

    /* --- Animaciones de la nueva Splash Screen (Solución Definitiva) --- */
    .animate-splashFadeOut { animation: splashFadeOut 0.5s ease-out 3.0s forwards; }
    @keyframes splashFadeOut { to { opacity: 0; visibility: hidden; } }

    .splash-letter {
        opacity: 0;
        transition: opacity 0.5s ease-in-out;
    }
    .splash-letter.visible {
        opacity: 1;
    }
    .splash-thin {
        font-weight: 300;
    }

    .pillar-icon {
        width: 40px;
        height: 40px;
        stroke: #94a3b8; /* slate-400 */
    }
`;

const styleSheet = document.createElement("style");
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

