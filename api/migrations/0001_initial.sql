-- Tybachá - Migración inicial: esquema completo TiDB
-- Aplicar primero: este archivo es la base sobre la que se apilan las migraciones siguientes.

-- ============================================================
-- 1. Migraciones / control de schema
-- ============================================================

create table if not exists migracion
(
    id_migracion bigint auto_increment
        primary key,
    nombre       varchar(180)                             not null,
    aplicada_en  datetime(3) default current_timestamp(3) not null,
    constraint uk_migracion_nombre
        unique (nombre)
);

create table if not exists migracion_aplicada
(
    id_migracion_aplicada bigint auto_increment
        primary key,
    archivo               varchar(180)                             not null,
    aplicado_en           datetime(3) default current_timestamp(3) not null,
    constraint uk_migracion_archivo
        unique (archivo)
);

-- ============================================================
-- 2. Permisos y roles
-- ============================================================

create table if not exists permiso
(
    id_permiso  bigint auto_increment
        primary key,
    codigo      varchar(120)                             not null,
    descripcion varchar(255)                             not null,
    modulo      varchar(80)                              not null,
    creado_en   datetime(3) default current_timestamp(3) not null,
    constraint uk_permiso_codigo
        unique (codigo)
);

create index idx_permiso_modulo
    on permiso (modulo);

create table if not exists permiso_rol
(
    id_permiso_rol bigint auto_increment
        primary key,
    rol            enum ('administrador', 'profesional', 'cuidador') not null,
    id_permiso     bigint                                            not null,
    creado_en      datetime(3) default current_timestamp(3)          not null,
    constraint uk_permiso_rol
        unique (rol, id_permiso),
    constraint fk_permiso_rol_permiso
        foreign key (id_permiso) references permiso (id_permiso)
            on update cascade on delete cascade
);

create index idx_permiso_rol_permiso
    on permiso_rol (id_permiso);

-- ============================================================
-- 3. Usuarios
-- ============================================================

create table if not exists usuario
(
    id_usuario                bigint auto_increment
        primary key,
    correo                    varchar(255)                                                                       not null,
    contrasena_hash           varchar(255)                                                                       not null,
    rol                       enum ('administrador', 'profesional', 'cuidador')                                  not null,
    estado                    enum ('pendiente', 'activo', 'bloqueado', 'inactivo') default 'pendiente'          not null,
    correo_verificado         tinyint(1)                                            default 0                    not null,
    id_profesional_supervisor bigint                                                                             null,
    ultimo_acceso_en          datetime(3)                                                                        null,
    creado_en                 datetime(3)                                           default current_timestamp(3) not null,
    actualizado_en            datetime(3)                                           default current_timestamp(3) not null on update current_timestamp(3),
    constraint uk_usuario_correo
        unique (correo),
    constraint uk_usuario_id_rol
        unique (id_usuario, rol)
);

create index idx_usuario_creado_en
    on usuario (creado_en);

create index idx_usuario_profesional_supervisor
    on usuario (id_profesional_supervisor);

create index idx_usuario_rol_estado
    on usuario (rol, estado);

-- ============================================================
-- 4. Perfil de usuario
-- ============================================================

create table if not exists perfil_usuario
(
    id_perfil_usuario bigint auto_increment
        primary key,
    id_usuario        bigint                                               not null,
    nombres           varchar(120)                                         not null,
    apellidos         varchar(120)                                         not null,
    tipo_documento    varchar(30)                                          null,
    numero_documento  varchar(60)                                          null,
    telefono          varchar(40)                                          null,
    fecha_nacimiento  date                                                 null,
    genero            enum ('femenino', 'masculino', 'otro', 'no_informa') null,
    direccion         varchar(255)                                         null,
    ciudad            varchar(120)                                         null,
    creado_en         datetime(3) default current_timestamp(3)             not null,
    actualizado_en    datetime(3) default current_timestamp(3)             not null on update current_timestamp(3),
    constraint uk_perfil_usuario_documento
        unique (tipo_documento, numero_documento),
    constraint uk_perfil_usuario_id_usuario
        unique (id_usuario),
    constraint fk_perfil_usuario_usuario
        foreign key (id_usuario) references usuario (id_usuario)
            on update cascade on delete cascade
);

create index idx_perfil_usuario_nombre
    on perfil_usuario (apellidos, nombres);

-- ============================================================
-- 5. Sesiones y tokens
-- ============================================================

create table if not exists sesion_usuario
(
    id_sesion_usuario   bigint auto_increment
        primary key,
    id_usuario          bigint                                   not null,
    token_refresco_hash char(64)                                 not null,
    dispositivo         varchar(120)                             null,
    direccion_ip        varchar(45)                              null,
    agente_usuario      varchar(255)                             null,
    recordar_sesion     tinyint(1)  default 0                    not null,
    expira_en           datetime(3)                              not null,
    revocada_en         datetime(3)                              null,
    creado_en           datetime(3) default current_timestamp(3) not null,
    constraint uk_sesion_usuario_token
        unique (token_refresco_hash),
    constraint fk_sesion_usuario_usuario
        foreign key (id_usuario) references usuario (id_usuario)
            on update cascade on delete cascade
);

create index idx_sesion_usuario_usuario
    on sesion_usuario (id_usuario, expira_en);

create table if not exists token_push_dispositivo
(
    id_token_push_dispositivo bigint auto_increment
        primary key,
    id_usuario                bigint                                   not null,
    token_expo                varchar(255)                             not null,
    plataforma                enum ('android', 'web')                  not null,
    dispositivo               varchar(120)                             null,
    activo                    tinyint(1)  default 1                    not null,
    creado_en                 datetime(3) default current_timestamp(3) not null,
    actualizado_en            datetime(3) default current_timestamp(3) not null on update current_timestamp(3),
    constraint uk_token_push_expo
        unique (token_expo),
    constraint fk_token_push_usuario
        foreign key (id_usuario) references usuario (id_usuario)
            on update cascade on delete cascade
);

