const generarPDF = (res, valores) => {
    const docPDF = new jsPDF();
    const colorRosa = [219, 39, 119]; // Pink-600
    const grisOscuro = [60, 60, 60];

    // --- 1. ENCABEZADO ESTILO EXCEL ---
    docPDF.setFontSize(22);
    docPDF.setFont("times", "bold");
    docPDF.setTextColor(colorRosa[0], colorRosa[1], colorRosa[2]);
    docPDF.text("COTIZACIÓN", 20, 20);

    docPDF.setFontSize(16);
    docPDF.text("ROSA PASTEL", 20, 30);
    
    // Datos de la empresa (Lado izquierdo)
    docPDF.setFontSize(9);
    docPDF.setFont("helvetica", "normal");
    docPDF.setTextColor(grisOscuro[0], grisOscuro[1], grisOscuro[2]);
    docPDF.text("RUT: 77.492.107-9", 20, 36);
    docPDF.text("TEMUCO, CHILE", 20, 40);
    docPDF.text("Teléfonos: 56989835783 - 56933771839", 20, 44);
    docPDF.text("Email: rosapasteltco@gmail.com", 20, 48);
    docPDF.text("Instagram: @Rosapasteltco", 20, 52);

    // Recuadro de Número y Fecha (Lado derecho)
    docPDF.setDrawColor(colorRosa[0], colorRosa[1], colorRosa[2]);
    docPDF.rect(140, 15, 50, 25); 
    docPDF.setFont("helvetica", "bold");
    docPDF.text("NÚMERO", 145, 23);
    docPDF.text("FECHA", 145, 33);
    docPDF.setFont("helvetica", "normal");
    docPDF.text("00" + Math.floor(Math.random() * 100), 170, 23); // Número correlativo simple
    docPDF.text(new Date().toLocaleDateString('es-CL'), 165, 33);

    // --- 2. DATOS DEL CLIENTE ---
    docPDF.setFillColor(colorRosa[0], colorRosa[1], colorRosa[2]);
    docPDF.rect(20, 60, 170, 7, 'F');
    docPDF.setTextColor(255, 255, 255);
    docPDF.setFont("helvetica", "bold");
    docPDF.text("DATOS DEL CLIENTE", 25, 65);

    docPDF.setTextColor(0);
    docPDF.setFontSize(10);
    docPDF.setFont("helvetica", "normal");
    const cliY = 75;
    docPDF.text(`Nombre: ${res.nombre}`, 20, cliY);
    docPDF.text(`Dirección: ${res.direccion}`, 20, cliY + 6);
    docPDF.text(`Teléfono: ${res.telefono}`, 20, cliY + 12);
    docPDF.text(`E-mail: ${res.email || 'N/A'}`, 110, cliY);
    docPDF.text(`Tipo Evento: ${res.tipoEvento}`, 110, cliY + 6);
    docPDF.text(`Glosa: ${res.detalles || 'Servicio de banquetería personalizada.'}`, 20, cliY + 20);

    // --- 3. TABLA DE DESCRIPCIÓN (ESTILO EXCEL) ---
    const netoBanqueteria = res.invitados * valores.pPersona;
    const netoTransporte = Number(valores.transporte);
    const netoExtras = Number(valores.extras);
    const subtotalNeto = netoBanqueteria + netoTransporte + netoExtras;
    const iva = Math.round(subtotalNeto * 0.19);
    const totalFinal = subtotalNeto + iva;

    docPDF.autoTable({
      startY: 105,
      head: [['DESCRIPCIÓN', 'UNIDADES', 'VALOR UNIT.', 'TOTAL']],
      body: [
        [`SERVICIO DE ${res.tipoEvento.toUpperCase()}`, res.invitados, `$${Number(valores.pPersona).toLocaleString('es-CL')}`, `$${netoBanqueteria.toLocaleString('es-CL')}`],
        ['GASTOS DE LOGÍSTICA Y TRANSPORTE', '1', `$${netoTransporte.toLocaleString('es-CL')}`, `$${netoTransporte.toLocaleString('es-CL')}`],
        ['OTROS / SERVICIOS ADICIONALES', '1', `$${netoExtras.toLocaleString('es-CL')}`, `$${netoExtras.toLocaleString('es-CL')}`],
      ],
      headStyles: { fillColor: colorRosa, textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { halign: 'center' },
        2: { halign: 'right' },
        3: { halign: 'right' },
      }
    });

    // --- 4. TOTALES ---
    const finalY = docPDF.lastAutoTable.finalY + 10;
    docPDF.setFont("helvetica", "bold");
    
    docPDF.text("SUB-TOTAL NETO", 130, finalY);
    docPDF.text(`$${subtotalNeto.toLocaleString('es-CL')}`, 170, finalY, { align: "right" });

    docPDF.text("IVA % (19%)", 130, finalY + 7);
    docPDF.text(`$${iva.toLocaleString('es-CL')}`, 170, finalY + 7, { align: "right" });

    docPDF.setFontSize(14);
    docPDF.setTextColor(colorRosa[0], colorRosa[1], colorRosa[2]);
    docPDF.text("TOTAL COTIZACIÓN", 130, finalY + 16);
    docPDF.text(`$${totalFinal.toLocaleString('es-CL')}`, 170, finalY + 16, { align: "right" });

    // --- 5. NOTAS FINALES ---
    docPDF.setFontSize(8);
    docPDF.setTextColor(100);
    docPDF.setFont("helvetica", "italic");
    const notasY = finalY + 30;
    docPDF.text("INCLUYE: MANTELERÍA, FLORES NATURALES, DECORACIÓN Y VAJILLA SEGÚN DISPONIBILIDAD.", 20, notasY);
    docPDF.text("Válido hasta: 15 días desde la fecha de emisión.", 20, notasY + 5);
    docPDF.text("Para confirmar el servicio se requiere el abono del 50%.", 20, notasY + 10);

    // Descarga
    docPDF.save(`Cotizacion_${res.nombre}_RosaPastel.pdf`);
  };