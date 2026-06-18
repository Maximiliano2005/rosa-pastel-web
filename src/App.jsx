import { useState, useEffect } from 'react';
import { db } from './firebase'; 
import { collection, onSnapshot } from 'firebase/firestore';
import { Routes, Route, Link } from 'react-router-dom';
import Admin from './Admin';
import DetalleServicio from './DetalleServicio';
import ResponderReserva from './ResponderReserva'; // <-- IMPORTAMOS LA NUEVA PÁGINA

function Home({ servicios }) {
  return (
    <div className="flex flex-col items-center">
      {/* SECCIÓN HERO (Presentación Visual) */}
      <section className="relative w-full h-[60vh] rounded-[3rem] overflow-hidden mb-16 border-4 border-[#efe4d5] shadow-lg">
        <img src="img/fondo.png" alt="Rosa Pastel" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/20 flex flex-col items-center justify-center text-center p-6">
          <h1 className="text-6xl md:text-8xl font-serif text-[#c1a57d] mb-4 tracking-tighter">Rosa Pastel</h1>
          <p className="text-[#fcf8f0] uppercase tracking-[0.4em] text-xs font-bold mb-6">Banquetería & Eventos Temuco</p>
        </div>
      </section>

      {/* SECCIÓN SERVICIOS */}
      <section className="w-full max-w-6xl mb-20 px-4">
        <h3 className="text-[#c4b198] text-[10px] font-bold uppercase tracking-widest border-b border-[#efe4d5] pb-3 mb-10 text-center">Nuestros Servicios</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {servicios.map((srv) => {
            const imagenUrl = srv.img ? `/img/${srv.img}` : '/logo.png';
            return (
              <div key={srv.id} className="bg-white p-6 rounded-[2.5rem] border border-[#efe4d5] shadow-sm flex flex-col items-center text-center">
                <img src={imagenUrl} alt={srv.nombre} className="w-full h-48 object-cover rounded-3xl mb-6 border border-[#efe4d5]" />
                <h4 className="text-2xl font-serif text-[#c1a57d] mb-3">{srv.nombre}</h4>
                <p className="text-sm text-[#4a3f35] flex-1 mb-6">{srv.desc || 'Servicio exclusivo de Rosa Pastel.'}</p>
                <Link to={`/servicio/${srv.nombre}`} className="w-full py-4 bg-[#fcf8f0] text-[#c1a57d] font-bold rounded-2xl uppercase text-[10px] tracking-widest border border-[#efe4d5]">
                  Ver Más Info
                </Link>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function App() {
  const [vista, setVista] = useState('cliente');
  const [servicios, setServicios] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    if (queryParams.has('admin')) {
      const clave = prompt("Introduce la clave:");
      if (clave === "rosapastel2026") setVista('admin');
    }

    const unsub = onSnapshot(collection(db, "servicios"), (snap) => {
      setServicios(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setCargando(false);
    });
    return () => unsub();
  }, []);

  if (cargando) return <div className="min-h-screen flex items-center justify-center bg-[#fcf8f0]">Cargando...</div>;

  if (vista === 'admin') return <Admin volver={() => { setVista('cliente'); window.history.replaceState({}, '', '/'); }} />;

  return (
    <div className="min-h-screen bg-[#fcf8f0] flex flex-col items-center py-10 px-4 text-[#4a3f35]">
      <header className="mb-10 text-center flex flex-col items-center">
        <Link to="/"><img src="/logo.png" alt="Logo" className="w-20 h-20 rounded-full" /></Link>
        <h1 className="text-xl font-serif text-[#c1a57d]">Rosa Pastel</h1>
      </header>
      <main className="max-w-7xl w-full">
        <Routes>
          <Route path="/" element={<Home servicios={servicios} />} />
          <Route path="/servicio/:nombreServicio" element={<DetalleServicio servicios={servicios} />} />
          
          {/* REGISTRAMOS LA NUEVA RUTA AQUÍ EN LOS ROUTES */}
          <Route path="/responder-reserva" element={<ResponderReserva />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;