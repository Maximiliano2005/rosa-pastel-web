import { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, doc, deleteDoc, onSnapshot, updateDoc, addDoc, query, orderBy } from 'firebase/firestore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; 

function Admin({ volver }) {
  const [reservas, setReservas] = useState([]);
  const [busqueda, setBusqueda] = useState(""); // Nuevo: Para el buscador
  const [cargando, setCargando] = useState(true);
  const [reservaParaCotizar, setReservaParaCotizar] = useState(null);
  const [servicios, setServicios] = useState([]);
  const [nuevoSrv, setNuevoSrv] = useState("");
  const [precios, setPrecios] = useState({ pPersona: 0, transporte: 0, extras: 0, menu: '' });

  useEffect(() => {
    const qR = query(collection(db, "reservas"), orderBy("fechaRegistro", "desc"));
    const unsubR = onSnapshot(qR, (snap) => {
      setReservas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setCargando(false);
    });
    const unsubS = onSnapshot(collection(db, "servicios"), (snap) => {
      setServicios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubR(); unsubS(); };
  }, []);

  // --- NUEVO: Lógica de Estadísticas ---
  const stats = reservas.reduce((acc, res) => {
    acc.total++;
    if (res.estado === 'confirmado') acc.confirmados++;
    if (res.estado === 'cotizado') acc.cotizados++;
    return acc;
  }, { total: 0, confirmados: 0, cotizados: 0 });

  // --- NUEVO: Filtrado por búsqueda ---
  const reservasFiltradas = reservas.filter(res => 
    res.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const actualizarEstado = async (id, nuevoEstado) => {
    try { await updateDoc(doc(db, "reservas", id), { estado: nuevoEstado }); } catch (e) { console.error(e); }
  };

  const enviarEmailManual = (res) => {
    const asunto = encodeURIComponent(`Presupuesto Rosa Pastel - ${res.tipoEvento}`);
    const cuerpo = encodeURIComponent(`Hola ${res.nombre},\n\nAdjuntamos la cotización detallada. Quedamos atentos,\nRosa Pastel.`);
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${res.email}&su=${asunto}&body=${cuerpo}`, '_blank');
  };

  const generarPDFOficial = (res, valores) => {
    const docPDF = new jsPDF();
    const gold = [193, 165, 125];
    const img = new Image();
    img.src = '/logo.png'; 

    img.onload = () => {
      docPDF.addImage(img, 'PNG', 160, 10, 30, 30);
      docPDF.setFont("times", "bold").setFontSize(22).setTextColor(gold[0], gold[1], gold[2]);
      docPDF.text("COTIZACIÓN ROSA PASTEL", 20, 25);
      docPDF.setFontSize(9).setTextColor(80);
      docPDF.text(`RUT: 77.492.107-9 | WhatsApp: +569 8983 5783`, 20, 32);

      docPDF.setFillColor(gold[0], gold[1], gold[2]);
      docPDF.rect(20, 50, 170, 7, 'F');
      docPDF.setTextColor(255).setFont("helvetica", "bold").text("DATOS DEL CLIENTE", 25, 55);

      docPDF.setTextColor(0).setFontSize(10).setFont("helvetica", "normal");
      docPDF.text(`Nombre: ${res.nombre}`, 20, 65);
      docPDF.text(`Evento: ${res.tipoEvento} | Fecha: ${res.fecha}`, 20, 71);

      docPDF.setFont("helvetica", "bold").text("EL SERVICIO INCLUYE:", 20, 85);
      docPDF.setFont("helvetica", "normal").setFontSize(9);
      const lineasMenu = docPDF.splitTextToSize(valores.menu || "Servicio estándar.", 160);
      docPDF.text(lineasMenu, 25, 91);

      const netoB = (Number(res.invitados) || 0) * (Number(valores.pPersona) || 0);
      const sub = netoB + (Number(valores.transporte) || 0) + (Number(valores.extras) || 0);
      const total = sub + Math.round(sub * 0.19);

      autoTable(docPDF, {
        startY: 95 + (lineasMenu.length * 5),
        head: [['DESCRIPCIÓN', 'CANT.', 'UNITARIO', 'TOTAL']],
        body: [
          [`SERVICIO ${res.tipoEvento.toUpperCase()}`, res.invitados, `$${Number(valores.pPersona).toLocaleString('es-CL')}`, `$${netoB.toLocaleString('es-CL')}`],
          ['TRANSPORTE Y LOGÍSTICA', '1', `$${Number(valores.transporte).toLocaleString('es-CL')}`, `$${Number(valores.transporte).toLocaleString('es-CL')}`],
          ['OTROS / ADICIONALES', '1', `$${Number(valores.extras).toLocaleString('es-CL')}`, `$${Number(valores.extras).toLocaleString('es-CL')}`],
        ],
        headStyles: { fillColor: gold }
      });

      docPDF.text(`TOTAL FINAL: $${total.toLocaleString('es-CL')}`, 190, docPDF.lastAutoTable.finalY + 15, { align: 'right' });
      docPDF.save(`Cotizacion_${res.nombre}.pdf`);
      actualizarEstado(res.id, 'cotizado');
      setReservaParaCotizar(null);
    };
  };

  if (cargando) return <div className="min-h-screen flex items-center justify-center bg-[#fcf8f0]"><p className="text-[#c1a57d] animate-pulse">Cargando...</p></div>;

  return (
    <div className="min-h-screen bg-[#fcf8f0] p-6 text-[#4a3f35]">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-10">
          <h1 className="text-4xl font-serif text-[#c1a57d]">Panel Rosa Pastel</h1>
          <button onClick={volver} className="text-xs font-bold uppercase text-[#c4b198] border-b border-[#c4b198]">Cerrar Sesión</button>
        </header>

        {/* DASHBOARD DE STATS */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-4 rounded-3xl border border-[#efe4d5] text-center">
            <p className="text-[10px] font-bold text-[#c4b198] uppercase">Recibidos</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-white p-4 rounded-3xl border border-[#efe4d5] text-center">
            <p className="text-[10px] font-bold text-[#c4b198] uppercase">Cotizados</p>
            <p className="text-2xl font-bold text-blue-400">{stats.cotizados}</p>
          </div>
          <div className="bg-white p-4 rounded-3xl border border-[#efe4d5] text-center border-b-4 border-b-green-400">
            <p className="text-[10px] font-bold text-[#c4b198] uppercase">Confirmados</p>
            <p className="text-2xl font-bold text-green-500">{stats.confirmados}</p>
          </div>
        </div>

        {/* BUSCADOR */}
        <div className="mb-6">
          <input 
            type="text" 
            placeholder="🔍 Buscar cliente por nombre..." 
            className="w-full p-4 bg-white rounded-2xl border border-[#efe4d5] outline-none focus:ring-2 focus:ring-[#c1a57d] transition-all"
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        {/* LISTADO FILTRADO */}
        <div className="space-y-3 mb-10">
          {reservasFiltradas.map((res) => (
            <div key={res.id} className="bg-white p-4 rounded-[1.8rem] border border-[#efe4d5] flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <h2 className="text-lg font-bold">{res.nombre}</h2>
                  <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold uppercase ${res.estado === 'confirmado' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                    {res.estado || 'pendiente'}
                  </span>
                </div>
                <p className="text-[10px] text-[#c4b198] font-bold uppercase">{res.fecha} • {res.invitados} pers • {res.tipoEvento}</p>
              </div>

              <div className="flex gap-2">
                <button onClick={() => {setReservaParaCotizar(res); setPrecios({...precios, menu: res.detalles || ''})}} className="bg-[#fcf8f0] text-[#c1a57d] px-4 py-2 rounded-xl text-[9px] font-bold uppercase">1. Cotizar</button>
                {res.estado === 'cotizado' && <button onClick={() => enviarEmailManual(res)} className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-[9px] font-bold uppercase">2. Gmail</button>}
                {res.estado === 'cotizado' && <button onClick={() => actualizarEstado(res.id, 'confirmado')} className="bg-green-500 text-white px-4 py-2 rounded-xl text-[9px] font-bold uppercase">3. Aceptar</button>}
                <button onClick={async () => { if(window.confirm("¿Eliminar?")) await deleteDoc(doc(db, "reservas", res.id)); }} className="p-2 text-red-200">🗑️</button>
              </div>
            </div>
          ))}
          {reservasFiltradas.length === 0 && <p className="text-center text-[#c4b198] italic text-sm py-10">No se encontraron clientes con ese nombre...</p>}
        </div>

        {/* GESTIÓN DE SERVICIOS */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-[#efe4d5]">
          <h3 className="text-xl font-serif text-[#c1a57d] mb-4">Servicios Disponibles</h3>
          <div className="flex gap-2 mb-4">
            <input value={nuevoSrv} onChange={(e)=>setNuevoSrv(e.target.value)} placeholder="Ej: Cena Gala" className="flex-1 p-3 bg-[#fcf8f0] rounded-xl outline-none text-sm" />
            <button onClick={async () => { if(nuevoSrv) { await addDoc(collection(db, "servicios"), { nombre: nuevoSrv }); setNuevoSrv(""); } }} className="bg-[#c1a57d] text-white px-6 rounded-xl font-bold text-xs uppercase">Añadir</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {servicios.map(s => (
              <div key={s.id} className="bg-[#fcf8f0] px-3 py-1.5 rounded-full flex items-center gap-2 border border-[#efe4d5]">
                <span className="text-[11px] font-bold">{s.nombre}</span>
                <button onClick={()=>deleteDoc(doc(db,"servicios",s.id))} className="text-red-300">✕</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MODAL */}
      {reservaParaCotizar && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[3rem] p-8 max-w-lg w-full shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-2xl font-serif text-[#c1a57d] mb-6">Presupuesto para {reservaParaCotizar.nombre}</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="Precio x Persona" className="p-4 bg-[#fcf8f0] rounded-2xl outline-none" onChange={(e)=>setPrecios({...precios, pPersona: e.target.value})} />
                <input type="number" placeholder="Transporte" className="p-4 bg-[#fcf8f0] rounded-2xl outline-none" onChange={(e)=>setPrecios({...precios, transporte: e.target.value})} />
              </div>
              <textarea placeholder="Detalle del Menú..." className="w-full p-4 bg-[#fcf8f0] rounded-2xl outline-none text-sm" rows="6" defaultValue={precios.menu} onChange={(e)=>setPrecios({...precios, menu: e.target.value})}></textarea>
              <input type="number" placeholder="Extras ($)" className="w-full p-4 bg-[#fcf8f0] rounded-2xl outline-none" onChange={(e)=>setPrecios({...precios, extras: e.target.value})} />
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