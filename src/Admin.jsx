import { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, doc, deleteDoc, onSnapshot, updateDoc, addDoc, query, orderBy } from 'firebase/firestore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; 

function Admin({ volver }) {
  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [reservaParaCotizar, setReservaParaCotizar] = useState(null);
  const [servicios, setServicios] = useState([]);
  const [nuevoSrv, setNuevoSrv] = useState("");

  // Estado para la cotización: Precios + Glosa personalizada
  const [precios, setPrecios] = useState({ pPersona: 0, transporte: 0, extras: 0, glosa: '' });

  // 1. CARGAR DATOS EN TIEMPO REAL
  useEffect(() => {
    // Escuchar reservas
    const qR = query(collection(db, "reservas"), orderBy("fechaRegistro", "desc"));
    const unsubR = onSnapshot(qR, (snap) => {
      setReservas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setCargando(false);
    });

    // Escuchar servicios (Tipos de evento)
    const unsubS = onSnapshot(collection(db, "servicios"), (snap) => {
      setServicios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubR(); unsubS(); };
  }, []);

  // 2. FUNCIONES DE GESTIÓN
  const actualizarEstado = async (id, nuevoEstado) => {
    try {
      await updateDoc(doc(db, "reservas", id), { estado: nuevoEstado });
    } catch (error) { console.error("Error al actualizar:", error); }
  };

  const agregarServicio = async () => {
    if (nuevoSrv.trim() === "") return;
    try {
      await addDoc(collection(db, "servicios"), { nombre: nuevoSrv });
      setNuevoSrv("");
    } catch (error) { alert("Error al agregar: " + error.message); }
  };

  const eliminarServicio = async (id) => {
    if (window.confirm("¿Eliminar este servicio de la lista?")) {
      await deleteDoc(doc(db, "servicios", id));
    }
  };

  // 3. GENERADOR DE PDF
  const generarPDFOficial = (res, valores) => {
    try {
      const docPDF = new jsPDF();
      const gold = [193, 165, 125];

      docPDF.setFont("times", "bold");
      docPDF.setFontSize(22);
      docPDF.setTextColor(gold[0], gold[1], gold[2]);
      docPDF.text("COTIZACIÓN ROSA PASTEL", 20, 20);
      
      docPDF.setFontSize(9);
      docPDF.setTextColor(80);
      docPDF.text(`RUT: 77.492.107-9 | WhatsApp: 56989835783`, 20, 30);

      docPDF.setFillColor(gold[0], gold[1], gold[2]);
      docPDF.rect(20, 40, 170, 7, 'F');
      docPDF.setTextColor(255);
      docPDF.text("DATOS DEL CLIENTE", 25, 45);

      docPDF.setTextColor(0);
      docPDF.text(`Nombre: ${res.nombre}`, 20, 55);
      docPDF.text(`Evento: ${res.tipoEvento} | Fecha: ${res.fecha}`, 20, 61);
      
      const glosaFinal = valores.glosa || res.detalles || 'Servicio de banquetería personalizada.';
      docPDF.setFont("helvetica", "italic");
      docPDF.text(`Descripción: ${glosaFinal}`, 20, 70, { maxWidth: 170 });

      const netoB = (Number(res.invitados) || 0) * (Number(valores.pPersona) || 0);
      const sub = netoB + (Number(valores.transporte) || 0) + (Number(valores.extras) || 0);
      const iva = Math.round(sub * 0.19);
      const total = sub + iva;

      autoTable(docPDF, {
        startY: 85,
        head: [['DESCRIPCIÓN', 'CANT.', 'UNITARIO', 'TOTAL']],
        body: [
          [`SERVICIO ${res.tipoEvento?.toUpperCase()}`, res.invitados, `$${Number(valores.pPersona).toLocaleString('es-CL')}`, `$${netoB.toLocaleString('es-CL')}`],
          ['TRANSPORTE', '1', `$${Number(valores.transporte).toLocaleString('es-CL')}`, `$${Number(valores.transporte).toLocaleString('es-CL')}`],
          ['ADICIONALES', '1', `$${Number(valores.extras).toLocaleString('es-CL')}`, `$${Number(valores.extras).toLocaleString('es-CL')}`],
        ],
        headStyles: { fillColor: gold }
      });

      docPDF.text(`TOTAL: $${total.toLocaleString('es-CL')}`, 190, docPDF.lastAutoTable.finalY + 15, { align: 'right' });
      docPDF.save(`Cotizacion_${res.nombre}.pdf`);

      actualizarEstado(res.id, 'cotizado');
      setReservaParaCotizar(null);
    } catch (err) { alert("Error PDF: " + err.message); }
  };

  if (cargando) return <div className="min-h-screen flex items-center justify-center bg-[#fcf8f0]"><p className="text-[#c1a57d] font-serif text-2xl animate-pulse">Cargando...</p></div>;

  return (
    <div className="min-h-screen bg-[#fcf8f0] p-6 text-[#4a3f35]">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-end mb-10">
          <div>
            <h1 className="text-4xl font-serif text-[#c1a57d]">Panel Rosa Pastel</h1>
            <p className="text-[10px] text-[#c4b198] uppercase font-bold tracking-widest">Gestión interna</p>
          </div>
          <button onClick={volver} className="text-xs font-bold uppercase text-[#c4b198] border-b border-[#c4b198] pb-1">Cerrar Sesión</button>
        </header>

        {/* LISTADO DE COTIZACIONES (Compacto) */}
        <div className="space-y-3 mb-12">
          {reservas.map((res) => (
            <div key={res.id} className="bg-white p-4 rounded-[2rem] border border-[#efe4d5] flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold">{res.nombre}</h2>
                  <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold uppercase ${res.estado === 'confirmado' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                    {res.estado || 'pendiente'}
                  </span>
                </div>
                <p className="text-[10px] text-[#c4b198] font-bold uppercase">{res.fecha} • {res.invitados} pers • {res.tipoEvento}</p>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setReservaParaCotizar(res)} className="bg-[#fcf8f0] text-[#c1a57d] px-4 py-2 rounded-xl text-[10px] font-bold uppercase hover:bg-[#c1a57d] hover:text-white transition-all">
                  Cotizar
                </button>
                {res.estado === 'cotizado' && (
                  <button onClick={() => actualizarEstado(res.id, 'confirmado')} className="bg-green-500 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase shadow-lg shadow-green-100">Aceptar</button>
                )}
                <button onClick={async () => { if(window.confirm("¿Eliminar?")) await deleteDoc(doc(db, "reservas", res.id)); }} className="p-2 text-red-200 hover:text-red-400">🗑️</button>
              </div>
            </div>
          ))}
        </div>

        {/* GESTIÓN DE SERVICIOS DINÁMICOS */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-[#efe4d5]">
          <h3 className="text-xl font-serif text-[#c1a57d] mb-4">Servicios en Formulario</h3>
          <div className="flex gap-2 mb-6">
            <input value={nuevoSrv} onChange={(e)=>setNuevoSrv(e.target.value)} placeholder="Nuevo tipo de evento..." className="flex-1 p-3 bg-[#fcf8f0] rounded-xl outline-none text-sm" />
            <button onClick={agregarServicio} className="bg-[#c1a57d] text-white px-6 rounded-xl font-bold text-xs">AÑADIR</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {servicios.map(s => (
              <div key={s.id} className="bg-[#fcf8f0] px-3 py-1.5 rounded-full flex items-center gap-2 border border-[#efe4d5]">
                <span className="text-[11px] font-bold">{s.nombre}</span>
                <button onClick={()=>eliminarServicio(s.id)} className="text-red-300">✕</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MODAL DE PRECIOS + GLOSA */}
      {reservaParaCotizar && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[3rem] p-10 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-serif text-[#c1a57d] mb-6">Presupuesto</h3>
            <div className="space-y-4">
              <input type="number" placeholder="Precio x Persona ($)" className="w-full p-4 bg-[#fcf8f0] rounded-2xl outline-none" onChange={(e)=>setPrecios({...precios, pPersona: e.target.value})} />
              <input type="number" placeholder="Transporte / Logística ($)" className="w-full p-4 bg-[#fcf8f0] rounded-2xl outline-none" onChange={(e)=>setPrecios({...precios, transporte: e.target.value})} />
              <input type="number" placeholder="Gastos Extras ($)" className="w-full p-4 bg-[#fcf8f0] rounded-2xl outline-none" onChange={(e)=>setPrecios({...precios, extras: e.target.value})} />
              <textarea placeholder="Descripción para el PDF (Glosa)..." className="w-full p-4 bg-[#fcf8f0] rounded-2xl outline-none text-sm" rows="3" onChange={(e)=>setPrecios({...precios, glosa: e.target.value})}></textarea>
            </div>
            <div className="mt-8 flex gap-4">
              <button onClick={()=>setReservaParaCotizar(null)} className="flex-1 text-[10px] font-bold uppercase text-[#c4b198]">Cancelar</button>
              <button onClick={() => generarPDFOficial(reservaParaCotizar, precios)} className="flex-1 py-4 bg-[#c1a57d] text-white rounded-2xl font-bold text-[10px] uppercase shadow-lg shadow-[#c1a57d]/30">Descargar PDF</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Admin;