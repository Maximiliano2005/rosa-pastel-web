import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from './firebase'; 
import { collection, addDoc, onSnapshot } from 'firebase/firestore';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import emailjs from '@emailjs/browser';

function DetalleServicio({ servicios }) {
  const { nombreServicio } = useParams();
  const navigate = useNavigate();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [diasCerrados, setDiasCerrados] = useState([]);
  const [enviando, setEnviando] = useState(false);
  
  const srvData = servicios.find(s => s.nombre === nombreServicio) || { items: [], img: '', desc: '' };
  const [itemsSeleccionados, setItemsSeleccionados] = useState([]);
  const [reserva, setReserva] = useState({ nombre: '', email: '', telefono: '', fecha: '', invitados: '', direccion: '', detalles: '', tipoEvento: nombreServicio });

  useEffect(() => {
    window.scrollTo(0, 0);
    setMostrarForm(false);
    if (srvData.items) setItemsSeleccionados(srvData.items);

    const unsub = onSnapshot(collection(db, "bloqueos"), (snap) => {
      setDiasCerrados(snap.docs.map(doc => doc.data().fecha));
    });
    return () => unsub();
  }, [nombreServicio, servicios]);

  const enviarForm = async (e) => {
    e.preventDefault();
    if (!reserva.fecha) return alert("Selecciona una fecha");
    setEnviando(true);
    const menuTexto = `\n\n--- MENÚ SELECCIONADO ---\n• ${itemsSeleccionados.join('\n• ')}`;
    const dataFinal = { ...reserva, detalles: (reserva.detalles || "") + menuTexto, estado: 'pendiente', fechaRegistro: new Date().toLocaleString() };
    try {
      await addDoc(collection(db, "reservas"), dataFinal);
      await emailjs.send('service_skm23ep', 'template_vhlomqs', dataFinal, '56AEmrh5uSxllA5ot');
      alert("¡Enviado con éxito!");
      navigate('/');
    } catch (err) { alert("Error al enviar"); } finally { setEnviando(false); }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 pb-20">
      <button onClick={() => navigate('/')} className="mb-8 text-[10px] font-bold uppercase tracking-widest text-[#c4b198]">← Volver</button>

      {/* PASO 1: MENÚ */}
      <section className="bg-white rounded-[3rem] p-8 md:p-12 shadow-sm border border-[#efe4d5] mb-6">
        <h2 className="text-4xl font-serif text-[#c1a57d] text-center mb-10 uppercase">{nombreServicio}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start mb-10">
          <img src={srvData.img ? `/img/${srvData.img}` : '/logo.png'} className="rounded-[2.5rem] w-full h-80 object-cover shadow-md" />
          <div className="space-y-4">
            <h3 className="text-xl font-serif text-[#c1a57d] italic">Arma tu Menú:</h3>
            {srvData.items?.map((item, idx) => (
              <label key={idx} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${itemsSeleccionados.includes(item) ? 'bg-[#fcf8f0] border-[#c1a57d]' : 'bg-white opacity-50'}`}>
                <input type="checkbox" checked={itemsSeleccionados.includes(item)} onChange={() => setItemsSeleccionados(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item])} className="accent-[#c1a57d]" />
                <span className="text-sm font-medium">{item}</span>
              </label>
            ))}
          </div>
        </div>
        {!mostrarForm && (
          <div className="text-center border-t pt-8">
            <button onClick={() => { setMostrarForm(true); setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100); }} className="px-12 py-5 bg-[#c1a57d] text-white font-bold rounded-2xl uppercase tracking-widest">Siguiente: Datos de Contacto →</button>
          </div>
        )}
      </section>

      {/* PASO 2: DATOS */}
      {mostrarForm && (
        <section className="bg-white rounded-[3rem] p-8 md:p-12 shadow-sm border border-[#efe4d5] animate-in fade-in duration-700">
          <form onSubmit={enviarForm} className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-4">
              <input type="text" placeholder="Nombre" required className="w-full p-4 bg-[#fcf8f0] rounded-2xl outline-none" onChange={e => setReserva({...reserva, nombre: e.target.value})} />
              <input type="email" placeholder="E-mail" required className="w-full p-4 bg-[#fcf8f0] rounded-2xl outline-none" onChange={e => setReserva({...reserva, email: e.target.value})} />
              <input type="tel" placeholder="WhatsApp" required className="w-full p-4 bg-[#fcf8f0] rounded-2xl outline-none" onChange={e => setReserva({...reserva, telefono: e.target.value})} />
              <input type="number" placeholder="Invitados" required className="w-full p-4 bg-[#fcf8f0] rounded-2xl outline-none" onChange={e => setReserva({...reserva, invitados: e.target.value})} />
              <input type="text" placeholder="Dirección del evento" required className="w-full p-4 bg-[#fcf8f0] rounded-2xl outline-none" onChange={e => setReserva({...reserva, direccion: e.target.value})} />
              <textarea placeholder="Detalles extra" rows="3" className="w-full p-4 bg-[#fcf8f0] rounded-2xl outline-none" onChange={e => setReserva({...reserva, detalles: e.target.value})}></textarea>
            </div>
            <div className="flex flex-col items-center">
              <Calendar onChange={(val) => setReserva({...reserva, fecha: val.toISOString().split('T')[0]})} minDate={new Date()} tileDisabled={({date}) => diasCerrados.includes(date.toISOString().split('T')[0])} className="rounded-2xl border-none mb-6" />
              <button type="submit" disabled={enviando} className="w-full py-5 bg-[#c1a57d] text-white font-bold rounded-2xl uppercase tracking-widest">{enviando ? 'Enviando...' : 'Solicitar Cotización'}</button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}

export default DetalleServicio;