create index idx_token_push_usuario
    on token_push_dispositivo (id_usuario, activo);

create table if not exists dispositivo_push_usuario
(
    id_dispositivo_push_usuario bigint auto_increment
        primary key,
    id_usuario                  bigint                                                                     not null,
    expo_push_token             varchar(255)                                                               not null,
    plataforma                  enum ('android', 'web', 'ios', 'desconocida') default 'desconocida'        not null,
    dispositivo                 varchar(160)                                                               null,
    activo                      tinyint(1)                                    default 1                    not null,
    creado_en                   datetime(3)                                   default current_timestamp(3) not null,
    actualizado_en              datetime(3)                                   default current_timestamp(3) not null on update current_timestamp(3),
    constraint uk_dispositivo_push_token
        unique (expo_push_token),
    constraint fk_dispositivo_push_usuario
        foreign key (id_usuario) references usuario (id_usuario)
            on update cascade on delete cascade
);

-- ============================================================
-- 6. Adulto mayor
-- ============================================================

create table if not exists adulto_mayor
(
    id_adulto_mayor              bigint auto_increment
        primary key,
    id_local                     varchar(120)                                                                      null,
    nombres                      varchar(120)                                                                      not null,
    apellidos                    varchar(120)                                                                      not null,
    fecha_nacimiento             date                                                                              not null,
    genero                       enum ('femenino', 'masculino', 'otro', 'no_informa') default 'no_informa'         not null,
    tipo_documento               varchar(30)                                                                       null,
    numero_documento             varchar(60)                                                                       null,
    telefono                     varchar(40)                                                                       null,
    correo_contacto              varchar(255)                                                                      null,
    direccion                    varchar(255)                                                                      null,
    ciudad                       varchar(120)                                                                      null,
    nombre_contacto_emergencia   varchar(160)                                                                      null,
    telefono_contacto_emergencia varchar(40)                                                                       null,
    estado                       enum ('activo', 'inactivo')                          default 'activo'             not null,
    motivo_inactivacion          varchar(255)                                                                      null,
    inactivado_en                datetime(3)                                                                       null,
    version                      int unsigned                                         default '1'                  not null,
    id_profesional_responsable   bigint                                                                            null,
    creado_por                   bigint                                                                            null,
    actualizado_por              bigint                                                                            null,
    creado_en                    datetime(3)                                          default current_timestamp(3) not null,
    actualizado_en               datetime(3)                                          default current_timestamp(3) not null on update current_timestamp(3),
    constraint uk_adulto_mayor_documento
        unique (tipo_documento, numero_documento),
    constraint uk_adulto_mayor_id_local
        unique (id_local),
    constraint fk_adulto_mayor_actualizado_por
        foreign key (actualizado_por) references usuario (id_usuario)
            on update cascade on delete set null,
    constraint fk_adulto_mayor_creado_por
        foreign key (creado_por) references usuario (id_usuario)
            on update cascade on delete set null,
    constraint fk_adulto_mayor_profesional_responsable
        foreign key (id_profesional_responsable) references usuario (id_usuario)
            on update cascade on delete set null
);

create index idx_adulto_mayor_actualizado_por
    on adulto_mayor (actualizado_por);

create index idx_adulto_mayor_creado_por
    on adulto_mayor (creado_por);

create index idx_adulto_mayor_estado_nombre
    on adulto_mayor (estado, apellidos, nombres);

create index idx_adulto_mayor_fecha_nacimiento
    on adulto_mayor (fecha_nacimiento);

create index idx_adulto_mayor_profesional
    on adulto_mayor (id_profesional_responsable);

-- ============================================================
-- 7. Asignación cuidador ↔ adulto mayor
-- ============================================================

create table if not exists asignacion_cuidador_adulto_mayor
(
    id_asignacion_cuidador_adulto_mayor bigint auto_increment
        primary key,
    id_adulto_mayor                     bigint                                                     not null,
    id_cuidador                         bigint                                                     not null,
    asignado_por                        bigint                                                     null,
    estado                              enum ('activa', 'finalizada') default 'activa'             not null,
    fecha_inicio                        date                                                       not null,
    fecha_fin                           date                                                       null,
    motivo_finalizacion                 varchar(255)                                               null,
    creado_en                           datetime(3)                   default current_timestamp(3) not null,
    actualizado_en                      datetime(3)                   default current_timestamp(3) not null on update current_timestamp(3),
    constraint fk_asignacion_adulto_mayor
        foreign key (id_adulto_mayor) references adulto_mayor (id_adulto_mayor)
            on update cascade on delete cascade,
    constraint fk_asignacion_asignado_por
        foreign key (asignado_por) references usuario (id_usuario)
            on update cascade on delete set null,
    constraint fk_asignacion_cuidador
        foreign key (id_cuidador) references usuario (id_usuario)
            on update cascade
);

create index idx_asignacion_adulto_estado
    on asignacion_cuidador_adulto_mayor (id_adulto_mayor, estado);

create index idx_asignacion_asignado_por
    on asignacion_cuidador_adulto_mayor (asignado_por);

create index idx_asignacion_cuidador_estado
    on asignacion_cuidador_adulto_mayor (id_cuidador, estado);

-- ============================================================
-- 8. Relación profesional ↔ cuidador
--    Un profesional puede tener muchos cuidadores, pero un
--    cuidador solo puede tener una asignación activa.
-- ============================================================

create table if not exists profesional_cuidador
(
    id_profesional_cuidador bigint auto_increment
        primary key,
    id_profesional          bigint                                                    not null,
    id_cuidador             bigint                                                    not null,
    asignado_por            bigint                                                    null,
    estado                  enum ('activa', 'finalizada') not null default 'activa',
    fecha_inicio            date                                                      not null,
    fecha_fin               date                                                      null,
    motivo_finalizacion     varchar(255)                                              null,
    id_cuidador_activo      bigint                                                    null,
    creado_en               datetime(3)                  default current_timestamp(3) not null,
    actualizado_en          datetime(3)                  default current_timestamp(3) not null on update current_timestamp(3),
    constraint uk_profesional_cuidador_activo
        unique (id_cuidador_activo),
    constraint fk_profesional_cuidador_profesional
        foreign key (id_profesional) references usuario (id_usuario)
            on update cascade on delete cascade,
    constraint fk_profesional_cuidador_cuidador
        foreign key (id_cuidador) references usuario (id_usuario)
            on update cascade on delete cascade,
    constraint fk_profesional_cuidador_asignado_por
        foreign key (asignado_por) references usuario (id_usuario)
            on update cascade on delete set null
);

