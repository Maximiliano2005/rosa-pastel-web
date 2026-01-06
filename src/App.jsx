import { useState, useEffect } from 'react'
import { db } from './firebase'; 
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import Admin from './Admin';

function App() {
  const [vista, setVista] = useState('cliente');
  const [enviando, setEnviando] = useState(false);
  const [fechasOcupadas, setFechasOcupadas] = useState([]);
  const [reserva, setReserva] = useState({
    nombre: '', 
    telefono: '', 
    fecha: '', 
    hora: '12:00',
    invitados: 10,
    tipoEvento: 'Particular', direccion: '', detalles: ''
  });

  useEffect(() => {
    const obtenerDisponibilidad = async () => {
      const q = query(collection(db, "reservas"), where("estado", "==", "confirmado"));
      const snapshot = await getDocs(q);
      const conteo = {};
      snapshot.forEach(doc => {
        const d = doc.data().fecha;
        conteo[d] = (conteo[d] || 0) + 1;
      });
      const llenos = Object.keys(conteo).filter(fecha => conteo[fecha] >= 2);
      setFechasOcupadas(llenos);
    };
    obtenerDisponibilidad();
  }, [vista]);

  const handleChange = (e) => setReserva({ ...reserva, [e.target.name]: e.target.value });

  const entrarAdmin = () => {
    const clave = prompt("Introduce la clave de administradora:");
    if (clave === "rosapastel2026") setVista('admin');
    else alert("Clave incorrecta");
  };

  const manejarReserva = async (e) => {
    e.preventDefault();
    if (!reserva.fecha) return alert("Por favor selecciona una fecha en el calendario");
    setEnviando(true);
    try {
      // Guardamos en Firebase
      await addDoc(collection(db, "reservas"), {
        ...reserva,
        fechaRegistro: new Date().toLocaleString(),
        estado: 'pendiente'
      });

      // Definimos el texto con emojis
      const textoMensaje = `✨ *Nueva Solicitud Rosa Pastel* ✨\n\n` +
      `👤 *Cliente:* ${reserva.nombre}\n` +
      `📅 *Fecha:* ${reserva.fecha}\n` +
      `🕒 *Hora:* ${reserva.hora} hrs\n` + // <-- Nueva línea
      `👥 *Invitados:* ${reserva.invitados}\n` +
      `🎉 *Evento:* ${reserva.tipoEvento}\n` +
      `📍 *Lugar:* ${reserva.direccion}`;

      // Usamos encodeURIComponent para que los emojis viajen seguros
      // El link correcto usa la variable 'textoMensaje'
      const urlFinal = `https://wa.me/56997920472?text=${encodeURIComponent(textoMensaje)}`;
      
      window.open(urlFinal, '_blank');
      alert("¡Solicitud enviada con éxito!");

      // Limpiamos el formulario después de enviar
      setReserva({
        nombre: '', telefono: '', fecha: '', invitados: 10,
        tipoEvento: 'Particular', direccion: '', detalles: ''
      });

    } catch (err) { 
      alert("Error: " + err.message); 
    } finally { 
      setEnviando(false); 
    }
  };

  if (vista === 'admin') return <Admin volver={() => setVista('cliente')} />;

  return (
    <div className="min-h-screen bg-[#fcf8f0] flex flex-col items-center py-10 px-4 text-[#4a3f35]">
      {/* HEADER ELEGANTE */}
      <header className="mb-12 text-center">
        <h1 className="text-7xl font-serif text-[#c1a57d] mb-2 tracking-tighter">Rosa Pastel</h1>
        <div className="h-1 w-20 bg-[#c4b198] mx-auto mb-2"></div>
        <p className="text-[#c4b198] uppercase tracking-[0.3em] text-xs font-bold">Banquetería & Eventos Temuco</p>
      </header>

      <main className="bg-white shadow-sm rounded-[3rem] p-8 md:p-12 max-w-3xl w-full border border-[#efe4d5]">
        <h2 className="text-3xl font-serif text-[#c1a57d] mb-10 text-center italic">Cotiza tu próximo evento</h2>
        
        <form onSubmit={manejarReserva} className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Nombre y Apellido */}
          <div className="md:col-span-2 group">
            <label className="text-[10px] font-bold text-[#c4b198] uppercase tracking-widest ml-4 mb-2 block">Nombre Completo</label>
            <input type="text" name="nombre" onChange={handleChange} required 
              className="w-full p-5 bg-[#fcf8f0] border-none rounded-2xl focus:ring-2 focus:ring-[#c1a57d] transition-all outline-none text-[#4a3f35] placeholder-[#c4b198]"
              placeholder="¿A quién saludamos?"/>
          </div>

          {/* Calendario con estilo de marca */}
          <div className="md:col-span-2 flex flex-col items-center py-6 bg-[#fcf8f0] rounded-[2.5rem] border border-[#efe4d5]">
            <label className="text-[10px] font-bold text-[#c1a57d] uppercase tracking-widest mb-4">Selecciona tu Fecha Especial</label>
            <div className="custom-calendar-container">
                <Calendar 
                onChange={(val) => setReserva({...reserva, fecha: val.toISOString().split('T')[0]})}
                tileDisabled={({date}) => fechasOcupadas.includes(date.toISOString().split('T')[0])}
                minDate={new Date()}
                className="main-calendar"
                />
            </div>
            {reserva.fecha && (
              <div className="mt-4 px-6 py-2 bg-[#c1a57d] text-white rounded-full text-sm font-bold animate-bounce">
                Día seleccionado: {reserva.fecha}
              </div>
            )}
          </div>

          {/* SECCIÓN DE FECHA Y HORA */}
            <div className="md:col-span-2 flex flex-col items-center py-6 bg-[#fcf8f0] rounded-[2.5rem] border border-[#efe4d5]">
            <label className="text-[10px] font-bold text-[#c1a57d] uppercase tracking-widest mb-4">Selecciona Fecha y Hora</label>

            <Calendar 
            onChange={(val) => setReserva({...reserva, fecha: val.toISOString().split('T')[0]})}
            tileDisabled={({date}) => fechasOcupadas.includes(date.toISOString().split('T')[0])}
            minDate={new Date()}
            className="main-calendar"
            />

            {/* CAMPO DE HORA */}
            <div className="mt-6 flex flex-col items-center">
            <label className="text-[10px] font-bold text-[#c4b198] uppercase tracking-widest mb-2">¿A qué hora comienza el evento?</label>
            <input 
              type="time" 
              name="hora"
              value={reserva.hora}
              onChange={handleChange}
              className="p-3 bg-white border-2 border-[#efe4d5] rounded-xl text-[#c1a57d] font-bold outline-none focus:border-[#c1a57d] transition-all"
            />
            </div>

            {reserva.fecha && (
            <div className="mt-4 px-6 py-2 bg-[#c1a57d] text-white rounded-full text-sm font-bold animate-pulse">
              📅 {reserva.fecha} a las 🕒 {reserva.hora} hrs
            </div>
            )}
            </div>

          {/* Otros campos con el nuevo estilo */}
          <div>
            <label className="text-[10px] font-bold text-[#c4b198] uppercase tracking-widest ml-4 mb-2 block">N° de Invitados</label>
            <input type="number" name="invitados" min="1" onChange={handleChange} required 
              className="w-full p-5 bg-[#fcf8f0] rounded-2xl outline-none focus:ring-2 focus:ring-[#c1a57d]"/>
          </div>

          <div>
            <label className="text-[10px] font-bold text-[#c4b198] uppercase tracking-widest ml-4 mb-2 block">Tipo de Celebración</label>
            <select name="tipoEvento" onChange={handleChange} className="w-full p-5 bg-[#fcf8f0] rounded-2xl outline-none text-[#4a3f35]">
              <option value="Matrimonio">Matrimonio</option>
              <option value="Cumpleaños">Cumpleaños</option>
              <option value="Coffee Break">Coffee Break</option>
              <option value="Empresa">Evento Empresa</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-[10px] font-bold text-[#c4b198] uppercase tracking-widest ml-4 mb-2 block">Lugar del Evento</label>
            <input type="text" name="direccion" placeholder="Ej: Sector Las Encinas, Temuco" onChange={handleChange} required 
              className="w-full p-5 bg-[#fcf8f0] rounded-2xl outline-none focus:ring-2 focus:ring-[#c1a57d]"/>
          </div>

          <div className="md:col-span-2">
            <label className="text-[10px] font-bold text-[#c4b198] uppercase tracking-widest ml-4 mb-2 block">Dinos más detalles</label>
            <textarea name="detalles" rows="3" onChange={handleChange} placeholder="Alergias, colores favoritos, horario..."
              className="w-full p-5 bg-[#fcf8f0] rounded-2xl outline-none focus:ring-2 focus:ring-[#c1a57d]"></textarea>
          </div>
          
          <button type="submit" disabled={enviando}
            className="md:col-span-2 py-5 bg-[#c1a57d] text-white font-bold rounded-2xl hover:bg-[#a68d66] shadow-xl shadow-[#c1a57d]/20 transition-all active:scale-95 disabled:bg-gray-300 uppercase tracking-widest text-sm">
            {enviando ? 'Procesando...' : 'Consultar Disponibilidad'}
          </button>
        </form>
      </main>

      <footer className="mt-16 text-center">
        <p className="text-[#c4b198] text-[10px] uppercase tracking-[0.2em] font-bold">Temuco, Chile</p>
        <button onClick={entrarAdmin} className="mt-4 text-[#c4b198] text-[9px] underline uppercase tracking-widest hover:text-[#c1a57d]">Gestión Interna</button>
      </footer>
    </div>
  );
}

export default App;