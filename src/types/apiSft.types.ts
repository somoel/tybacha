export interface ApiSftBattery {
    idBateriaSft: number;
    nombre: string;
    descripcion: string | null;
    version: string;
}

export interface ApiSftTest {
    idPruebaSft: number;
    idBateriaSft: number;
    nombre: string;
    descripcion: string | null;
    unidadResultado: string | null;
    orden: number;
}

export interface ApiSftApplication {
    idAplicacionSft: number;
    idAdultoMayor: number;
    idBateriaSft: number;
    responsable: number | null;
    fechaAplicacion: string;
    estado: 'en_proceso' | 'finalizada' | 'anulada';
    observaciones: string | null;
    pesoKg: number | null;
    estaturaCm: number | null;
    imc: number | null;
}

export interface ApiSftApplicationDetail extends ApiSftApplication {
    resultados: {
        idResultadoSft: number;
        idPruebaSft: number;
        pruebaNombre: string | null;
        unidadResultado: string | null;
        orden: number | null;
        valorNumerico: number | null;
        valorTexto: string | null;
        clasificacion: string | null;
        observaciones: string | null;
    }[];
}

export interface ApiCreateSftApplicationInput {
    idBateriaSft?: number;
    fechaAplicacion?: string;
    observaciones?: string;
    pesoKg?: number;
    estaturaCm?: number;
    imc?: number;
    resultados: {
        idPruebaSft: number;
        valorNumerico?: number;
        valorTexto?: string;
        clasificacion?: string;
        observaciones?: string;
    }[];
}

export interface ApiCreateSftApplicationResponse {
    idAplicacionSft: number;
    idAdultoMayor: number;
    idBateriaSft: number;
    resultadosRegistrados: number;
}