create index idx_profesional_cuidador_profesional
    on profesional_cuidador (id_profesional, estado);

create index idx_profesional_cuidador_cuidador
    on profesional_cuidador (id_cuidador, estado);

-- ============================================================
-- 9. Auditorías
-- ============================================================

create table if not exists auditoria_acceso_dato
(
    id_auditoria_acceso_dato bigint auto_increment
        primary key,
    id_usuario               bigint                                                         null,
    id_adulto_mayor          bigint                                                         null,
    tipo_dato                enum ('personal', 'clinico', 'sft', 'plan', 'reporte', 'otro') not null,
    accion                   enum ('consultar', 'exportar', 'descargar', 'compartir')       not null,
    resultado                enum ('permitido', 'denegado')                                 not null,
    motivo                   varchar(255)                                                   null,
    direccion_ip             varchar(45)                                                    null,
    agente_usuario           varchar(255)                                                   null,
    creado_en                datetime(3) default current_timestamp(3)                       not null,
    constraint fk_auditoria_acceso_adulto_mayor
        foreign key (id_adulto_mayor) references adulto_mayor (id_adulto_mayor)
            on update cascade on delete set null,
    constraint fk_auditoria_acceso_usuario
        foreign key (id_usuario) references usuario (id_usuario)
            on update cascade on delete set null
);

create index idx_auditoria_acceso_adulto
    on auditoria_acceso_dato (id_adulto_mayor, creado_en);

create index idx_auditoria_acceso_usuario
    on auditoria_acceso_dato (id_usuario, creado_en);

create table if not exists auditoria_autenticacion
(
    id_auditoria_autenticacion bigint auto_increment
        primary key,
    id_usuario                 bigint                                                       null,
    correo                     varchar(255)                                                 not null,
    accion                     enum ('login_exitoso', 'login_fallido', 'refresh', 'logout') not null,
    resultado                  enum ('exitoso', 'fallido')                                  not null,
    motivo                     varchar(255)                                                 null,
    direccion_ip               varchar(45)                                                  null,
    agente_usuario             varchar(255)                                                 null,
    creado_en                  datetime(3) default current_timestamp(3)                     not null,
    constraint fk_auditoria_autenticacion_usuario
        foreign key (id_usuario) references usuario (id_usuario)
            on update cascade on delete set null
);

create table if not exists auditoria_cambio
(
    id_auditoria_cambio  bigint auto_increment
        primary key,
    tabla_afectada       varchar(120)                                                       not null,
    id_registro_afectado bigint                                                             not null,
    accion               enum ('crear', 'actualizar', 'inactivar', 'reactivar', 'eliminar') not null,
    valores_anteriores   json                                                               null,
    valores_nuevos       json                                                               null,
    realizado_por        bigint                                                             null,
    direccion_ip         varchar(45)                                                        null,
    agente_usuario       varchar(255)                                                       null,
    creado_en            datetime(3) default current_timestamp(3)                           not null,
    constraint fk_auditoria_cambio_usuario
        foreign key (realizado_por) references usuario (id_usuario)
            on update cascade on delete set null
);

create index idx_auditoria_realizado_por
    on auditoria_cambio (realizado_por, creado_en);

create index idx_auditoria_tabla_registro
    on auditoria_cambio (tabla_afectada, id_registro_afectado, creado_en);

-- ============================================================
-- 9. SFT: batería, pruebas, aplicaciones, resultados
-- ============================================================

create table if not exists bateria_sft
(
    id_bateria_sft bigint auto_increment
        primary key,
    nombre         varchar(160)                                                         not null,
    descripcion    text                                                                 null,
    version        varchar(40)                             default '1.0'                not null,
    estado         enum ('borrador', 'activa', 'inactiva') default 'activa'             not null,
    creada_por     bigint                                                               null,
    creado_en      datetime(3)                             default current_timestamp(3) not null,
    actualizado_en datetime(3)                             default current_timestamp(3) not null on update current_timestamp(3),
    constraint uk_bateria_sft_nombre_version
        unique (nombre, version),
    constraint fk_bateria_sft_creada_por
        foreign key (creada_por) references usuario (id_usuario)
            on update cascade on delete set null
);

create index idx_bateria_sft_creada_por
    on bateria_sft (creada_por);

create index idx_bateria_sft_estado
    on bateria_sft (estado);

create table if not exists prueba_sft
(
    id_prueba_sft    bigint auto_increment
        primary key,
    id_bateria_sft   bigint                                   not null,
    nombre           varchar(160)                             not null,
    descripcion      text                                     null,
    unidad_resultado varchar(40)                              null,
    orden            smallint unsigned                        not null,
    puntaje_minimo   decimal(10, 2)                           null,
    puntaje_maximo   decimal(10, 2)                           null,
    activa           tinyint(1)  default 1                    not null,
    creado_en        datetime(3) default current_timestamp(3) not null,
    constraint uk_prueba_sft_orden
        unique (id_bateria_sft, orden),
    constraint fk_prueba_sft_bateria
        foreign key (id_bateria_sft) references bateria_sft (id_bateria_sft)
            on update cascade on delete cascade
);

create index idx_prueba_sft_bateria_activa
    on prueba_sft (id_bateria_sft, activa);

