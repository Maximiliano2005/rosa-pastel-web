import { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, getDocs, orderBy, query, doc, deleteDoc, updateDoc } from 'firebase/firestore';

function Admin({ volver }) {
  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);

  const obtenerReservas = async () => {
    try {
      const q = query(collection(db, "reservas"), orderBy("fechaRegistro", "desc"));
      const querySnapshot = await getDocs(q);
      const listaReservas = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setReservas(listaReservas);
    } catch (error) {
      console.error("Error al obtener reservas:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    obtenerReservas();
  }, []);

  // --- NUEVA FUNCIÓN PARA ACEPTAR/CONFIRMAR CITA ---
  const confirmarReserva = async (res) => {
    if (window.confirm(`¿Confirmar evento para ${res.nombre}?`)) {
      try {
        const reservaRef = doc(db, "reservas", res.id);
        await updateDoc(reservaRef, { estado: 'confirmado' });
        
        // 1. Definimos el mensaje aquí mismo para evitar el error "not defined"
        const mensajeConfirmacion = `🌸 *¡Reserva Confirmada en Rosa Pastel!* 🌸\n\n` +
          `Hola ${res.nombre}, te confirmamos que tu reserva para el día *${res.fecha}* ha sido aceptada.\n\n` +
          `📍 *Lugar:* ${res.direccion}\n` +
          `👥 *Invitados:* ${res.invitados}\n\n` +
          `¡Estamos felices de ser parte de tu evento! Nos contactaremos pronto para los últimos detalles.`;

        // 2. Usamos encodeURIComponent para que los emojis y espacios viajen perfectos
        const urlWS = `https://wa.me/${res.telefono.replace(/\+/g, '')}?text=${encodeURIComponent(mensajeConfirmacion)}`;
        
        alert("Reserva confirmada. Se abrirá WhatsApp para avisar al cliente.");
        window.open(urlWS, '_blank');
        
        obtenerReservas(); // Recarga la tabla
      } catch (error) {
        alert("Error al confirmar: " + error.message);
      }
    }
  };

  const eliminarReserva = async (id) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar esta reserva?")) {
      try {
        await deleteDoc(doc(db, "reservas", id));
        setReservas(reservas.filter(res => res.id !== id));
      } catch (error) {
        alert("Error al eliminar: " + error.message);
      }
    }
  };

  if (cargando) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <p className="text-pink-600 font-bold animate-pulse">Cargando panel de control...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8 text-black font-sans">
      <div className="max-w-6xl mx-auto">
        
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-pink-600">Panel Rosa Pastel</h1>
            <p className="text-gray-500 text-sm">Gestión de cupos y disponibilidad</p>
          </div>
          <div className="flex gap-2">
            <button onClick={obtenerReservas} className="bg-white border border-pink-500 text-pink-500 px-4 py-2 rounded-xl hover:bg-pink-50 font-semibold">
              🔄 Actualizar
            </button>
            <button onClick={volver} className="bg-pink-500 text-white px-4 py-2 rounded-xl hover:bg-pink-600 shadow-md font-semibold text-black">
              🚪 Volver al Formulario
            </button>
          </div>
        </div>

        <div className="overflow-x-auto bg-white rounded-3xl shadow-xl border border-pink-100">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-pink-500 text-white">
                <th className="p-4 font-semibold uppercase text-xs">Fecha Evento</th>
                <th className="p-4 font-semibold uppercase text-xs">Cliente</th>
                <th className="p-4 font-semibold uppercase text-xs">Invitados</th>
                <th className="p-4 font-semibold uppercase text-xs">WhatsApp</th>
                <th className="p-4 font-semibold uppercase text-xs">Cupo</th>
                <th className="p-4 font-semibold uppercase text-xs">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reservas.length > 0 ? (
                reservas.map((res) => (
                  <tr key={res.id} className="hover:bg-pink-50 transition-colors">
                    <td className="p-4 font-bold text-pink-600">{res.fecha}</td>
                    <td className="p-4">
                      <div className="font-medium">{res.nombre}</div>
                      <div className="text-xs text-gray-400">{res.tipoEvento}</div>
                    </td>
                    <td className="p-4">{res.invitados} paxs</td>
                    <td className="p-4">
                      <a href={`https://wa.me/${res.telefono?.replace(/\+/g, '')}`} target="_blank" className="text-blue-500 font-semibold underline">
                        {res.telefono}
                      </a>
                    </td>
                    <td className="p-4">
                      {res.estado === 'confirmado' ? (
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase">
                          ✅ Cupo Lleno
                        </span>
                      ) : (
                        <button 
                          onClick={() => confirmarReserva(res)} // Cambia res.id por res (el objeto completo)
                          className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-[10px] font-bold hover:bg-yellow-200 uppercase"
                        >
                          Pendiente - Aceptar?
                        </button>
                      )}
                    </td>
                    <td className="p-4">
                      <button onClick={() => eliminarReserva(res.id)} className="text-red-400 hover:text-red-600 transition p-2">
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="6" className="p-10 text-center text-gray-400 italic">No hay registros.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Admin;