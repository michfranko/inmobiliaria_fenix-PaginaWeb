import { Injectable } from '@angular/core';
import { Property } from '../app/models/property';
import { Seguimiento } from '../app/models/seguimiento';
import { Cliente } from './models/cliente';
import { Contact } from './models/contact';

@Injectable({
  providedIn: 'root'
})
export class PdfService {

  constructor() {}

  /** 
   * Carga dinamica de librerias pesadas para mejorar el performance inicial (Lighthouse)
   */
  private async getLib() {
    const jsPDF = (await import('jspdf')).jsPDF;
    const autoTable = (await import('jspdf-autotable')).default;
    return { jsPDF, autoTable };
  }

  /**
   * Carga dinámica de XLSX para exportar a Excel
   */
  private async getXLSXLib() {
    try {
      // Importación dinámica estándar para mejor compatibilidad con Angular
      const XLSX: any = await import('xlsx');
      return XLSX;
    } catch (error) {
      console.error('Error al cargar la librería de Excel:', error);
      // Solo mostramos alerta si realmente falla tras la instalación
      alert('Hubo un problema al cargar el generador de Excel. Por favor, asegúrate de haber ejecutado: npm install xlsx');
      throw error;
    }
  }

  /** 
   * Limpia el texto de emojis y caracteres especiales que jsPDF no soporta en fuentes estándar.
   */
  private limpiarTexto(texto: string): string {
    if (!texto) return '';
    // Elimina emojis y caracteres fuera del rango latino básico/extendido
    return texto.replace(/[^\x00-\x7F\x80-\xFF]/g, ' ');
  }

  /** Genera archivo Excel de propiedades agrupado por categorías */
  async generarExcelListado(propiedades: Property[], tipoReporte: string) {
    let XLSX: any;
    try {
      XLSX = await this.getXLSXLib();
    } catch (e) {
      return; // El error ya se mostró en getXLSXLib
    }
    
    // 1. Agrupar propiedades por TipoPropiedad (Normalizado)
    const grupos: { [key: string]: any[] } = {};
    
    propiedades.forEach(p => {
      // Normalizamos: "Casa ", "casa", "CASA" -> "CASA"
      const cat = (p.TipoPropiedad || 'OTROS').toUpperCase().trim();
      if (!grupos[cat]) grupos[cat] = [];
      
      grupos[cat].push({
        'CÓDIGO IPD': p.IPD,
        'TIPO': cat,
        'ESTADO': p.Estado,
        'CIUDAD': p.CIUDAD,
        'SECTOR/DIRECCIÓN': p.Direccion_Sector,
        'PRECIO': p.Precio_Venta,
        'DORMITORIOS': p.HAB,
        'BAÑOS': p.BNO,
        'ÁREA CONST. (m²)': p.AreaCons,
        'ÁREA TERR. (m²)': p.AreaTerreno,
        'EXTRAS': p.Extras
      });
    });

    // 2. Crear un nuevo libro de Excel
    const wb = XLSX.utils.book_new();

    // 3. Crear una hoja para cada categoría (Asegurando nombres únicos y válidos)
    const categoriasProcesadas = new Set<string>();

    Object.keys(grupos).sort().forEach(categoria => {
      // Limpiar nombre de categoría para Excel (máx 31 caracteres, sin caracteres prohibidos)
      let nombreHoja = categoria.substring(0, 30).trim();
      
      // Si por el recorte el nombre queda vacío o ya existe, le añadimos un índice
      let finalName = nombreHoja || 'CATEGORIA';
      let counter = 1;
      while (categoriasProcesadas.has(finalName)) {
        finalName = `${nombreHoja.substring(0, 25)} (${counter})`;
        counter++;
      }
      
      const ws = XLSX.utils.json_to_sheet(grupos[categoria]);
      
      // Ajustar ancho de columnas básico
      const wscols = [
        {wch: 15}, {wch: 20}, {wch: 15}, {wch: 15}, {wch: 40}, 
        {wch: 15}, {wch: 12}, {wch: 10}, {wch: 15}, {wch: 15}, {wch: 50}
      ];
      ws['!cols'] = wscols;

      XLSX.utils.book_append_sheet(wb, ws, finalName);
      categoriasProcesadas.add(finalName);
    });

    // 4. Descargar el archivo
    XLSX.writeFile(wb, `Reporte_${tipoReporte}_Fenix_${new Date().toLocaleDateString()}.xlsx`);
  }
/** 
 * Convierte una URL de imagen a Base64 de forma segura para evitar problemas de CORS en el PDF.
 * Usa un elemento Image con atributo crossOrigin para asegurar la compatibilidad.
 */
private async getBase64ImageFromURL(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.setAttribute('crossOrigin', 'anonymous'); // Crucial para evitar errores de CORS
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No se pudo crear el contexto del canvas'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      try {
        const dataURL = canvas.toDataURL('image/jpeg', 0.8); // Comprimimos un poco para el PDF
        resolve(dataURL);
      } catch (e) {
        reject(e);
      }
    };
    
    img.onerror = (error) => {
      console.error('Error cargando imagen para Base64:', error);
      reject(new Error('No se pudo cargar la imagen desde la URL'));
    };
    
    // Añadimos un timestamp a la URL para evitar que el caché del navegador
    // devuelva una versión sin cabeceras CORS si la imagen se cargó antes en el sitio.
    img.src = url + (url.includes('?') ? '&' : '?') + 't=' + new Date().getTime();
  });
}