create table if not exists aplicacion_sft
(
    id_aplicacion_sft bigint auto_increment
        primary key,
    id_adulto_mayor   bigint                                                                    not null,
    id_bateria_sft    bigint                                                                    not null,
    responsable       bigint                                                                    null,
    fecha_aplicacion  datetime(3)                                                               not null,
    estado            enum ('en_proceso', 'finalizada', 'anulada') default 'finalizada'         not null,
    observaciones     text                                                                      null,
    creado_en         datetime(3)                                  default current_timestamp(3) not null,
    actualizado_en    datetime(3)                                  default current_timestamp(3) not null on update current_timestamp(3),
    constraint fk_aplicacion_sft_adulto_mayor
        foreign key (id_adulto_mayor) references adulto_mayor (id_adulto_mayor)
            on update cascade on delete cascade,
    constraint fk_aplicacion_sft_bateria
        foreign key (id_bateria_sft) references bateria_sft (id_bateria_sft)
            on update cascade,
    constraint fk_aplicacion_sft_responsable
        foreign key (responsable) references usuario (id_usuario)
            on update cascade on delete set null
);

create index idx_aplicacion_sft_adulto_fecha
    on aplicacion_sft (id_adulto_mayor, fecha_aplicacion);

create index idx_aplicacion_sft_bateria
    on aplicacion_sft (id_bateria_sft);

create index idx_aplicacion_sft_responsable
    on aplicacion_sft (responsable);

create table if not exists resultado_sft
(
    id_resultado_sft  bigint auto_increment
        primary key,
    id_aplicacion_sft bigint                                   not null,
    id_prueba_sft     bigint                                   not null,
    valor_numerico    decimal(12, 3)                           null,
    valor_texto       varchar(255)                             null,
    clasificacion     varchar(80)                              null,
    observaciones     text                                     null,
    creado_en         datetime(3) default current_timestamp(3) not null,
    constraint uk_resultado_sft_aplicacion_prueba
        unique (id_aplicacion_sft, id_prueba_sft),
    constraint fk_resultado_sft_aplicacion
        foreign key (id_aplicacion_sft) references aplicacion_sft (id_aplicacion_sft)
            on update cascade on delete cascade,
    constraint fk_resultado_sft_prueba
        foreign key (id_prueba_sft) references prueba_sft (id_prueba_sft)
            on update cascade
);

create index idx_resultado_sft_prueba
    on resultado_sft (id_prueba_sft);

-- ============================================================
-- 10. Consentimiento, patología, medicamento, notas, contactos, foto
-- ============================================================

create table if not exists consentimiento_adulto_mayor
(
    id_consentimiento_adulto_mayor bigint auto_increment
        primary key,
    id_adulto_mayor                bigint                                                                                        not null,
    tipo_consentimiento            enum ('tratamiento_datos', 'evaluacion_funcional', 'plan_ejercicio', 'investigacion', 'otro') not null,
    estado                         enum ('vigente', 'revocado', 'vencido', 'pendiente') default 'pendiente'                      not null,
    otorgado_por_nombre            varchar(160)                                                                                  null,
    otorgado_por_documento         varchar(60)                                                                                   null,
    fecha_otorgamiento             date                                                                                          null,
    fecha_vencimiento              date                                                                                          null,
    observaciones                  text                                                                                          null,
    registrado_por                 bigint                                                                                        null,
    creado_en                      datetime(3)                                          default current_timestamp(3)             not null,
    actualizado_en                 datetime(3)                                          default current_timestamp(3)             not null on update current_timestamp(3),
    constraint fk_consentimiento_adulto_mayor
        foreign key (id_adulto_mayor) references adulto_mayor (id_adulto_mayor)
            on update cascade on delete cascade,
    constraint fk_consentimiento_registrado_por
        foreign key (registrado_por) references usuario (id_usuario)
            on update cascade on delete set null
);

create index idx_consentimiento_adulto_estado
    on consentimiento_adulto_mayor (id_adulto_mayor, tipo_consentimiento, estado);

create index idx_consentimiento_registrado_por
    on consentimiento_adulto_mayor (registrado_por);

create table if not exists contacto_adulto_mayor
(
    id_contacto_adulto_mayor bigint auto_increment
        primary key,
    id_adulto_mayor          bigint                                   not null,
    nombre                   varchar(160)                             not null,
    parentesco               varchar(80)                              null,
    telefono                 varchar(40)                              null,
    correo                   varchar(255)                             null,
    es_emergencia            tinyint(1)  default 0                    not null,
    creado_en                datetime(3) default current_timestamp(3) not null,
    constraint fk_contacto_adulto_mayor
        foreign key (id_adulto_mayor) references adulto_mayor (id_adulto_mayor)
            on update cascade on delete cascade
);

create index idx_contacto_adulto_mayor
    on contacto_adulto_mayor (id_adulto_mayor, es_emergencia);

create table if not exists foto_perfil_adulto_mayor
(
    id_adulto_mayor bigint                                   not null
        primary key,
    foto_binaria    mediumblob                               not null,
    tipo_mime       varchar(40)                              not null,
    tamano_bytes    int unsigned                             not null,
    ancho_pixeles   smallint unsigned                        null,
    alto_pixeles    smallint unsigned                        null,
    huella_sha256   char(64)                                 null,
    creada_por      bigint                                   null,
    creado_en       datetime(3) default current_timestamp(3) not null,
    actualizado_en  datetime(3) default current_timestamp(3) not null on update current_timestamp(3),
    constraint fk_foto_perfil_adulto_mayor
        foreign key (id_adulto_mayor) references adulto_mayor (id_adulto_mayor)
            on update cascade on delete cascade,
    constraint fk_foto_perfil_creada_por
        foreign key (creada_por) references usuario (id_usuario)
            on update cascade on delete set null
);

create index idx_foto_perfil_creada_por
    on foto_perfil_adulto_mayor (creada_por);

