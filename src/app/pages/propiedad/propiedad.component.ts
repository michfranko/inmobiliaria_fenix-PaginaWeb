import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PropertyService } from '../../services/property.service';
import { ContactService } from '../../services/contact.service';
import { Property } from '../../models/property';
import { Contact } from '../../models/contact';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

@Component({
  selector: 'app-propiedad',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './propiedad.component.html',
  styleUrls: ['./propiedad.component.css']
})
export class PropiedadComponent implements OnInit {
  propertyId: string = '';
  property: Property | null = null;
  contacts: Contact[] = [];
  nuevasImagenes: File[] = [];
  showContactForm = false;
  nuevoContacto: Contact = { nombres: '', apellidos: '', telefono: '', rol: 'propietario', propiedadesAsociadas: [] };
  
  /** Lógica de navegación por pasos del formulario */
  pasoActual: number = 1;
  totalPasos: number = 3;

  /** Opciones estandarizadas para el negocio */
  tiposPropiedad: string[] = ['Casa', 'Departamento', 'Terreno', 'Oficina', 'Local Comercial', 'Bodega', 'Suite'];
  estadosPropiedad: string[] = ['Disponible', 'En Venta', 'En Renta', 'Vendido', 'Rentado', 'Reservado'];
  ciudades: string[] = [];

  /** Estados de persistencia y carga */
  isSaving: boolean = false;
  saveProgress: number = 0;
  saveProgressMessage: string = '';

  /** Gestión de activos multimedia */
  imagenesExistentes: string[] = [];
  imagenesPreview: { file: File; preview: string }[] = [];
  draggedIndex: number | null = null;

