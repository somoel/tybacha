export type ApiGender = 'femenino' | 'masculino';
export type ApiOlderAdultStatus = 'activo' | 'inactivo';

export interface ApiOlderAdult {
    idAdultoMayor: number;
    nombres: string;
    apellidos: string;
    fechaNacimiento: string;
    genero: ApiGender;
    tipoDocumento: string | null;
    numeroDocumento: string | null;
    telefono: string | null;
    correoContacto: string | null;
    direccion: string | null;
    ciudad: string | null;
    estado: ApiOlderAdultStatus;
    idProfesionalResponsable: number | null;
    hasPhoto: boolean;
    photoData?: string | null;
    cuidador: {
        idUsuario: number;
        nombres: string | null;
        apellidos: string | null;
    } | null;
}

export interface ApiCreateOlderAdultInput {
    nombres: string;
    apellidos: string;
    fechaNacimiento: string;
    genero?: ApiGender;
    tipoDocumento?: string;
    numeroDocumento?: string;
    telefono?: string;
    correoContacto?: string;
    direccion?: string;
    ciudad?: string;
    nombreContactoEmergencia?: string;
    telefonoContactoEmergencia?: string;
    idCuidador?: number;
}

export type ApiUpdateOlderAdultInput = Partial<ApiCreateOlderAdultInput> & {
    estado?: ApiOlderAdultStatus;
    motivoInactivacion?: string;
};