create table if not exists medicamento_adulto_mayor
(
    id_medicamento_adulto_mayor bigint auto_increment
        primary key,
    id_adulto_mayor             bigint                                                                                  not null,
    nombre                      varchar(160)                                                                            not null,
    dosis                       varchar(120)                                                                            null,
    frecuencia                  varchar(120)                                                                            null,
    via_administracion          varchar(80)                                                                             null,
    fecha_inicio                date                                                                                    null,
    fecha_fin                   date                                                                                    null,
    estado                      enum ('activo', 'suspendido', 'finalizado', 'desconocido') default 'activo'             not null,
    observaciones               text                                                                                    null,
    registrado_por              bigint                                                                                  null,
    creado_en                   datetime(3)                                                default current_timestamp(3) not null,
    actualizado_en              datetime(3)                                                default current_timestamp(3) not null on update current_timestamp(3),
    constraint fk_medicamento_adulto_mayor
        foreign key (id_adulto_mayor) references adulto_mayor (id_adulto_mayor)
            on update cascade on delete cascade,
    constraint fk_medicamento_registrado_por
        foreign key (registrado_por) references usuario (id_usuario)
            on update cascade on delete set null
);

create index idx_medicamento_adulto_estado
    on medicamento_adulto_mayor (id_adulto_mayor, estado);

create index idx_medicamento_registrado_por
    on medicamento_adulto_mayor (registrado_por);

create table if not exists nota_historial_medico
(
    id_nota_historial_medico bigint auto_increment
        primary key,
    id_adulto_mayor          bigint                                                                                            not null,
    tipo_nota                enum ('antecedente', 'alergia', 'limitacion', 'observacion', 'otro') default 'observacion'        not null,
    contenido                text                                                                                              not null,
    registrado_por           bigint                                                                                            null,
    creado_en                datetime(3)                                                          default current_timestamp(3) not null,
    constraint fk_nota_historial_adulto_mayor
        foreign key (id_adulto_mayor) references adulto_mayor (id_adulto_mayor)
            on update cascade on delete cascade,
    constraint fk_nota_historial_registrado_por
        foreign key (registrado_por) references usuario (id_usuario)
            on update cascade on delete set null
);

create index idx_nota_historial_adulto_tipo
    on nota_historial_medico (id_adulto_mayor, tipo_nota, creado_en);

create index idx_nota_historial_registrado_por
    on nota_historial_medico (registrado_por);

create table if not exists patologia_adulto_mayor
(
    id_patologia_adulto_mayor bigint auto_increment
        primary key,
    id_adulto_mayor           bigint                                                                             not null,
    nombre                    varchar(160)                                                                       not null,
    descripcion               text                                                                               null,
    fecha_diagnostico         date                                                                               null,
    estado                    enum ('activa', 'resuelta', 'cronica', 'desconocida') default 'activa'             not null,
    registrado_por            bigint                                                                             null,
    creado_en                 datetime(3)                                           default current_timestamp(3) not null,
    actualizado_en            datetime(3)                                           default current_timestamp(3) not null on update current_timestamp(3),
    constraint fk_patologia_adulto_mayor
        foreign key (id_adulto_mayor) references adulto_mayor (id_adulto_mayor)
            on update cascade on delete cascade,
    constraint fk_patologia_registrado_por
        foreign key (registrado_por) references usuario (id_usuario)
            on update cascade on delete set null
);

create index idx_patologia_adulto_estado
    on patologia_adulto_mayor (id_adulto_mayor, estado);

create index idx_patologia_registrado_por
    on patologia_adulto_mayor (registrado_por);

create table if not exists mensaje_usuario
(
    id_mensaje_usuario      bigint auto_increment
        primary key,
    id_usuario_remitente    bigint                                   null,
    id_usuario_destinatario bigint                                   not null,
    id_adulto_mayor         bigint                                   null,
    asunto                  varchar(180)                             null,
    contenido               text                                     not null,
    leido_en                datetime(3)                              null,
    creado_en               datetime(3) default current_timestamp(3) not null,
    constraint fk_mensaje_adulto_mayor
        foreign key (id_adulto_mayor) references adulto_mayor (id_adulto_mayor)
            on update cascade on delete set null,
    constraint fk_mensaje_destinatario
        foreign key (id_usuario_destinatario) references usuario (id_usuario)
            on update cascade on delete cascade,
    constraint fk_mensaje_remitente
        foreign key (id_usuario_remitente) references usuario (id_usuario)
            on update cascade on delete set null
);

create index idx_mensaje_adulto
    on mensaje_usuario (id_adulto_mayor, creado_en);

create index idx_mensaje_destinatario
    on mensaje_usuario (id_usuario_destinatario, leido_en, creado_en);

create index idx_mensaje_remitente
    on mensaje_usuario (id_usuario_remitente, creado_en);

-- ============================================================
-- 11. Plan de ejercicios
-- ============================================================

create table if not exists plan_ejercicio
(
    id_plan_ejercicio     bigint auto_increment
        primary key,
    id_adulto_mayor       bigint                                                                                                                             not null,
    titulo                varchar(160)                                                                                                                       not null,
    objetivo              text                                                                                                                               null,
    origen                enum ('manual', 'ia', 'mixto')                                                                        default 'manual'             not null,
    estado                enum ('borrador', 'generado', 'revisado', 'asignado', 'activo', 'pausado', 'finalizado', 'cancelado') default 'borrador'           not null,
    nivel_dificultad      enum ('bajo', 'medio', 'alto')                                                                        default 'bajo'               not null,
    fecha_inicio          date                                                                                                                               null,
    fecha_fin             date                                                                                                                               null,
    creado_por            bigint                                                                                                                             null,
    revisado_por          bigint                                                                                                                             null,
    asignado_por          bigint                                                                                                                             null,
    revisado_en           datetime(3)                                                                                                                        null,
    asignado_en           datetime(3)                                                                                                                        null,
    datos_personalizacion json                                                                                                                               null,
    creado_en             datetime(3)                                                                                           default current_timestamp(3) not null,
    actualizado_en        datetime(3)                                                                                           default current_timestamp(3) not null on update current_timestamp(3),
    constraint fk_plan_adulto_mayor
        foreign key (id_adulto_mayor) references adulto_mayor (id_adulto_mayor)
            on update cascade on delete cascade,
    constraint fk_plan_creado_por
        foreign key (creado_por) references usuario (id_usuario)
            on update cascade on delete set null,
    constraint fk_plan_revisado_por
        foreign key (revisado_por) references usuario (id_usuario)
            on update cascade on delete set null,
    constraint fk_plan_asignado_por
        foreign key (asignado_por) references usuario (id_usuario)
            on update cascade on delete set null
);

