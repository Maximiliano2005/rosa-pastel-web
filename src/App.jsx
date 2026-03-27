import { useState, useEffect } from 'react'
import { db } from './firebase'; 
import { collection, addDoc, onSnapshot, query } from 'firebase/firestore';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import Admin from './Admin';
import emailjs from '@emailjs/browser';

function App() {
  const [vista, setVista] = useState('cliente');
  const [enviando, setEnviando] = useState(false);
  const [servicios, setServicios] = useState([]);
  const [diasCerrados, setDiasCerrados] = useState([]); // Nuevo: Estado para días bloqueados
  const [reserva, setReserva] = useState({
    nombre: '', 
    rut: '',
    email: '',
    telefono: '', 
    fecha: '', 
    hora: '12:00',
    invitados: 10,
    tipoEvento: '', 
    direccion: '', 
    detalles: ''
  });

  const entrarAdmin = () => {
    const clave = prompt("Introduce la clave de administradora:");
    if (clave === "rosapastel2026") setVista('admin');
    else alert("Clave incorrecta");
  };

  useEffect(() => {
    // 1. Detección de URL para Admin
    const queryParams = new URLSearchParams(window.location.search);
    if (queryParams.has('admin')) entrarAdmin();

    // 2. Escuchar SERVICIOS en tiempo real
    const unsubServicios = onSnapshot(collection(db, "servicios"), (snap) => {
      const lista = snap.docs.map(doc => doc.data().nombre);
      setServicios(lista);
      if (lista.length > 0) setReserva(prev => ({ ...prev, tipoEvento: lista[0] }));
    });

    // 3. Escuchar BLOQUEOS (Días cerrados) en tiempo real
    const unsubBloqueos = onSnapshot(collection(db, "bloqueos"), (snap) => {
      const fechas = snap.docs.map(doc => doc.data().fecha);
      setDiasCerrados(fechas);
    });

    return () => { unsubServicios(); unsubBloqueos(); };
  }, []);

  const handleChange = (e) => setReserva({ ...reserva, [e.target.name]: e.target.value });

  const manejarReserva = async (e) => {
    e.preventDefault();
    if (!reserva.fecha) return alert("Por favor selecciona una fecha en el calendario");
    setEnviando(true);

    try {
      await addDoc(collection(db, "reservas"), {
        ...reserva,
        fechaRegistro: new Date().toLocaleString(),
        estado: 'pendiente'
      });

      const serviceID = 'service_skm23ep';
      const templateID = 'template_vhlomqs';
      const publicKey = '56AEmrh5uSxllA5ot';
      await emailjs.send(serviceID, templateID, reserva, publicKey);

      alert("¡Solicitud enviada! Nos contactaremos pronto.");
      setReserva({
        nombre: '', rut: '', email: '', telefono: '', fecha: '', 
        hora: '12:00', invitados: 10, tipoEvento: servicios[0] || '', 
        direccion: '', detalles: ''
      });
    } catch (err) { alert("Error: " + err.message); } finally { setEnviando(false); }
  };

  if (vista === 'admin') return <Admin volver={() => setVista('cliente')} />;

  return (
    <div className="min-h-screen bg-[#fcf8f0] flex flex-col items-center py-12 px-4 text-[#4a3f35]">
      <header className="mb-12 text-center">
        <img src="/logo.png" alt="Logo" className="w-32 h-32 rounded-full mx-auto mb-4 border-4 border-[#efe4d5] object-cover shadow-sm" />
        <h1 className="text-7xl font-serif text-[#c1a57d] mb-2 tracking-tighter">Rosa Pastel</h1>
        <div className="h-1 w-20 bg-[#c4b198] mx-auto mb-2"></div>
        <p className="text-[#c4b198] uppercase tracking-[0.3em] text-[10px] font-bold">Banquetería & Eventos Temuco</p>
      </header>

      <main className="bg-white shadow-sm rounded-[3rem] p-8 md:p-16 max-w-4xl w-full border border-[#efe4d5]">
        <h2 className="text-3xl font-serif text-[#c1a57d] mb-12 text-center italic">Cotiza tu próximo evento</h2>
        
        <form onSubmit={manejarReserva} className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
          
          <div className="space-y-6">
            <h3 className="text-[#c4b198] text-[10px] font-bold uppercase tracking-widest border-b border-[#fcf8f0] pb-2">Datos de Contacto</h3>
            <input type="text" name="nombre" value={reserva.nombre} onChange={handleChange} required className="w-full p-4 bg-[#fcf8f0] rounded-2xl outline-none" placeholder="Nombre Completo"/>
            <input type="text" name="rut" value={reserva.rut} onChange={handleChange} className="w-full p-4 bg-[#fcf8f0] rounded-2xl outline-none" placeholder="RUT"/>
            <input type="email" name="email" value={reserva.email} onChange={handleChange} required className="w-full p-4 bg-[#fcf8f0] rounded-2xl outline-none" placeholder="E-mail"/>
            <input type="tel" name="telefono" value={reserva.telefono} onChange={handleChange} required className="w-full p-4 bg-[#fcf8f0] rounded-2xl outline-none" placeholder="WhatsApp"/>
          </div>

          <div className="space-y-6">
            <h3 className="text-[#c4b198] text-[10px] font-bold uppercase tracking-widest border-b border-[#fcf8f0] pb-2">Fecha y Servicio</h3>
            <div className="flex flex-col items-center py-4 bg-[#fcf8f0] rounded-[2.5rem] border border-[#efe4d5]">
              <Calendar 
                onChange={(val) => setReserva({...reserva, fecha: val.toISOString().split('T')[0]})} 
                minDate={new Date()} 
                // AQUÍ SE BLOQUEAN LAS FECHAS:
                tileDisabled={({date}) => diasCerrados.includes(date.toISOString().split('T')[0])}
              />
              {reserva.fecha && <p className="mt-2 text-[10px] font-bold text-[#c1a57d]">FECHA: {reserva.fecha}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
               <input type="number" name="invitados" value={reserva.invitados} onChange={handleChange} className="w-full p-4 bg-[#fcf8f0] rounded-2xl outline-none" />
               <select name="tipoEvento" value={reserva.tipoEvento} onChange={handleChange} className="w-full p-4 bg-[#fcf8f0] rounded-2xl outline-none text-sm">
                 {servicios.map(s => <option key={s} value={s}>{s}</option>)}
               </select>
            </div>
          </div>

          <div className="md:col-span-2 space-y-4">
             <input type="text" name="direccion" value={reserva.direccion} onChange={handleChange} required className="w-full p-4 bg-[#fcf8f0] rounded-2xl outline-none" placeholder="Dirección del Evento"/>
             <textarea name="detalles" value={reserva.detalles} rows="2" onChange={handleChange} className="w-full p-4 bg-[#fcf8f0] rounded-2xl outline-none" placeholder="Detalles o requerimientos especiales..."></textarea>
          </div>

          <button type="submit" disabled={enviando} className="md:col-span-2 py-5 bg-[#c1a57d] text-white font-bold rounded-2xl uppercase tracking-widest hover:bg-[#a68d66] transition-all shadow-lg shadow-[#c1a57d]/20">
            {enviando ? 'Enviando...' : 'Consultar Disponibilidad'}
          </button>
        </form>
      </main>
    </div>
  );
}

export default App;