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

  // Traemos los datos del servicio (con valores por defecto por si acaso)
  const srvData = servicios.find(s => s.nombre === nombreServicio) || { 
    items: [], 
    img: '', 
    desc: '', 
    minPersonas: 10, 
    permiteEleccion: false,
    exigeMinimo: true // Por defecto asumimos que sí exige
  };
  
  // El menú seleccionado siempre empieza vacío []
  const [itemsSeleccionados, setItemsSeleccionados] = useState([]);
  
  // AGREGAMOS "hora: ''" al estado inicial
  const [reserva, setReserva] = useState({
    nombre: '', email: '', telefono: '', 
    fecha: '', hora: '', invitados: '', direccion: '', detalles: '',
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

    // VALIDACIÓN: Revisar el mínimo de personas SOLO si el servicio lo exige
    if (srvData.exigeMinimo !== false) {
      const minRequerido = srvData.minPersonas || 1;
      if (Number(reserva.invitados) < minRequerido) {
        return alert(`Lo sentimos, el mínimo requerido para el servicio "${nombreServicio}" es de ${minRequerido} personas.`);
      }
    }

    setEnviando(true);

    // LÓGICA DE MENÚ: Si es a elección, mandamos los marcados. Si es fijo, mandamos todos.
    let itemsFinales = [];
    if (srvData.permiteEleccion) {
      itemsFinales = itemsSeleccionados;
    } else {
      itemsFinales = srvData.items || [];
    }

    const itemsTexto = itemsFinales.length > 0 
      ? `• ${itemsFinales.join('\n• ')}`
      : 'Ninguno (A coordinar a medida)';

    const menuTexto = `\n\n--- MENÚ SELECCIONADO ---\n${itemsTexto}`;
    
    // Armamos la data final. Si no exige mínimo, ponemos "No aplica"
    const dataFinal = { 
      ...reserva, 
      invitados: srvData.exigeMinimo !== false ? reserva.invitados : "No aplica",
      detalles: (reserva.detalles || "") + menuTexto, 
      estado: 'pendiente', 
      fechaRegistro: new Date().toLocaleString() 
    };

    try {
      const docRef = await addDoc(collection(db, "reservas"), dataFinal);
      
      const dataParaEmail = {
        ...dataFinal,
        reserva_id: docRef.id 
      };

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
          <p className="text-sm text-[#4a3f35] max-w-xl mx-auto">
            {srvData.permiteEleccion ? "Elige los productos que deseas incluir en tu banquetería." : "Revisa el detalle de lo que incluye este servicio."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start mb-10">
          <img src={srvData.img ? `/img/${srvData.img}` : '/logo.png'} alt={nombreServicio} className="rounded-[2.5rem] w-full h-80 object-cover shadow-md" />
          <div className="space-y-4">
            <h3 className="text-xl font-serif text-[#c1a57d] italic mb-6">
              {srvData.permiteEleccion ? 'Arma tu Menú:' : 'El servicio incluye:'}
            </h3>
            
            <div className="grid grid-cols-1 gap-3">
              {srvData.items && srvData.items.length > 0 ? (
                srvData.permiteEleccion ? (
                  srvData.items.map((item, idx) => (
                    <label key={idx} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${itemsSeleccionados.includes(item) ? 'bg-[#fcf8f0] border-[#c1a57d] shadow-sm opacity-100' : 'bg-white border-[#efe4d5] opacity-60 hover:opacity-90'}`}>
                      <input type="checkbox" checked={itemsSeleccionados.includes(item)} onChange={() => handleCheckbox(item)} className="w-5 h-5 accent-[#c1a57d] cursor-pointer" />
                      <span className="text-sm font-medium text-[#4a3f35]">{item}</span>
                    </label>
                  ))
                ) : (
                  <div className="bg-[#fcf8f0] p-6 rounded-2xl border border-[#efe4d5]">
                    <ul className="space-y-3">
                      {srvData.items.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-sm font-medium text-[#4a3f35]">
                          <span className="text-[#c1a57d] font-bold">✔</span> 
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
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
              
              {/* BLOQUE DIVIDIDO: INVITADOS Y HORA */}
              <div className="flex gap-4">
                
                {/* CONDICIONAL: Solo mostrar "Invitados" si el servicio lo exige */}
                {srvData.exigeMinimo !== false && (
                  <div className="flex-1">
                    <input 
                      type="number" 
                      placeholder={`Invitados`} 
                      required 
                      min={srvData.minPersonas || 1}
                      className="w-full p-4 bg-[#fcf8f0] rounded-2xl outline-none" 
                      onChange={e => setReserva({...reserva, invitados: e.target.value})} 
                    />
                    <p className="text-[10px] font-bold text-[#c4b198] ml-2 mt-1 uppercase">Mínimo: {srvData.minPersonas || 1}</p>
                  </div>
                )}
                
                {/* CAMPO DE HORA (Se expande solo si desaparece Invitados) */}
                <div className="flex-1">
                  <input 
                    type="time" 
                    required 
                    className="w-full p-4 bg-[#fcf8f0] rounded-2xl outline-none text-[#4a3f35]" 
                    onChange={e => setReserva({...reserva, hora: e.target.value})} 
                  />
                  <p className="text-[10px] font-bold text-[#c4b198] ml-2 mt-1 uppercase">Hora de Inicio</p>
                </div>
              </div>

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