create index idx_plan_adulto_estado
    on plan_ejercicio (id_adulto_mayor, estado);

create index idx_plan_asignado_por
    on plan_ejercicio (asignado_por);

create index idx_plan_creado_por
    on plan_ejercicio (creado_por);

create index idx_plan_fecha_inicio
    on plan_ejercicio (fecha_inicio);

create index idx_plan_revisado_por
    on plan_ejercicio (revisado_por);

create table if not exists ejercicio
(
    id_ejercicio       bigint auto_increment
        primary key,
    nombre             varchar(160)                                                not null,
    descripcion        text                                                        null,
    categoria          varchar(100)                                                null,
    instrucciones      text                                                        null,
    contraindicaciones text                                                        null,
    nivel_base         enum ('bajo', 'medio', 'alto') default 'bajo'               not null,
    activo             tinyint(1)                     default 1                    not null,
    creado_por         bigint                                                      null,
    creado_en          datetime(3)                    default current_timestamp(3) not null,
    actualizado_en     datetime(3)                    default current_timestamp(3) not null on update current_timestamp(3),
    constraint fk_ejercicio_creado_por
        foreign key (creado_por) references usuario (id_usuario)
            on update cascade on delete set null
);

create index idx_ejercicio_categoria_activo
    on ejercicio (categoria, activo);

create index idx_ejercicio_creado_por
    on ejercicio (creado_por);

create table if not exists ejercicio_plan
(
    id_ejercicio_plan         bigint auto_increment
        primary key,
    id_plan_ejercicio         bigint                                                                          not null,
    id_ejercicio              bigint                                                                          null,
    nombre_personalizado      varchar(160)                                                                    null,
    descripcion_personalizada text                                                                            null,
    dia_semana                enum ('lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo') not null,
    orden                     smallint unsigned              default '1'                                      not null,
    series                    smallint unsigned                                                               null,
    repeticiones              smallint unsigned                                                               null,
    duracion_segundos         int unsigned                                                                    null,
    descanso_segundos         int unsigned                                                                    null,
    dificultad                enum ('bajo', 'medio', 'alto') default 'bajo'                                   not null,
    instrucciones             text                                                                            null,
    activo                    tinyint(1)                     default 1                                        not null,
    creado_en                 datetime(3)                    default current_timestamp(3)                     not null,
    actualizado_en            datetime(3)                    default current_timestamp(3)                     not null on update current_timestamp(3),
    constraint uk_ejercicio_plan_dia_orden
        unique (id_plan_ejercicio, dia_semana, orden),
    constraint fk_ejercicio_plan_ejercicio
        foreign key (id_ejercicio) references ejercicio (id_ejercicio)
            on update cascade on delete set null,
    constraint fk_ejercicio_plan_plan
        foreign key (id_plan_ejercicio) references plan_ejercicio (id_plan_ejercicio)
            on update cascade on delete cascade
);

create index idx_ejercicio_plan_activo
    on ejercicio_plan (id_plan_ejercicio, activo);

create index idx_ejercicio_plan_ejercicio
    on ejercicio_plan (id_ejercicio);

-- ============================================================
-- 12. Generación IA y cambios de estado del plan
-- ============================================================

create table if not exists generacion_ia_plan
(
    id_generacion_ia_plan bigint auto_increment
        primary key,
    id_plan_ejercicio     bigint                                                              not null,
    proveedor             varchar(80)                            default 'gemini'             not null,
    modelo                varchar(120)                                                        null,
    solicitud             json                                                                null,
    respuesta             json                                                                null,
    estado                enum ('exitosa', 'fallida', 'parcial') default 'exitosa'            not null,
    mensaje_error         text                                                                null,
    creado_por            bigint                                                              null,
    creado_en             datetime(3)                            default current_timestamp(3) not null,
    constraint fk_generacion_ia_plan
        foreign key (id_plan_ejercicio) references plan_ejercicio (id_plan_ejercicio)
            on update cascade on delete cascade,
    constraint fk_generacion_ia_creado_por
        foreign key (creado_por) references usuario (id_usuario)
            on update cascade on delete set null
);

create index idx_generacion_ia_creado_por
    on generacion_ia_plan (creado_por);

create index idx_generacion_ia_plan
    on generacion_ia_plan (id_plan_ejercicio, creado_en);

create table if not exists cambio_estado_plan
(
    id_cambio_estado_plan bigint auto_increment
        primary key,
    id_plan_ejercicio     bigint                                                                                                not null,
    estado_anterior       enum ('borrador', 'generado', 'revisado', 'asignado', 'activo', 'pausado', 'finalizado', 'cancelado') null,
    estado_nuevo          enum ('borrador', 'generado', 'revisado', 'asignado', 'activo', 'pausado', 'finalizado', 'cancelado') not null,
    motivo                varchar(255)                                                                                          null,
    cambiado_por          bigint                                                                                                null,
    creado_en             datetime(3) default current_timestamp(3)                                                              not null,
    constraint fk_cambio_estado_plan
        foreign key (id_plan_ejercicio) references plan_ejercicio (id_plan_ejercicio)
            on update cascade on delete cascade,
    constraint fk_cambio_estado_cambiado_por
        foreign key (cambiado_por) references usuario (id_usuario)
            on update cascade on delete set null
);

create index idx_cambio_estado_cambiado_por
    on cambio_estado_plan (cambiado_por);

create index idx_cambio_estado_plan
    on cambio_estado_plan (id_plan_ejercicio, creado_en);

-- ============================================================
-- 13. Registro de actividad y ejercicios
-- ============================================================