  /** Variables para control de errores y roles */
  rolParaNuevoContacto: 'propietario' | 'responsable' = 'propietario';
  mostrarErrorValidacion: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private propertyService: PropertyService,
    private contactService: ContactService
  ) {}

  ngOnInit(): void {
    this.propertyId = this.route.snapshot.paramMap.get('id') || '';
    this.cargarContactos();
    this.cargarCiudades();
    
    if (this.propertyId) {
      this.cargarPropiedad(this.propertyId);
    } else {
      this.inicializarNuevaPropiedad();
    }
  }

  /** Carga la lista de ciudades desde Firebase */
  cargarCiudades() {
    this.propertyService.getCiudades().subscribe(list => {
      this.ciudades = list;
    });
  }

  /** Obtiene la lista global de contactos para vinculación */
  cargarContactos() {
    this.contactService.getContacts().subscribe(c => {
      this.contacts = c;
      this.validarVinculacionContactos();
    });
  }

  filtrarContactosPorRol(rol: string) {
    if (!this.property) return [];
    
    // Normalizamos los valores actuales para evitar problemas de tipos o espacios
    const encargadoActual = (this.property.Encargado || '').trim();
    const propietarioActual = (this.property.Propietario || '').trim();
    const codigoActual = rol === 'propietario' ? propietarioActual : encargadoActual;
    
    return this.contacts.filter(c => {
      const rolContacto = (c.rol || '').toLowerCase().trim();
      const rolBuscado = rol.toLowerCase().trim();
      
      // Mostrar si el rol coincide O si es el contacto que ya estaba seleccionado
      return rolContacto === rolBuscado || (codigoActual && c.codigo === codigoActual);
    });
  }

  /** 
   * Recupera una propiedad por ID y mapea sus atributos para asegurar
   * que el formulario cuente con todos los campos inicializados.
   */
  cargarPropiedad(id: string) {
    this.propertyService.getPropiedadPorId(id).subscribe(p => {
      if (p) {
        // Normalización para que los combos (select) reconozcan el valor exacto
        const tipoNormalizado = this.tiposPropiedad.find(t => t.toLowerCase() === p.TipoPropiedad?.toLowerCase()) || p.TipoPropiedad;
        const estadoNormalizado = this.estadosPropiedad.find(e => e.toLowerCase() === p.Estado?.toLowerCase()) || p.Estado;

        this.property = {
          ASC: p.ASC || 'No',
          Amoblado: p.Amoblado || 'No',
          AreaCons: p.AreaCons || '',
          AreaTerreno: p.AreaTerreno || '',
          BDG: p.BDG || 'No',
          BNO: p.BNO || '',
          COD: p.COD || '',
          CIUDAD: this.formatearTexto(p.CIUDAD || 'Cuenca'),
          Direccion_Sector: p.Direccion_Sector || '',
          Edif_Urb: p.Edif_Urb || '',
          Encargado: p.Encargado || '',
          Propietario: p.Propietario || '',
          Estado: estadoNormalizado,
          Extras: p.Extras || '',
          GRJ: p.GRJ || '',
          HAB: p.HAB || '',
          IPD: p.IPD || '',
          LVD: p.LVD || 'No',
          Piso: p.Piso || '',
          Precio_Venta: p.Precio_Venta || '',
          PROCOD: p.PROCOD || '',
          TipoPropiedad: tipoNormalizado,
          ImagenFolder: p.ImagenFolder || `imagenes_propiedades/${p.IPD}`,
          LinkMapa: p.LinkMapa || '',
          imagenes: p.imagenes || [],
          id: p.id
        };
        this.imagenesExistentes = this.property.imagenes || [];
        
        // Nueva validación: si el código guardado no existe en los contactos, lo reseteamos
        this.validarVinculacionContactos();
      }
    });
  }

  /**
   * Verifica que los códigos de contacto vinculados existan realmente.
   * Si no existen, los limpia para que el selector muestre la opción por defecto.
   */
  private validarVinculacionContactos() {
    if (!this.property || this.contacts.length === 0) return;

    if (this.property.Encargado) {
      const existe = this.contacts.some(c => c.codigo === this.property!.Encargado);
      if (!existe) {
        console.warn(`El encargado con código ${this.property.Encargado} no existe. Reseteando...`);
        this.property.Encargado = '';
      }
    }

    if (this.property.Propietario) {
      const existe = this.contacts.some(c => c.codigo === this.property!.Propietario);
      if (!existe) {
        console.warn(`El propietario con código ${this.property.Propietario} no existe. Reseteando...`);
        this.property.Propietario = '';
      }
    }
  }

  /** Define la estructura base de una propiedad nueva */
  async inicializarNuevaPropiedad() {
    const codigo = await this.generarCodigoIPD();
    this.property = {
      TipoPropiedad: '',
      IPD: codigo,
      Estado: 'Disponible',
      Direccion_Sector: '',
      CIUDAD: 'Cuenca',
      Precio_Venta: '',
      AreaTerreno: '',
      AreaCons: '',
      HAB: '',
      BNO: '',
      GRJ: '',
      Piso: '',
      Extras: '',
      Amoblado: 'No',
      Propietario: '',
      Encargado: '',
      ImagenFolder: `imagenes_propiedades/${codigo}`,
      LinkMapa: '',
      imagenes: [],
      ASC: 'No',
      BDG: 'No',
      COD: '',
      Edif_Urb: '',
      LVD: 'No',
      PROCOD: ''
    };
  }

  /** Genera un codigo incremental para nuevas propiedades */
  private async generarCodigoIPD(): Promise<string> {
    const codigos = await this.propertyService.obtenerTodosLosCodigosIPD();
    const codigosValidos = codigos
      .filter(c => /^av\d+$/i.test(c))
      .map(c => parseInt(c.slice(2)))
      .filter(n => !isNaN(n));
    const max = codigosValidos.length > 0 ? Math.max(...codigosValidos) : 0;
    return `av${max + 1}`;
  }

  /** Controladores de navegacion del formulario */
  siguientePaso() {
    if (this.esPasoValido() && this.pasoActual < this.totalPasos) {
      this.pasoActual++;
      this.mostrarErrorValidacion = false;
    } else {
      this.mostrarErrorValidacion = true;
    }
  }

  anteriorPaso() {
    if (this.pasoActual > 1) {
      this.pasoActual--;
      this.mostrarErrorValidacion = false;
    }
  }

  /** 
   * Validacion heuristica: impide el progreso si faltan campos marcados
   * como obligatorios segun el paso actual.
   */
  esPasoValido(): boolean {
    if (!this.property) return false;
    if (this.pasoActual === 1) {
      // Nueva lógica: Obligatorio Tipo, IPD, Estado Y (Propietario O Encargado)
      const tieneContacto = !!(this.property.Propietario || this.property.Encargado);
      return !!(this.property.TipoPropiedad && this.property.IPD && this.property.Estado && tieneContacto);
    }
    if (this.pasoActual === 2) {
      const basicos = !!(this.property.Direccion_Sector && this.property.Precio_Venta && this.property.CIUDAD && this.property.AreaTerreno);
      if (this.property.TipoPropiedad !== 'Terreno') {
        return basicos && !!this.property.AreaCons;
      }
      return basicos;
    }
    return true;
  }

  /** 
   * Ejecuta la persistencia de datos y la sincronizacion automatica
   * de roles de contactos involucrados.
   */
  async guardarCambios() {
    if (!this.property) return;
    
    if (!this.esPasoValido()) {
      this.mostrarErrorValidacion = true;
      return;
    }

    this.isSaving = true;
    this.saveProgress = 10;
    this.saveProgressMessage = 'Sincronizando datos...';

    /** Actualiza el rol del contacto basado en su vinculacion */
    const automatizarRoles = async () => {
      if (this.property?.Propietario) {
        const c = this.contacts.find(con => con.codigo === this.property?.Propietario);
        if (c && c.id) await this.contactService.updateContact(c.id, { rol: 'propietario' });
      }
      if (this.property?.Encargado) {
        const c = this.contacts.find(con => con.codigo === this.property?.Encargado);
        if (c && c.id) await this.contactService.updateContact(c.id, { rol: 'responsable' });
      }
    };

    try {
      if (!this.property.id) {
        const docId = await this.propertyService.crearPropiedad(this.property);
        this.property.id = docId;
      } else {
        await this.propertyService.actualizarPropiedad(this.propertyId, this.property);
      }

      await automatizarRoles();
      await this.subirNuevasImagenes();
      
      this.saveProgress = 100;
      this.saveProgressMessage = 'Operacion finalizada con exito';
      setTimeout(() => {
        this.isSaving = false;
        this.router.navigate(['/mantenimiento']);
      }, 800);
    } catch (error) {
      console.error(error);
      this.isSaving = false;
      alert('Error en la operacion de guardado');
    }
  }

  /** Procesa archivos seleccionados para vista previa */
  onImagenesSeleccionadas(event: any) {
    const archivos = Array.from(event.target.files) as File[];
    archivos.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagenesPreview.push({ file: file, preview: e.target.result });
      };
      reader.readAsDataURL(file);
    });
  }

  /** Sube imagenes a Firebase Storage y vincula las URLs al documento */
  async subirNuevasImagenes() {
    if (this.imagenesPreview.length === 0) return;
    const storage = getStorage();
    const urls: string[] = [...this.imagenesExistentes];

    for (const item of this.imagenesPreview) {
      const path = `${this.property!.ImagenFolder}/${Date.now()}_${item.file.name}`;
      const storageRef = ref(storage, path);
      const snapshot = await uploadBytes(storageRef, item.file);
      const url = await getDownloadURL(snapshot.ref);
      urls.push(url);
    }

    await this.propertyService.actualizarImagenesPropiedad(this.property!.id!, urls);
    this.property!.imagenes = urls;
    this.imagenesExistentes = urls;
    this.imagenesPreview = [];
  }

  /** Eliminacion fisica de imagen en Storage y actualizacion de base de datos */
  eliminarImagenExistente(index: number) {
    const url = this.imagenesExistentes[index];
    const storage = getStorage();
    const imageRef = ref(storage, url);
    deleteObject(imageRef).then(() => {
      this.imagenesExistentes.splice(index, 1);
      this.propertyService.actualizarImagenesPropiedad(this.property!.id!, this.imagenesExistentes);
    });
  }

  eliminarImagenPreview(index: number) {
    this.imagenesPreview.splice(index, 1);
  }

  /** Registro express de contactos desde el formulario de propiedad */
  abrirModalContacto(rol: 'propietario' | 'responsable' = 'propietario') {
    this.rolParaNuevoContacto = rol;
    this.showContactForm = true;
    this.nuevoContacto = { nombres: '', apellidos: '', telefono: '', rol: rol, propiedadesAsociadas: [] };
  }

  async guardarNuevoContacto() {
    if (!this.nuevoContacto.nombres || !this.nuevoContacto.apellidos || !this.nuevoContacto.telefono) {
      alert('Campos obligatorios incompletos');
      return;
    }

    try {
      // Forzamos el rol correcto antes de guardar
      this.nuevoContacto.rol = this.rolParaNuevoContacto;
      const docId = await this.contactService.createContact(this.nuevoContacto);
      
      this.contactService.getContacts().subscribe(list => {
        this.contacts = list;
        const nuevo = list.find(c => c.id === docId);
        if (nuevo && nuevo.codigo) {
          if (this.rolParaNuevoContacto === 'propietario') {
            this.property!.Propietario = nuevo.codigo;
          } else {
            this.property!.Encargado = nuevo.codigo;
          }
          // Forzar que Angular detecte el cambio de valor para el selector
          this.property = { ...this.property! }; 
        }
        this.showContactForm = false;
      });
    } catch (error) {
      console.error(error);
      alert('Fallo en el registro del contacto');
    }
  }

  cancelarNuevoContacto() { this.showContactForm = false; }
  cancelar() { this.router.navigate(['/mantenimiento']); }

  /** Logica de reordenamiento de galeria por arrastre */
  onDragStart(index: number, tipo: string) { this.draggedIndex = index; }
  onDragOver(event: Event) { event.preventDefault(); }
  onDrop(index: number, tipo: string) {
    if (this.draggedIndex === null || this.draggedIndex === index) return;
    const movedImage = this.imagenesExistentes.splice(this.draggedIndex, 1)[0];
    this.imagenesExistentes.splice(index, 0, movedImage);
    this.propertyService.actualizarImagenesPropiedad(this.property!.id!, this.imagenesExistentes);
    this.draggedIndex = null;
  }

  /** Formatea un texto: Primera letra Mayúscula, resto minúsculas */
  formatearTexto(texto: string): string {
    if (!texto) return '';
    return texto.trim().toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }

  /** Agrega una nueva ciudad a la base de datos */
  agregarCiudad() {
    const nuevaCiudad = prompt('Ingrese el nombre de la nueva ciudad:');
    if (nuevaCiudad) {
      const ciudadFormateada = this.formatearTexto(nuevaCiudad);
      this.propertyService.agregarCiudad(ciudadFormateada).then(() => {
        if (this.property) {
          this.property.CIUDAD = ciudadFormateada;
        }
      }).catch(err => console.error('Error al agregar ciudad:', err));
    }
  }
}