/** Genera reporte de proforma para una propiedad individual con diseño Premium */
async generateProforma(property: Property) {
  const { jsPDF } = await this.getLib();
  const doc = new jsPDF();
  const gold = '#FFBE2D';
  const dark = '#1a1a1a';

  // 1. Encabezado de Marca
  doc.setFillColor(dark);
  doc.rect(0, 0, 210, 40, 'F');

  doc.setTextColor(gold);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('INMOBILIARIA FENIX', 105, 20, { align: 'center' });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text('FICHA TÉCNICA DE PROPIEDAD', 105, 30, { align: 'center' });

  let currentY = 50;

  // 2. Imagen Principal (Hero) - Ahora procesada a Base64
  if (property.imagenes && property.imagenes.length > 0) {
    try {
      const imgUrl = property.imagenes[0];
      const base64Img = await this.getBase64ImageFromURL(imgUrl);
      // Determinamos el formato dinámicamente si es posible, por defecto JPEG
      doc.addImage(base64Img, 'JPEG', 20, currentY, 170, 100, undefined, 'FAST');
      currentY += 110;
    } catch (e) {
      console.error('No se pudo procesar la imagen para el PDF:', e);
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text('[ Imagen de propiedad no disponible ]', 105, currentY + 20, { align: 'center' });
      currentY += 40;
    }
  }

    // 3. Etiqueta de Precio (Destacada)
    doc.setFillColor(gold);
    doc.roundedRect(140, currentY - 15, 50, 15, 3, 3, 'F');
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`$${property.Precio_Venta}`, 165, currentY - 5, { align: 'center' });

    // 4. Título Principal (Limpio)
    doc.setTextColor(dark);
    doc.setFontSize(18);
    const titulo = this.limpiarTexto(`${property.TipoPropiedad} en ${property.CIUDAD}`);
    doc.text(titulo, 20, currentY);
    
    currentY += 10;
    doc.setDrawColor(gold);
    doc.setLineWidth(1);
    doc.line(20, currentY, 190, currentY);
    
    currentY += 15;

    // 5. Grilla de Especificaciones Rápidas
    const drawSpec = (label: string, value: any, x: number, y: number) => {
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.setFont('helvetica', 'normal');
      doc.text(String(label).toUpperCase(), x, y);
      doc.setFontSize(12);
      doc.setTextColor(dark);
      doc.setFont('helvetica', 'bold');
      // Convertimos explícitamente a string y limpiamos
      const textValue = this.limpiarTexto(String(value || '---'));
      doc.text(textValue, x, y + 7);
    };

    drawSpec('Código IPD', property.IPD, 20, currentY);
    drawSpec('Habitaciones', property.HAB, 70, currentY);
    drawSpec('Baños', property.BNO, 120, currentY);
    drawSpec('Construcción', `${property.AreaCons} m²`, 160, currentY);

    currentY += 25;

    // 6. Información Detallada (Limpia)
    doc.setFontSize(12);
    doc.setTextColor(dark);
    doc.setFont('helvetica', 'bold');
    doc.text('Ubicación y Sector:', 20, currentY);
    doc.setFont('helvetica', 'normal');
    const ubicacion = this.limpiarTexto(String(property.Direccion_Sector || 'No especificado'));
    doc.text(ubicacion, 20, currentY + 7);

    currentY += 20;

    if (property.Extras) {
      doc.setFont('helvetica', 'bold');
      doc.text('Características y Extras:', 20, currentY);
      doc.setFont('helvetica', 'normal');
      // Limpiamos y convertimos a string antes de procesar el tamaño
      const extrasLimpios = this.limpiarTexto(String(property.Extras));
      const splitExtras = doc.splitTextToSize(extrasLimpios, 170);
      doc.text(splitExtras, 20, currentY + 7);
      currentY += (splitExtras.length * 7) + 10;
    }

    // 7. Pie de Página (Footer)
    doc.setFillColor(dark);
    doc.rect(0, 277, 210, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text('fenix.ec.inmobiliaria@gmail.com | +593 99 868 3511', 105, 287, { align: 'center' });
    doc.setTextColor(gold);
    doc.text('www.inmobiliariafenix.com.ec', 105, 292, { align: 'center' });

    doc.save(`Proforma_${property.IPD}.pdf`);
  }

  /** Genera listado de propiedades filtradas (Ventas/Rentas) organizado por categorías */
  async generarListadoPropiedades(propiedades: Property[], tipo: string) {
    const { jsPDF, autoTable } = await this.getLib();
    const doc = new jsPDF();
    const gold = [255, 190, 45];
    
    // Encabezado principal
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text(`REPORTE DE ${tipo.toUpperCase()} - INMOBILIARIA FENIX`, 105, 15, { align: 'center' });
    
    // 1. Agrupar propiedades por TipoPropiedad
    const grupos: { [key: string]: Property[] } = {};
    propiedades.forEach(p => {
      const cat = p.TipoPropiedad || 'OTROS';
      if (!grupos[cat]) grupos[cat] = [];
      grupos[cat].push(p);
    });

    let currentY = 25;

    // 2. Crear una sección por cada categoría
    Object.keys(grupos).sort().forEach((categoria, index) => {
      // Verificar si hay espacio suficiente para el título y la tabla, si no, nueva página
      if (currentY > 240) {
        doc.addPage();
        currentY = 20;
      }

      // Título de la Categoría
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(categoria, 14, currentY);
      currentY += 5;

      const data = grupos[categoria].map(p => [
        p.IPD || '',
        p.CIUDAD || '',
        p.Direccion_Sector || '',
        `$${p.Precio_Venta}`
      ]);

      autoTable(doc, {
        head: [['ID', 'Ciudad', 'Ubicación/Sector', 'Precio']],
        body: data,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: gold, textColor: [0, 0, 0], fontStyle: 'bold' },
        margin: { left: 14, right: 14 },
        didDrawPage: (dataArg: any) => {
          currentY = dataArg.cursor ? dataArg.cursor.y : currentY;
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;
    });

    doc.save(`Listado_${tipo}_Categorizado.pdf`);
  }

  async generarReportePropietarios(propiedades: Property[], contactos: Contact[]) {
    const { jsPDF, autoTable } = await this.getLib();
    const doc = new jsPDF();
    const gold = [255, 190, 45];

    doc.setFontSize(18);
    doc.text('REPORTE DE PROPIETARIOS Y CARTERA', 105, 15, { align: 'center' });

    // 1. Agrupar y contar propiedades por propietario
    const carteraMap = new Map<string, number>();
    propiedades.forEach(p => {
      if (p.Propietario) {
        carteraMap.set(p.Propietario, (carteraMap.get(p.Propietario) || 0) + 1);
      }
    });

    // 2. Preparar los datos de la tabla basados en los contactos
    const data = contactos
      .filter(c => c.codigo && carteraMap.has(c.codigo)) // Solo mostrar los que tienen código y propiedades
      .map(c => [
        c.codigo!,
        `${c.nombres} ${c.apellidos}`,
        c.telefono || 'N/A', // NUEVA COLUMNA
        carteraMap.get(c.codigo!) || 0
      ]);

    // 3. Generar Tabla Simplificada
    autoTable(doc, {
      head: [['Código', 'Nombre del Propietario', 'Teléfono', 'Total Propiedades']], // CABECERA ACTUALIZADA
      body: data,
      startY: 25,
      theme: 'grid',
      headStyles: { fillColor: gold, textColor: [0, 0, 0], fontStyle: 'bold' },
      columnStyles: {
        3: { halign: 'center' } // Centrar la cantidad (ahora es el índice 3)
      }
    });

    doc.save('Cartera_Propietarios_Fenix.pdf');
  }

  async generarListadoSeguimientos(seguimientos: Seguimiento[], tipo: string, clientes: Cliente[]) {
    const { jsPDF, autoTable } = await this.getLib();
    const doc = new jsPDF();
    
    const data = seguimientos.map(s => {
      const cliente = clientes.find(c => c.id === s.clienteId);
      return [
        s.fecha || '',
        s.propiedadCodigoIPD || '',
        cliente ? cliente.nombre : 'Desconocido',
        s.estado || '',
        s.observaciones || ''
      ];
    });

    autoTable(doc, {
      head: [['Fecha', 'Inmueble', 'Cliente', 'Estado', 'Observaciones']],
      body: data,
      theme: 'striped',
      headStyles: { fillColor: [0, 0, 0], textColor: [255, 190, 45] }
    });

    doc.save(`Seguimiento_${tipo}_Fenix.pdf`);
  }
}