create table if not exists registro_actividad_diaria
(
    id_registro_actividad_diaria bigint auto_increment
        primary key,
    id_adulto_mayor              bigint                                                                       not null,
    id_plan_ejercicio            bigint                                                                       null,
    id_local                     varchar(120)                                                                 null,
    fecha_actividad              date                                                                         not null,
    resumen                      text                                                                         null,
    nivel_energia                enum ('bajo', 'medio', 'alto', 'no_registrado') default 'no_registrado'      not null,
    observaciones                text                                                                         null,
    registrado_por               bigint                                                                       null,
    version                      int unsigned                                    default '1'                  not null,
    creado_en                    datetime(3)                                     default current_timestamp(3) not null,
    actualizado_en               datetime(3)                                     default current_timestamp(3) not null on update current_timestamp(3),
    constraint uk_actividad_adulto_fecha_plan
        unique (id_adulto_mayor, fecha_actividad, id_plan_ejercicio),
    constraint uk_actividad_id_local
        unique (id_local),
    constraint fk_actividad_adulto_mayor
        foreign key (id_adulto_mayor) references adulto_mayor (id_adulto_mayor)
            on update cascade on delete cascade,
    constraint fk_actividad_plan
        foreign key (id_plan_ejercicio) references plan_ejercicio (id_plan_ejercicio)
            on update cascade on delete set null,
    constraint fk_actividad_registrado_por
        foreign key (registrado_por) references usuario (id_usuario)
            on update cascade on delete set null
);

create index idx_actividad_plan
    on registro_actividad_diaria (id_plan_ejercicio, fecha_actividad);

create index idx_actividad_registrado_por
    on registro_actividad_diaria (registrado_por);

create table if not exists registro_ejercicio_plan
(
    id_registro_ejercicio_plan   bigint auto_increment
        primary key,
    id_ejercicio_plan            bigint                                                                              not null,
    id_adulto_mayor              bigint                                                                              not null,
    id_registro_actividad_diaria bigint                                                                              null,
    id_local                     varchar(120)                                                                        null,
    fecha_programada             date                                                                                not null,
    fecha_realizacion            datetime(3)                                                                         null,
    estado                       enum ('pendiente', 'completado', 'omitido', 'parcial') default 'pendiente'          not null,
    duracion_real_segundos       int unsigned                                                                        null,
    repeticiones_realizadas      smallint unsigned                                                                   null,
    esfuerzo_percibido           tinyint unsigned                                                                    null,
    dolor_reportado              tinyint unsigned                                                                    null,
    comentario                   text                                                                                null,
    registrado_por               bigint                                                                              null,
    version                      int unsigned                                           default '1'                  not null,
    creado_en                    datetime(3)                                            default current_timestamp(3) not null,
    actualizado_en               datetime(3)                                            default current_timestamp(3) not null on update current_timestamp(3),
    constraint uk_registro_ejercicio_fecha
        unique (id_ejercicio_plan, fecha_programada),
    constraint uk_registro_ejercicio_id_local
        unique (id_local),
    constraint fk_registro_ejercicio_actividad
        foreign key (id_registro_actividad_diaria) references registro_actividad_diaria (id_registro_actividad_diaria)
            on update cascade on delete set null,
    constraint fk_registro_ejercicio_adulto_mayor
        foreign key (id_adulto_mayor) references adulto_mayor (id_adulto_mayor)
            on update cascade on delete cascade,
    constraint fk_registro_ejercicio_plan
        foreign key (id_ejercicio_plan) references ejercicio_plan (id_ejercicio_plan)
            on update cascade on delete cascade,
    constraint fk_registro_ejercicio_registrado_por
        foreign key (registrado_por) references usuario (id_usuario)
            on update cascade on delete set null
);

create index idx_registro_ejercicio_actividad
    on registro_ejercicio_plan (id_registro_actividad_diaria);

create index idx_registro_ejercicio_adulto_fecha
    on registro_ejercicio_plan (id_adulto_mayor, fecha_programada);

create index idx_registro_ejercicio_estado
    on registro_ejercicio_plan (estado, fecha_programada);

create index idx_registro_ejercicio_registrado_por
    on registro_ejercicio_plan (registrado_por);

-- ============================================================
-- 14. Estadísticas de progreso
-- ============================================================

create table if not exists estadistica_progreso
(
    id_estadistica_progreso bigint auto_increment
        primary key,
    id_adulto_mayor         bigint                                     not null,
    id_plan_ejercicio       bigint                                     null,
    tipo_periodo            enum ('dia', 'semana', 'mes')              not null,
    fecha_inicio            date                                       not null,
    fecha_fin               date                                       not null,
    ejercicios_programados  int unsigned  default '0'                  not null,
    ejercicios_completados  int unsigned  default '0'                  not null,
    ejercicios_omitidos     int unsigned  default '0'                  not null,
    porcentaje_cumplimiento decimal(5, 2) default 0.00                 not null,
    datos_metricas          json                                       null,
    calculado_en            datetime(3)   default current_timestamp(3) not null,
    constraint uk_estadistica_periodo
        unique (id_adulto_mayor, id_plan_ejercicio, tipo_periodo, fecha_inicio, fecha_fin),
    constraint fk_estadistica_adulto_mayor
        foreign key (id_adulto_mayor) references adulto_mayor (id_adulto_mayor)
            on update cascade on delete cascade,
    constraint fk_estadistica_plan
        foreign key (id_plan_ejercicio) references plan_ejercicio (id_plan_ejercicio)
            on update cascade on delete set null
);

create index idx_estadistica_plan
    on estadistica_progreso (id_plan_ejercicio, fecha_inicio);

-- ============================================================
-- 15. Alertas y notificaciones
-- ============================================================

