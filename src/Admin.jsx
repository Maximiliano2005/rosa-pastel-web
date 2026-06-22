import { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, doc, deleteDoc, onSnapshot, updateDoc, addDoc, query, orderBy } from 'firebase/firestore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; 
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

// Función para transformar AAAA-MM-DD a DD/MM/AAAA
const formatearFecha = (fechaISO) => {
  if (!fechaISO) return '';
  const partes = fechaISO.split('-');
  if (partes.length !== 3) return fechaISO;
  return `${partes[2]}/${partes[1]}/${partes[0]}`; 
};

function Admin({ volver }) {
  const [reservas, setReservas] = useState([]);
  const [busqueda, setBusqueda] = useState(""); 
  const [cargando, setCargando] = useState(true);
  const [reservaParaCotizar, setReservaParaCotizar] = useState(null);
  
  const [servicios, setServicios] = useState([]);
  const [nuevoSrv, setNuevoSrv] = useState("");
  const [servicioEditando, setServicioEditando] = useState(null); 
  const [nuevoItem, setNuevoItem] = useState(""); 

  const [precios, setPrecios] = useState({ pPersona: 0, transporte: 0, extras: 0, menu: '', direccion: '' });

  const [fechaABloquear, setFechaABloquear] = useState(new Date());
  const [diasBloqueados, setDiasBloqueados] = useState([]);

  useEffect(() => {
    const unsubR = onSnapshot(query(collection(db, "reservas"), orderBy("fechaRegistro", "desc")), (snap) => {
      setReservas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setCargando(false);
    });
    const unsubS = onSnapshot(collection(db, "servicios"), (snap) => {
      setServicios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubB = onSnapshot(collection(db, "bloqueos"), (snap) => {
      setDiasBloqueados(snap.docs.map(d => ({ id: d.id, fecha: d.data().fecha })));
    });
    return () => { unsubR(); unsubS(); unsubB(); };
  }, []);

  const stats = reservas.reduce((acc, res) => {
    acc.total++;
    if (res.estado === 'confirmado') acc.confirmados++;
    if (res.estado === 'cotizado') acc.cotizados++;
    return acc;
  }, { total: 0, confirmados: 0, cotizados: 0 });

  const reservasFiltradas = reservas.filter(res => res.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  const bloquearDia = async () => {
    const fechaString = fechaABloquear.toISOString().split('T')[0];
    if (diasBloqueados.some(d => d.fecha === fechaString)) return alert("Fecha ya cerrada.");
    await addDoc(collection(db, "bloqueos"), { fecha: fechaString });
  };

  const actualizarEstado = async (id, estado) => await updateDoc(doc(db, "reservas", id), { estado });

  const enviarEmailManual = (res) => {
    const linkAceptar = `https://rosa-pastel-web.vercel.app/responder/aceptado/${res.id}`;
    const linkRechazar = `https://rosa-pastel-web.vercel.app/responder/rechazado/${res.id}`;

    const cuerpo = encodeURIComponent(
      `Hola ${res.nombre},\n\n` +
      `Adjuntamos la cotización formal correspondiente a tu evento. Quedamos atentos a tus comentarios,\n` +
      `Rosa Pastel.\n\n` +
      `=========================================\n` +
      `    ¿CÓMO RESPONDER A ESTA PROPUESTA?    \n` +
      `=========================================\n\n` +
      `Si revisaste el PDF y estás de acuerdo, presiona aquí para agendar automáticamente:\n` +
      `🔹 ACEPTAR Y AGENDAR:\n${linkAceptar}\n\n` +
      `Si por el contrario decides declinar la propuesta, presiona aquí:\n` +
      `🔸 RECHAZAR PROPUESTA:\n${linkRechazar}\n\n` +
      `-----------------------------------------\n` +
      `💬 ¿Necesitas hacer algún cambio o ajustar el presupuesto?\n` +
      `Puedes responder directamente a este correo o contactarnos por WhatsApp para que lo revisemos juntos y lo adaptemos a tus necesidades.`
    );

    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${res.email}&su=Cotización Rosa Pastel&body=${cuerpo}`, '_blank');
  };

  // --- FUNCIÓN AGREGADA PARA ABRIR WHATSAPP DIRECTO ---
  const abrirWhatsAppCliente = (res) => {
    let numLimpio = res.telefono ? res.telefono.replace(/\s+/g, '').replace('+', '') : '';
    if (!numLimpio.startsWith('56') && numLimpio.length > 0) {
      numLimpio = '56' + numLimpio;
    }

    const mensaje = encodeURIComponent(
      `Hola ${res.nombre}, te contacto desde Rosa Pastel Banquetería por la cotización de tu evento (${res.tipoEvento}) solicitado para el día ${formatearFecha(res.fecha)}.`
    );

    window.open(`https://wa.me/${numLimpio}?text=${mensaje}`, '_blank');
  };

  const generarPDFOficial = (res, valores) => {
    const docPDF = new jsPDF();
    const gold = [193, 165, 125];
    const img = new Image(); img.src = '/logo.png'; 

    img.onload = () => {
      docPDF.addImage(img, 'PNG', 160, 10, 30, 30);
      docPDF.setFont("times", "bold").setFontSize(22).setTextColor(...gold).text("COTIZACIÓN ROSA PASTEL", 20, 25);
      docPDF.setFontSize(9).setTextColor(80).text(`RUT: 77.492.107-9 | WhatsApp: +569 8983 5783`, 20, 32);
      
      docPDF.setFillColor(...gold).rect(20, 50, 170, 7, 'F');
      docPDF.setTextColor(255).setFont("helvetica", "bold").text("DATOS DEL CLIENTE", 25, 55);
      docPDF.setTextColor(0).setFontSize(10).setFont("helvetica", "normal");
      docPDF.text(`Nombre: ${res.nombre}`, 20, 65);
      docPDF.text(`Evento: ${res.tipoEvento} | Fecha: ${formatearFecha(res.fecha)}`, 20, 71);
      
      docPDF.text(`Dirección: ${valores.direccion || 'No especificada'}`, 20, 77); 

      docPDF.setFont("helvetica", "bold").text("EL SERVICIO INCLUYE:", 20, 89);
      docPDF.setFont("helvetica", "normal").setFontSize(9);
      const lineasMenu = docPDF.splitTextToSize(valores.menu || "Servicio estándar.", 160);
      docPDF.text(lineasMenu, 25, 95);

      const netoB = (Number(res.invitados) || 0) * (Number(valores.pPersona) || 0);
      const sub = netoB + (Number(valores.transporte) || 0) + (Number(valores.extras) || 0);
      const iva = Math.round(sub * 0.19); 
      const total = sub + iva;

      autoTable(docPDF, {
        startY: 100 + (lineasMenu.length * 5), 
        head: [['DESCRIPCIÓN', 'CANT.', 'UNITARIO', 'TOTAL']],
        body: [
          [`SERVICIO ${res.tipoEvento.toUpperCase()}`, res.invitados, `$${Number(valores.pPersona).toLocaleString('es-CL')}`, `$${netoB.toLocaleString('es-CL')}`],
          ['TRANSPORTE LOGÍSTICO', '1', `$${Number(valores.transporte).toLocaleString('es-CL')}`, `$${Number(valores.transporte).toLocaleString('es-CL')}`],
          ['CARGOS ADICIONALES', '1', `$${Number(valores.extras).toLocaleString('es-CL')}`, `$${Number(valores.extras).toLocaleString('es-CL')}`]
        ], headStyles: { fillColor: gold }
      });
      
      const finalY = docPDF.lastAutoTable.finalY + 10;
      docPDF.setFontSize(10).setTextColor(80);
      docPDF.text(`SUBTOTAL: $${sub.toLocaleString('es-CL')}`, 190, finalY, { align: 'right' });
      docPDF.text(`IVA (19%): $${iva.toLocaleString('es-CL')}`, 190, finalY + 6, { align: 'right' });
      
      docPDF.setFontSize(12).setTextColor(0).setFont("helvetica", "bold");
      docPDF.text(`TOTAL FINAL: $${total.toLocaleString('es-CL')}`, 190, finalY + 14, { align: 'right' });
      
      docPDF.setFontSize(7).setTextColor(150).setFont("helvetica", "normal");
      docPDF.text("Condiciones: Valores incluyen IVA. Para confirmar reserva se requiere abono del 50%.", 20, finalY + 24);
      docPDF.text("Cotización válida por 15 días desde su emisión.", 20, finalY + 28);

      docPDF.save(`Cotizacion_${res.nombre}.pdf`);
      actualizarEstado(res.id, 'cotizado'); setReservaParaCotizar(null);
    };
  };

  if (cargando) return <div className="min-h-screen flex items-center justify-center bg-[#fcf8f0]">Cargando...</div>;

  return (
    <div className="min-h-screen bg-[#fcf8f0] p-6 text-[#4a3f35]">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-serif text-[#c1a57d]">Panel Admin</h1>
          <button onClick={volver} className="text-xs font-bold uppercase text-[#c4b198] border-b border-[#c4b198]">Cerrar Sesión</button>
        </header>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-4 rounded-3xl border border-[#efe4d5] text-center shadow-sm">
            <p className="text-[10px] font-bold text-[#c4b198] uppercase">Recibidos</p><p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-white p-4 rounded-3xl border border-[#efe4d5] text-center shadow-sm">
            <p className="text-[10px] font-bold text-[#c4b198] uppercase">Cotizados</p><p className="text-2xl font-bold text-blue-400">{stats.cotizados}</p>
          </div>
          <div className="bg-white p-4 rounded-3xl border border-[#efe4d5] text-center border-b-4 border-b-green-400 shadow-sm">
            <p className="text-[10px] font-bold text-[#c4b198] uppercase">Confirmados</p><p className="text-2xl font-bold text-green-500">{stats.confirmados}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <input type="text" placeholder="🔍 Buscar cliente..." className="w-full p-4 bg-white rounded-2xl outline-none shadow-sm" onChange={(e) => setBusqueda(e.target.value)} />
            <div className="space-y-3">
              {reservasFiltradas.map((res) => (
                <div key={res.id} className="bg-white p-4 rounded-3xl flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
                  <div className="flex-1">
                    <h2 className="text-lg font-bold">{res.nombre} <span className="text-[8px] bg-gray-100 px-2 rounded-full uppercase">{res.estado}</span></h2>
                    
                    {/* INFO EXTRA Y HORA AGREGADOS AQUÍ */}
                    <p className="text-[10px] text-[#c4b198] font-bold uppercase">
                      {formatearFecha(res.fecha)} a las {res.hora || '--:--'} hrs • {res.invitados} pers • {res.tipoEvento}
                    </p>
                    <p className="text-[10px] text-[#4a3f35]/60 mt-1">
                      📍 {res.direccion} | ✉ {res.email} | 📞 {res.telefono}
                    </p>

                  </div>
                  <div className="flex flex-wrap md:flex-nowrap gap-2">
                    
                    {/* BOTÓN DE WHATSAPP AGREGADO AQUÍ */}
                    <button onClick={() => abrirWhatsAppCliente(res)} className="bg-green-50 text-green-600 px-3 py-2 rounded-xl text-[9px] font-bold uppercase hover:bg-green-600 hover:text-white transition-colors">
                      💬 WhatsApp
                    </button>

                    <button onClick={() => {
                      setReservaParaCotizar(res); 
                      setPrecios({
                        ...precios, 
                        menu: res.detalles || '', 
                        direccion: res.direccion || '' 
                      })
                    }} className="bg-[#fcf8f0] text-[#c1a57d] px-3 py-2 rounded-xl text-[9px] font-bold uppercase hover:bg-[#c1a57d] hover:text-white transition-colors">1. Cotizar</button>
                    {res.estado === 'cotizado' && <button onClick={() => enviarEmailManual(res)} className="bg-blue-50 text-blue-600 px-3 py-2 rounded-xl text-[9px] font-bold uppercase">2. Gmail</button>}
                    {res.estado === 'cotizado' && <button onClick={() => actualizarEstado(res.id, 'confirmado')} className="bg-green-500 text-white px-3 py-2 rounded-xl text-[9px] font-bold uppercase">3. Aceptar</button>}
                    <button onClick={async () => { if(window.confirm("¿Eliminar?")) await deleteDoc(doc(db, "reservas", res.id)); }} className="p-2 text-red-200 hover:text-red-500">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-[2.5rem] p-6 shadow-sm">
              <h3 className="text-xl font-serif text-[#c1a57d] mb-4 text-center">Cerrar Agenda</h3>
              <Calendar onChange={setFechaABloquear} value={fechaABloquear} minDate={new Date()} className="rounded-xl border-none p-2 mb-4 bg-[#fcf8f0]" />
              <button onClick={bloquearDia} className="w-full py-3 bg-red-400 text-white rounded-xl font-bold text-[10px] uppercase">Cerrar esta fecha</button>
              <div className="mt-4 flex flex-wrap gap-2">
                {diasBloqueados.map(d => (
                  <div key={d.id} className="bg-red-50 text-red-500 px-2 py-1 rounded-full text-[9px] font-bold flex gap-2">{formatearFecha(d.fecha)} <button onClick={() => deleteDoc(doc(db,"bloqueos",d.id))}>✕</button></div>
                ))}
              </div>
            </div>
            
            <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-[#c1a57d]/20">
              <h3 className="text-xl font-serif text-[#c1a57d] mb-2">Carta de Servicios</h3>
              <p className="text-[9px] text-[#c4b198] mb-4 uppercase">Pincha un servicio para editar su menú</p>
              
              <div className="flex gap-2 mb-4">
                <input value={nuevoSrv} onChange={(e)=>setNuevoSrv(e.target.value)} placeholder="Ej: Coffee Break" className="flex-1 p-2 bg-[#fcf8f0] rounded-lg text-xs outline-none" />
                <button onClick={async () => { 
                  if(nuevoSrv) { 
                    await addDoc(collection(db, "servicios"), { 
                      nombre: nuevoSrv, 
                      items: [], 
                      img: '', 
                      desc: '',
                      minPersonas: 10,
                      permiteEleccion: false
                    }); 
                    setNuevoSrv(""); 
                  } 
                }} className="bg-[#c1a57d] text-white px-4 rounded-lg font-bold text-[10px]">Ok</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {servicios.map(s => (
                  <div key={s.id} className="bg-[#fcf8f0] px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-2 border border-[#efe4d5] cursor-pointer hover:bg-[#efe4d5] transition-colors">
                    <span onClick={() => setServicioEditando(s)}>{s.nombre}</span>
                    <button onClick={async (e) => { e.stopPropagation(); if(window.confirm("¿Eliminar servicio?")) await deleteDoc(doc(db,"servicios",s.id)); }} className="text-red-300 hover:text-red-500">✕</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: COTIZAR */}
      {reservaParaCotizar && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[3rem] p-8 max-w-lg w-full shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-2xl font-serif text-[#c1a57d] mb-4">Cotizar: {reservaParaCotizar.nombre}</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="Precio x Persona ($)" className="p-4 bg-[#fcf8f0] rounded-2xl outline-none" onChange={(e)=>setPrecios({...precios, pPersona: e.target.value})} />
                <input type="number" placeholder="Transporte ($)" className="p-4 bg-[#fcf8f0] rounded-2xl outline-none" onChange={(e)=>setPrecios({...precios, transporte: e.target.value})} />
              </div>
              
              <label className="text-[10px] font-bold text-[#c1a57d] uppercase ml-2">Dirección (Aparecerá en Datos del Cliente):</label>
              <input type="text" value={precios.direccion} className="w-full p-4 bg-[#fcf8f0] rounded-2xl outline-none text-sm" onChange={(e)=>setPrecios({...precios, direccion: e.target.value})} placeholder="Ej: Pasaje La Horqueta 551..."/>

              <label className="text-[10px] font-bold text-[#c1a57d] uppercase ml-2">Detalle para el PDF (Servicio incluye):</label>
              <textarea className="w-full p-4 bg-[#fcf8f0] rounded-2xl outline-none text-sm" rows="6" value={precios.menu} onChange={(e)=>setPrecios({...precios, menu: e.target.value})}></textarea>
              
              <input type="number" placeholder="Extras ($)" className="w-full p-4 bg-[#fcf8f0] rounded-2xl outline-none" onChange={(e)=>setPrecios({...precios, extras: e.target.value})} />
            </div>
            <div className="mt-8 flex gap-4">
              <button onClick={()=>setReservaParaCotizar(null)} className="flex-1 text-[10px] font-bold uppercase text-[#c4b198]">Cancelar</button>
              <button onClick={() => generarPDFOficial(reservaParaCotizar, precios)} className="flex-1 py-4 bg-[#c1a57d] text-white rounded-2xl font-bold text-[10px] uppercase shadow-lg">Descargar PDF</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EDITAR ÍTEMS DEL SERVICIO Y PORTADA */}
      {servicioEditando && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[3rem] p-8 max-w-sm w-full shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-xl font-serif text-[#c1a57d] mb-4">Editar: {servicioEditando.nombre}</h3>
            
            <div className="mb-6 space-y-3 p-4 bg-[#fcf8f0] rounded-2xl border border-[#efe4d5]">
              <div>
                <label className="text-[10px] text-[#c1a57d] font-bold uppercase mb-1 block">Nombre de la Foto (ej: boda.jpg)</label>
                <input id="inputImg" defaultValue={servicioEditando.img || ""} placeholder="boda.jpg" className="w-full p-2 bg-white rounded-lg text-xs outline-none border border-[#efe4d5]" />
              </div>
              <div>
                <label className="text-[10px] text-[#c1a57d] font-bold uppercase mb-1 block">Descripción para la tarjeta</label>
                <textarea id="inputDesc" rows="2" defaultValue={servicioEditando.desc || ""} placeholder="Breve descripción..." className="w-full p-2 bg-white rounded-lg text-xs outline-none border border-[#efe4d5]"></textarea>
              </div>

              <div className="flex gap-4 items-center bg-white p-3 rounded-lg border border-[#efe4d5]">
                <div className="flex-1">
                  <label className="text-[10px] text-[#c1a57d] font-bold uppercase mb-1 block">Mínimo Personas</label>
                  <input id="inputMinPersonas" type="number" min="1" defaultValue={servicioEditando.minPersonas || 10} className="w-full p-2 bg-[#fcf8f0] rounded-lg text-xs outline-none border border-[#efe4d5]" />
                </div>
                <div className="flex-1">
                  <label className="flex flex-col items-center gap-1 text-[9px] text-[#c1a57d] font-bold uppercase cursor-pointer mt-1">
                    <input id="inputMenuEleccion" type="checkbox" defaultChecked={servicioEditando.permiteEleccion || false} className="accent-[#c1a57d] w-4 h-4 cursor-pointer" />
                    <span className="text-center">¿Menú a Elección?</span>
                  </label>
                </div>
              </div>

              <button onClick={async () => {
                const imgVal = document.getElementById('inputImg').value;
                const descVal = document.getElementById('inputDesc').value;
                const minVal = Number(document.getElementById('inputMinPersonas').value);
                const eleccionVal = document.getElementById('inputMenuEleccion').checked;

                await updateDoc(doc(db, "servicios", servicioEditando.id), { 
                  img: imgVal, 
                  desc: descVal,
                  minPersonas: minVal,
                  permiteEleccion: eleccionVal
                });
                
                setServicioEditando({
                  ...servicioEditando, 
                  img: imgVal, 
                  desc: descVal,
                  minPersonas: minVal,
                  permiteEleccion: eleccionVal
                });
                alert("Configuración de presentación guardada");
              }} className="w-full bg-[#c1a57d] text-white py-2 rounded-lg font-bold text-[10px] uppercase shadow-sm hover:bg-[#a68d66]">Guardar Configuración</button>
            </div>

            <p className="text-[10px] text-[#c4b198] mb-2 uppercase font-bold">Ítems del Menú (Aparecerán según el switch)</p>
            <div className="space-y-2 mb-6 max-h-40 overflow-y-auto pr-2">
              {servicioEditando.items && servicioEditando.items.length > 0 ? (
                servicioEditando.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-[#fcf8f0] p-3 rounded-xl text-xs font-medium text-[#4a3f35] border border-[#efe4d5]">
                    <span>• {item}</span>
                    <button onClick={async () => {
                      const nuevosItems = servicioEditando.items.filter((_, i) => i !== idx);
                      await updateDoc(doc(db, "servicios", servicioEditando.id), { items: nuevosItems });
                      setServicioEditando({...servicioEditando, items: nuevosItems});
                    }} className="text-red-400 font-bold hover:text-red-600">✕</button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#c4b198] italic text-center py-4">Aún no hay ítems en este menú.</p>
              )}
            </div>

            <div className="flex gap-2 mb-6">
              <input value={nuevoItem} onChange={(e)=>setNuevoItem(e.target.value)} placeholder="Ej: Café de Grano" className="flex-1 p-3 bg-[#fcf8f0] rounded-xl outline-none text-xs border border-[#efe4d5]" />
              <button onClick={async () => {
                if(nuevoItem) {
                  const actuales = servicioEditando.items || [];
                  const actualizados = [...actuales, nuevoItem];
                  await updateDoc(doc(db, "servicios", servicioEditando.id), { items: actualizados });
                  setServicioEditando({...servicioEditando, items: actualizados});
                  setNuevoItem("");
                }
              }} className="bg-[#c1a57d] text-white px-5 rounded-xl font-bold text-[10px] uppercase">Añadir</button>
            </div>

            <button onClick={() => setServicioEditando(null)} className="w-full py-4 bg-[#fcf8f0] text-[#c1a57d] rounded-2xl font-bold text-[10px] uppercase tracking-widest border border-[#efe4d5] hover:bg-[#efe4d5] transition-colors">Cerrar Panel</button>
          </div>
        </div>
      )}

    </div>
  );
}

export default Admin;