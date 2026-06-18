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
  const [diasCerrados, setDiasCerrados] = useState([]);
  const [enviando, setEnviando] = useState(false);
  
  // Control de pasos
  const [mostrarForm, setMostrarForm] = useState(false);

  const srvData = servicios.find(s => s.nombre === nombreServicio) || { items: [], img: '', desc: '' };
  
  // El menú seleccionado siempre empieza vacío []
  const [itemsSeleccionados, setItemsSeleccionados] = useState([]);
  const [reserva, setReserva] = useState({
    nombre: '', email: '', telefono: '', 
    fecha: '', invitados: '', direccion: '', detalles: '',
    tipoEvento: nombreServicio
  });

  useEffect(() => {
    // 1. Forzar scroll al inicio de la página
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    
    // 2. Ocultar el formulario (Paso 2) para que solo vea el menú
    setMostrarForm(false);
    
    // 3. Al cambiar de servicio o entrar, el menú se resetea a VACÍO
    setItemsSeleccionados([]);
    
    const unsub = onSnapshot(collection(db, "bloqueos"), (snap) => {
      setDiasCerrados(snap.docs.map(doc => doc.data().fecha));
    });
    return () => unsub();
  }, [nombreServicio, servicios]); 

  const handleCheckbox = (item) => {
    setItemsSeleccionados(prev => 
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const enviarForm = async (e) => {
    e.preventDefault();
    if (!reserva.fecha) return alert("Por favor selecciona una fecha en el calendario");
    setEnviando(true);

    // Si no seleccionó nada, mandamos un aviso amigable o texto vacío
    const itemsTexto = itemsSeleccionados.length > 0 
      ? `• ${itemsSeleccionados.join('\n• ')}`
      : 'Ninguno (A coordinar a medida)';

    const menuTexto = `\n\n--- MENÚ SELECCIONADO ---\n${itemsTexto}`;
    const dataFinal = { 
      ...reserva, 
      detalles: (reserva.detalles || "") + menuTexto, 
      estado: 'pendiente', 
      fechaRegistro: new Date().toLocaleString() 
    };

    try {
      // 1. Guardamos la cotización y capturamos la referencia del nuevo documento en Firestore
      const docRef = await addDoc(collection(db, "reservas"), dataFinal);
      
      // 2. Añadimos el ID generado por Firebase al objeto final para EmailJS
      const dataParaEmail = {
        ...dataFinal,
        reserva_id: docRef.id // <-- Variable mágica para usar en la plantilla
      };

      // 3. Enviamos los datos con EmailJS incluyendo la variable reserva_id
      await emailjs.send('service_skm23ep', 'template_vhlomqs', dataParaEmail, '56AEmrh5uSxllA5ot');
      
      alert("¡Solicitud enviada con éxito!");
      navigate('/');
    } catch (err) { 
      alert("Error al enviar"); 
      console.error(err);
    } finally { 
      setEnviando(false); 
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 pb-20">
      <button onClick={() => navigate('/')} className="mb-8 text-[10px] font-bold uppercase tracking-widest text-[#c4b198] hover:text-[#c1a57d]">
        ← Volver al catálogo
      </button>

      {/* PASO 1: MENÚ */}
      <section className="bg-white rounded-[3rem] p-8 md:p-12 shadow-sm border border-[#efe4d5] mb-6">
        <div className="text-center mb-10">
          <span className="text-[10px] font-bold text-[#c1a57d] uppercase tracking-[0.3em]">Paso 1</span>
          <h2 className="text-5xl font-serif text-[#c1a57d] mt-2 mb-4 uppercase">{nombreServicio}</h2>
          <div className="h-1 w-16 bg-[#efe4d5] mx-auto mb-6"></div>
          <p className="text-sm text-[#4a3f35] max-w-xl mx-auto">Elige los productos que deseas incluir en tu banquetería.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start mb-10">
          <img src={srvData.img ? `/img/${srvData.img}` : '/logo.png'} alt={nombreServicio} className="rounded-[2.5rem] w-full h-80 object-cover shadow-md" />
          <div className="space-y-4">
            <h3 className="text-xl font-serif text-[#c1a57d] italic mb-6">Arma tu Menú:</h3>
            <div className="grid grid-cols-1 gap-3">
              {srvData.items && srvData.items.length > 0 ? (
                srvData.items.map((item, idx) => (
                  <label key={idx} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${itemsSeleccionados.includes(item) ? 'bg-[#fcf8f0] border-[#c1a57d] shadow-sm opacity-100' : 'bg-white border-[#efe4d5] opacity-60 hover:opacity-90'}`}>
                    <input type="checkbox" checked={itemsSeleccionados.includes(item)} onChange={() => handleCheckbox(item)} className="w-5 h-5 accent-[#c1a57d] cursor-pointer" />
                    <span className="text-sm font-medium text-[#4a3f35]">{item}</span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-[#4a3f35] italic">Este servicio es a medida. Haz clic abajo para solicitar información.</p>
              )}
            </div>
          </div>
        </div>

        {!mostrarForm && (
          <div className="text-center border-t border-[#fcf8f0] pt-8">
            <button 
              onClick={() => {
                setMostrarForm(true);
                setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
              }}
              className="px-12 py-5 bg-[#c1a57d] text-white font-bold rounded-2xl uppercase tracking-widest shadow-xl hover:bg-[#a68d66] transition-all transform hover:scale-105"
            >
              Siguiente: Datos de Contacto →
            </button>
          </div>
        )}
      </section>

      {/* PASO 2: DATOS */}
      {mostrarForm && (
        <section className="bg-white rounded-[3rem] p-8 md:p-12 shadow-sm border border-[#efe4d5] animate-in fade-in slide-in-from-bottom-10 duration-700">
          <div className="text-center mb-10">
            <span className="text-[10px] font-bold text-[#c1a57d] uppercase tracking-[0.3em]">Paso 2</span>
            <h3 className="text-3xl font-serif text-[#c1a57d] mt-2">Detalles de la Reserva</h3>
            <button onClick={() => setMostrarForm(false)} className="text-[9px] text-red-300 font-bold uppercase mt-2 underline">← Volver a editar el menú</button>
          </div>

          <form onSubmit={enviarForm} className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-4">
              <input type="text" placeholder="Nombre completo" required className="w-full p-4 bg-[#fcf8f0] rounded-2xl outline-none" onChange={e => setReserva({...reserva, nombre: e.target.value})} />
              <input type="email" placeholder="Correo electrónico" required className="w-full p-4 bg-[#fcf8f0] rounded-2xl outline-none" onChange={e => setReserva({...reserva, email: e.target.value})} />
              <input type="tel" placeholder="WhatsApp" required className="w-full p-4 bg-[#fcf8f0] rounded-2xl outline-none" onChange={e => setReserva({...reserva, telefono: e.target.value})} />
              <input type="number" placeholder="N° de Invitados" required className="w-full p-4 bg-[#fcf8f0] rounded-2xl outline-none" onChange={e => setReserva({...reserva, invitados: e.target.value})} />
              <input type="text" placeholder="Dirección exacta del evento" required className="w-full p-4 bg-[#fcf8f0] rounded-2xl outline-none border border-[#c1a57d]/20" onChange={e => setReserva({...reserva, direccion: e.target.value})} />
              <textarea placeholder="¿Algún requerimiento especial?" rows="3" className="w-full p-4 bg-[#fcf8f0] rounded-2xl outline-none text-sm" onChange={e => setReserva({...reserva, detalles: e.target.value})}></textarea>
            </div>

            <div className="flex flex-col items-center">
              <div className="bg-[#fcf8f0] p-4 rounded-3xl border border-[#efe4d5] shadow-inner mb-6">
                <Calendar 
                  onChange={(val) => setReserva({...reserva, fecha: val.toISOString().split('T')[0]})}
                  minDate={new Date()}
                  tileDisabled={({date}) => diasCerrados.includes(date.toISOString().split('T')[0])}
                  className="border-none bg-transparent scale-90"
                />
              </div>
              <button type="submit" disabled={enviando} className="w-full py-5 bg-[#c1a57d] text-white font-bold rounded-2xl uppercase tracking-widest shadow-lg">
                {enviando ? 'Enviando...' : 'Solicitar Cotización'}
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}

export default DetalleServicio;