create table if not exists alerta_programada
(
    id_alerta_programada    bigint auto_increment
        primary key,
    id_adulto_mayor         bigint                                                                             null,
    id_plan_ejercicio       bigint                                                                             null,
    id_usuario_destinatario bigint                                                                             null,
    tipo_alerta             enum ('recordatorio_ejercicio', 'cumplimiento', 'progreso', 'sistema', 'otro')     not null,
    titulo                  varchar(160)                                                                       not null,
    mensaje                 text                                                                               not null,
    canal                   enum ('app', 'correo', 'sms', 'push')                 default 'app'                not null,
    fecha_programada        datetime(3)                                                                        null,
    regla_programacion      json                                                                               null,
    condicion_disparo       json                                                                               null,
    estado                  enum ('activa', 'pausada', 'finalizada', 'cancelada') default 'activa'             not null,
    creada_por              bigint                                                                             null,
    creado_en               datetime(3)                                           default current_timestamp(3) not null,
    actualizado_en          datetime(3)                                           default current_timestamp(3) not null on update current_timestamp(3),
    constraint fk_alerta_adulto_mayor
        foreign key (id_adulto_mayor) references adulto_mayor (id_adulto_mayor)
            on update cascade on delete cascade,
    constraint fk_alerta_plan
        foreign key (id_plan_ejercicio) references plan_ejercicio (id_plan_ejercicio)
            on update cascade on delete cascade,
    constraint fk_alerta_destinatario
        foreign key (id_usuario_destinatario) references usuario (id_usuario)
            on update cascade on delete cascade,
    constraint fk_alerta_creada_por
        foreign key (creada_por) references usuario (id_usuario)
            on update cascade on delete set null
);

create index idx_alerta_adulto_estado
    on alerta_programada (id_adulto_mayor, estado);

create index idx_alerta_creada_por
    on alerta_programada (creada_por);

create index idx_alerta_destinatario_estado
    on alerta_programada (id_usuario_destinatario, estado, fecha_programada);

create index idx_alerta_plan
    on alerta_programada (id_plan_ejercicio);

create table if not exists notificacion
(
    id_notificacion         bigint auto_increment
        primary key,
    id_alerta_programada    bigint                                                                                     null,
    id_usuario_destinatario bigint                                                                                     not null,
    id_adulto_mayor         bigint                                                                                     null,
    tipo_notificacion       enum ('recordatorio_ejercicio', 'cumplimiento', 'progreso', 'sistema', 'otro')             not null,
    titulo                  varchar(160)                                                                               not null,
    mensaje                 text                                                                                       not null,
    canal                   enum ('app', 'correo', 'sms', 'push')                         default 'app'                not null,
    estado                  enum ('pendiente', 'enviada', 'recibida', 'leida', 'fallida') default 'pendiente'          not null,
    enviada_en              datetime(3)                                                                                null,
    recibida_en             datetime(3)                                                                                null,
    leida_en                datetime(3)                                                                                null,
    error_envio             text                                                                                       null,
    creado_en               datetime(3)                                                   default current_timestamp(3) not null,
    constraint fk_notificacion_alerta
        foreign key (id_alerta_programada) references alerta_programada (id_alerta_programada)
            on update cascade on delete set null,
    constraint fk_notificacion_destinatario
        foreign key (id_usuario_destinatario) references usuario (id_usuario)
            on update cascade on delete cascade,
    constraint fk_notificacion_adulto_mayor
        foreign key (id_adulto_mayor) references adulto_mayor (id_adulto_mayor)
            on update cascade on delete set null
);

create index idx_notificacion_adulto
    on notificacion (id_adulto_mayor, creado_en);

create index idx_notificacion_alerta
    on notificacion (id_alerta_programada);

create index idx_notificacion_destinatario_estado
    on notificacion (id_usuario_destinatario, estado, creado_en);

-- ============================================================
-- 16. Reportes y archivos exportados
-- ============================================================

create table if not exists reporte_generado
(
    id_reporte_generado bigint auto_increment
        primary key,
    tipo_reporte        enum ('progreso', 'actividad', 'sft', 'cumplimiento', 'administrativo', 'otro') not null,
    titulo              varchar(180)                                                                    not null,
    filtros             json                                                                            null,
    resumen             json                                                                            null,
    formato             enum ('json', 'pdf', 'csv', 'xlsx') default 'json'                              not null,
    generado_por        bigint                                                                          null,
    creado_en           datetime(3)                         default current_timestamp(3)                not null,
    constraint fk_reporte_generado_por
        foreign key (generado_por) references usuario (id_usuario)
            on update cascade on delete set null
);

create index idx_reporte_generado_por
    on reporte_generado (generado_por);

create index idx_reporte_tipo_fecha
    on reporte_generado (tipo_reporte, creado_en);

create table if not exists archivo_exportado
(
    id_archivo_exportado bigint auto_increment
        primary key,
    id_reporte_generado  bigint                                   not null,
    nombre_archivo       varchar(180)                             not null,
    tipo_mime            varchar(80)                              not null,
    contenido_binario    mediumblob                               null,
    contenido_texto      mediumtext                               null,
    tamano_bytes         int unsigned                             null,
    huella_sha256        char(64)                                 null,
    creado_en            datetime(3) default current_timestamp(3) not null,
    constraint fk_archivo_reporte
        foreign key (id_reporte_generado) references reporte_generado (id_reporte_generado)
            on update cascade on delete cascade
);

create index idx_archivo_reporte
    on archivo_exportado (id_reporte_generado);

-- ============================================================
-- 17. Operación de sincronización offline
-- ============================================================

create table if not exists operacion_sincronizacion
(
    id_operacion_sincronizacion bigint auto_increment
        primary key,
    id_local                    char(36)                                    not null,
    id_usuario                  bigint                                      not null,
    entidad                     varchar(80)                                 not null,
    accion                      enum ('crear', 'actualizar')                not null,
    estado                      enum ('aplicada', 'conflicto', 'rechazada') not null,
    id_remoto                   bigint                                      null,
    detalle                     json                                        null,
    creado_en_local             datetime(3)                                 not null,
    procesado_en                datetime(3) default current_timestamp(3)    not null,
    constraint uk_operacion_local_usuario
        unique (id_local, id_usuario),
    constraint fk_operacion_sincronizacion_usuario
        foreign key (id_usuario) references usuario (id_usuario)
            on update cascade on delete cascade
);

create index idx_operacion_entidad_fecha
    on operacion_sincronizacion (entidad, procesado_en);
