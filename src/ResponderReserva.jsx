import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // <-- CAMBIO AQUÍ: Ahora usamos useParams
import { db } from './firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import emailjs from '@emailjs/browser';

function ResponderReserva() {
  // <-- CAMBIO AQUÍ: Capturamos 'estado' e 'id' directamente de la URL
  const { estado, id } = useParams(); 
  const navigate = useNavigate();
  
  const idReserva = id;
  const estadoInicial = estado; // 'aceptado' o 'rechazado'

  const [reserva, setReserva] = useState(null);
  const [comentario, setComentario] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function obtenerReserva() {
      if (!idReserva) {
        setCargando(false);
        return;
      }
      try {
        const docRef = doc(db, "reservas", idReserva);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setReserva({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (error) {
        console.error("Error obteniendo reserva:", error);
      } finally {
        setCargando(false);
      }
    }
    obtenerReserva();
  }, [idReserva]);

  const handleResponder = async (e) => {
    e.preventDefault();
    if (!reserva) return;
    setProcesando(true);

    const nuevoEstado = estadoInicial === 'aceptado' ? 'confirmado' : 'rechazado';
    const docRef = doc(db, "reservas", idReserva);

    try {
      // 1. Actualizar Firebase con el nuevo estado y el comentario del cliente
      await updateDoc(docRef, {
        estado: nuevoEstado,
        comentarioCliente: comentario,
        fechaRespuesta: new Date().toLocaleString()
      });

      // 2. Enviar correos de notificación mediante EmailJS
      // ID del Servicio, ID de la Plantilla de respuesta, Datos, Public Key
      const infoNotificacion = {
        cliente_nombre: reserva.nombre,
        cliente_email: reserva.email,
        tipo_evento: reserva.tipoEvento,
        fecha_evento: reserva.fecha,
        estado_final: nuevoEstado === 'confirmado' ? 'ACEPTADA y Agendada' : 'RECHAZADA',
        comentario_cliente: comentario || "Sin comentarios adicionales."
      };

      // Correo para tu tía notificando la decisión
      await emailjs.send('service_skm23ep', 'TU_PLANTILLA_AVISO_TIA', infoNotificacion, '56AEmrh5uSxllA5ot');

      if (nuevoEstado === 'confirmado') {
        // Opcional: Correo de confirmación final para el cliente indicando que ya se agendó
        await emailjs.send('service_skm23ep', 'TU_PLANTILLA_CONFIRMACION_CLIENTE', infoNotificacion, '56AEmrh5uSxllA5ot');
        alert("¡Excelente! Tu reserva ha sido confirmada y agendada automáticamente.");
      } else {
        alert("Gracias por informarnos. La cotización ha sido cancelada.");
      }

      navigate('/');
    } catch (error) {
      alert("Hubo un problema al procesar tu respuesta.");
      console.error(error);
    } finally {
      setProcesando(false);
    }
  };

  if (cargando) return <div className="min-h-screen flex items-center justify-center bg-[#fcf8f0] text-[#c1a57d]">Cargando...</div>;
  if (!reserva) return <div className="min-h-screen flex items-center justify-center bg-[#fcf8f0] text-[#4a3f35]">Enlace no válido o expirado.</div>;

  return (
    <div className="min-h-screen bg-[#fcf8f0] flex items-center justify-center py-12 px-4 text-[#4a3f35]">
      <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-md border border-[#efe4d5] max-w-xl w-full text-center">
        <span className="text-[10px] font-bold text-[#c1a57d] uppercase tracking-[0.3em]">Confirmación</span>
        <h2 className="text-3xl font-serif text-[#c1a57d] mt-2 mb-6">
          {estadoInicial === 'aceptado' ? '¡Vas a aceptar la cotización!' : 'Rechazar cotización'}
        </h2>
        
        <p className="text-sm mb-6 leading-relaxed">
          Hola <strong>{reserva.nombre}</strong>, estás respondiendo a la cotización para tu evento de <strong>{reserva.tipoEvento}</strong> agendado para el día <strong>{reserva.fecha}</strong>.
        </p>

        <form onSubmit={handleResponder} className="space-y-6">
          <div className="text-left">
            <label className="text-xs font-bold uppercase tracking-wider text-[#c4b198] block mb-2">
              ¿Quieres agregar algún comentario o detalle extra? (Opcional)
            </label>
            <textarea 
              placeholder="Ej: Confirmamos el menú, quedamos atentos al contrato / No se ajusta al presupuesto actual..."
              rows="4" 
              className="w-full p-4 bg-[#fcf8f0] rounded-2xl outline-none text-sm border border-transparent focus:border-[#c1a57d]/30 resize-none"
              value={comentario}
              onChange={e => setComentario(e.target.value)}
            ></textarea>
          </div>

          <button 
            type="submit" 
            disabled={procesando}
            className={`w-full py-5 text-white font-bold rounded-2xl uppercase tracking-widest shadow-lg transition-all ${
              estadoInicial === 'aceptado' ? 'bg-[#c1a57d] hover:bg-[#a68d66]' : 'bg-red-400 hover:bg-red-500'
            }`}
          >
            {procesando ? 'Procesando...' : estadoInicial === 'aceptado' ? 'Confirmar y Agendar Evento' : 'Enviar Rechazo'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ResponderReserva;