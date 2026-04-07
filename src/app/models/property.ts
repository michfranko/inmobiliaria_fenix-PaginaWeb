export interface Property {
    id?: string;
    ASC: string;
    Amoblado: string;
    AreaCons: string;
    AreaTerreno: string;
    BDG: string;
    BNO: string;
    COD: string;
    CIUDAD: string;
    Direccion_Sector : string;
    Edif_Urb: string;
    Encargado: string; // Código del contacto responsable
    Propietario: string; // Código del contacto propietario
    Estado: string;
    Extras: string;
    GRJ: string;
    HAB: string;
    IPD: string;
    LVD: string;
    Piso: string;
    Precio_Venta: string;
    PROCOD: string;
    TipoPropiedad: string;
    ImagenFolder: string;
    LinkMapa?: string;
    imagenes?: string[];
    imagenActualIndex?: number; 
  }
  